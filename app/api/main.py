from fastapi import APIRouter

from app.api.routes import bylaws, energy, health, visits

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(visits.router)
api_router.include_router(energy.router)
api_router.include_router(bylaws.router)
