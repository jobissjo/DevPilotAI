from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.errors import ServiceError
from app.routes import analysis_job_routes, auth_routes, repository_routes, user_routes

app = FastAPI()


@app.exception_handler(ServiceError)
async def service_error_handler(request: Request, exc: ServiceError):
    headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
    return JSONResponse(
        status_code=exc.status_code, content={"detail": exc.detail}, headers=headers,
    )


@app.get("/")
async def index():
    return {"message": "Welcome to DevPilot AI application"}


app.include_router(auth_routes.router, prefix="/api/auth")
app.include_router(user_routes.router, prefix="/api/users")
app.include_router(repository_routes.router, prefix="/api/repositories")
app.include_router(analysis_job_routes.router, prefix="/api")
