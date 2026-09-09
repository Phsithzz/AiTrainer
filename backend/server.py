import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes import exercise_route
from routes.auth_route import router as auth_router

load_dotenv()

app = FastAPI(title="Exercise Trainer API — Plan A")

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(exercise_route.router)
app.include_router(auth_router)
@app.get("/")
def root():
    return {"status": "ok", "plan": "A — server-side MediaPipe"}

@app.get("/health")
def health():
    return {"status": "healthy"}
