from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import exercise_route
from routes.auth_route import router as auth_router

app = FastAPI(title="Exercise Trainer API — Plan A")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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