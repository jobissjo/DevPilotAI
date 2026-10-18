from fastapi import FastAPI
from app.routes import auth_routes

app = FastAPI()

@app.get("/")
async def index():
    return {
        "message": "Welcome to DevPilot AI application"
    }

app.include_router(auth_routes.router, prefix='/api/auth')