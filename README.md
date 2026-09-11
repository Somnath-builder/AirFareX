# AirFareX - Real-time Airfare Price Index for India

**AirFareX** is a sophisticated, full-stack data platform developed for **MoSPI Hackathon Problem Statement 26056**. It serves as an automated economic data platform designed to scrape, monitor, and analyze domestic airfare movements across major Indian corridors, ultimately supporting the augmentation of the Consumer Price Index (CPI).

## 📊 Overview

The platform provides government analysts and economic researchers with a comprehensive suite of tools to track aviation economics in real-time. 

### Key Features
- **Data Scraping Queue**: Automated Python background jobs to scrape Google Flights (SerpApi) and store time-series fare data into MongoDB Atlas.
- **Airfare Index Dashboard**: High-level KPI tracking (Current Index, Observation Counts, Live Fares).
- **Interactive Routes Map**: Visualizes price movements across critical domestic air corridors.
- **Airlines Breakdown**: Comparative analysis of pricing strategies across different domestic carriers.
- **Deep Navy Aesthetic**: A bespoke "Government Analytics + Aviation Tech" dark mode theme designed for prolonged, fatigue-free data analysis.

## 💻 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, Recharts, Lucide React
- **Backend**: Python, FastAPI, Uvicorn
- **Database**: MongoDB Atlas (Cloud)
- **Scraping**: SerpApi (Google Flights API)

---

## 🚀 How to Run the Project Locally

To run the full stack application, you need to start both the Python Backend and the React Frontend in two separate terminal windows.

### 1. Start the Backend (FastAPI)

The backend handles database queries, data aggregation, and serves the API endpoints.

1. Open a terminal and navigate to the backend directory:
   `ash
   cd AirFareX/backend
   `

2. Ensure your .env file is present in the ackend/ directory with your MongoDB Atlas and SerpApi keys:
   `env
   MONGODB_URI=your_mongodb_connection_string
   SERPAPI_KEY=your_serpapi_key
   `

3. Create and activate your Python virtual environment (if you haven't already):
   `ash
   # On Windows:
   python -m venv .venv
   .venv\Scripts\activate
   # On Mac/Linux:
   python3 -m venv .venv
   source .venv/bin/activate
   `

4. Install the required Python dependencies (Note: The requirements file is inside the inner Backend/ folder):
   `ash
   pip install -r Backend\requirements.txt
   `

5. Start the FastAPI server using Uvicorn:
   `ash
   python -m uvicorn Backend.main:app --reload
   `
   *The backend will now be running at http://127.0.0.1:8000*

### 2. Start the Frontend (React / Vite)

The frontend serves the interactive data dashboard and connects to the backend API.

1. Open a **second** terminal window and navigate to the frontend directory:
   `ash
   cd AirFareX/frontend
   `

2. Install the Node.js dependencies:
   `ash
   npm install
   `

3. Start the Vite development server:
   `ash
   npm run dev
   `

4. **View the App**: Open your browser and navigate to http://localhost:5173.

---

### 3. Automated Daily Data Pipeline

To collect fresh airfares, update observations, and recompute the price index in one command:

```bash
cd AirFareX/backend
source .venv/bin/activate

# Run complete pipeline (Queue -> SerpApi Scraper -> Price Index):
python run_daily_pipeline.py

# Optional: customize search count or skip steps
python run_daily_pipeline.py --max-searches 20
python run_daily_pipeline.py --skip-scrape    # Recompute index only
```

#### Automating with Cron (Nightly at 2:00 AM IST)
```bash
crontab -e
# Add the following line:
0 2 * * * /Users/nilankurlaskar/Desktop/AirFareX/backend/.venv/bin/python /Users/nilankurlaskar/Desktop/AirFareX/backend/run_daily_pipeline.py >> /Users/nilankurlaskar/Desktop/AirFareX/backend/daily_pipeline.log 2>&1
```

---

## 🏛️ Problem Statement Context
**MoSPI (Ministry of Statistics and Programme Implementation)**  
*Problem Statement 26056: Development of a Real-time Airfare Price Index for India.*

*Built with 💙 for India's economic intelligence infrastructure.*
