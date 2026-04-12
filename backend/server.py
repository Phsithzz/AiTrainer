from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import exercise

app = FastAPI(title="Exercise Trainer API — Plan A")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(exercise.router)

@app.get("/")
def root():
    return {"status": "ok", "plan": "A — server-side MediaPipe"}

@app.get("/health")
def health():
    return {"status": "healthy"}