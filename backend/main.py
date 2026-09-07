from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Biblioteca API")

# Configure CORS so the frontend can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Biblioteca API is running"}

@app.get("/api/health")
def health_check():
    # Print the database URL just to verify env vars are loaded in docker
    db_url = os.getenv("DATABASE_URL", "Not set")
    return {"status": "ok", "db_configured": db_url != "Not set"}

# Add your original Python API routes here
