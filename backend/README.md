# AirfareX Backend

Hey! Dump all your FastAPI code here. 

### Instructions:
1. Put `main.py`, `requirements.txt`, and your other Python files directly into this `/backend` folder.
2. The frontend expects you to run your server on `http://localhost:8000` (which is the Uvicorn default).
3. **Important:** Make sure you configure **CORS** in your `main.py` to allow requests from `http://localhost:5173` (the Vite frontend dev server). 

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Happy coding!
