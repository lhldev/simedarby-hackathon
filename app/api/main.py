from fastapi import APIRouter

from app.api.routes import bylaws, health, restaurants, visits

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(visits.router)
api_router.include_router(restaurants.router)
api_router.include_router(bylaws.router)
