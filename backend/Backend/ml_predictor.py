import os
import pandas as pd
from datetime import datetime
from pymongo import MongoClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib
from dotenv import load_dotenv

# Load env variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URI)
db = client['AirFareX']
fare_collection = db['fare_observations']

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'fare_forecaster.joblib')

class FareForecaster:
    def __init__(self):
        self.model = None

    def load_data(self):
        print("Fetching data from MongoDB...")
        docs = list(fare_collection.find({"fare_amount": {"$type": "number", "$gt": 0}}))
        if not docs:
            raise ValueError("No valid data found in MongoDB")
            
        df = pd.DataFrame(docs)
        
        # Data Cleaning & Feature Engineering
        print("Engineering features...")
        
        # Convert to datetime
        df['travel_date'] = pd.to_datetime(df['travel_date'])
        
        # Handle collected_at which might be string or datetime
        df['collected_at'] = pd.to_datetime(df['collected_at'], errors='coerce', utc=True).dt.tz_localize(None)
        
        # Calculate days_to_departure
        df['days_to_departure'] = (df['travel_date'] - df['collected_at']).dt.days
        df['days_to_departure'] = df['days_to_departure'].fillna(0).clip(lower=0)
        
        # Route feature
        df['route'] = df['origin'] + "-" + df['destination']
        
        # Month & Day of Week
        df['month'] = df['travel_date'].dt.month
        df['day_of_week'] = df['travel_date'].dt.dayofweek
        
        # Keep relevant columns
        features = ['route', 'airline', 'days_to_departure', 'month', 'day_of_week']
        target = 'fare_amount'
        
        # Drop rows with missing values in features
        df = df.dropna(subset=features + [target])
        
        return df[features], df[target], df

    def train(self):
        X, y, df_raw = self.load_data()
        
        print(f"Training on {len(X)} observations...")
        
        # Create pipeline
        categorical_features = ['route', 'airline']
        numeric_features = ['days_to_departure', 'month', 'day_of_week']
        
        preprocessor = ColumnTransformer(
            transformers=[
                ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
            ],
            remainder='passthrough'
        )
        
        # RandomForest is robust to non-scaled numeric features
        self.model = Pipeline([
            ('preprocessor', preprocessor),
            ('regressor', RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1))
        ])
        
        # Time-based split (sort by collected_at)
        df_raw = df_raw.sort_values('collected_at')
        split_idx = int(len(X) * 0.8)
        
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        
        print("Fitting model...")
        self.model.fit(X_train, y_train)
        
        print("Evaluating model...")
        y_pred = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        print(f"Model MAE: Rs {mae:.2f}")
        
        # Baseline MAE (predicting median of train set)
        baseline_pred = [y_train.median()] * len(y_test)
        baseline_mae = mean_absolute_error(y_test, baseline_pred)
        print(f"Baseline (Global Median) MAE: Rs {baseline_mae:.2f}")
        
        # Baseline MAE (Route Median)
        route_medians = df_raw.iloc[:split_idx].groupby('route')['fare_amount'].median()
        route_baseline_preds = X_test['route'].map(route_medians).fillna(y_train.median())
        route_baseline_mae = mean_absolute_error(y_test, route_baseline_preds)
        print(f"Baseline (Route Median) MAE: Rs {route_baseline_mae:.2f}")
        
        print(f"Improvement over Route Baseline: {((route_baseline_mae - mae) / route_baseline_mae) * 100:.1f}%")
        
        # Save model
        joblib.dump(self.model, MODEL_PATH)
        print(f"Model saved to {MODEL_PATH}")
        
    def load_model(self):
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)
            return True
        return False
        
    def predict(self, df):
        if not self.model:
            if not self.load_model():
                raise Exception("Model not trained or not found")
        return self.model.predict(df)

if __name__ == "__main__":
    forecaster = FareForecaster()
    forecaster.train()
