from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_auth_config, get_cors_origins
from app.database import SessionLocal
from app.models import User
from app.routers import (
    accounts,
    agents,
    ai,
    analytics,
    assets,
    assumptions,
    auth,
    budgets,
    categories,
    category_groups,
    entries,
    goals,
)
from app.security import hash_password
from app.services.defaults import seed_default_category_groups


def _bootstrap_admin() -> None:
    """Creates the initial local admin user the first time the app runs with zero users."""
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return
        cfg = get_auth_config()
        email = cfg.get("initial_admin_email")
        password = cfg.get("initial_admin_password")
        if not email or not password:
            return
        user = User(email=email, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
        seed_default_category_groups(db, user.id)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _bootstrap_admin()
    yield


app = FastAPI(title="LifeOS API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(assets.router)
app.include_router(categories.router)
app.include_router(category_groups.router)
app.include_router(entries.router)
app.include_router(budgets.router)
app.include_router(goals.router)
app.include_router(assumptions.router)
app.include_router(analytics.router)
app.include_router(agents.router)
app.include_router(agents.insights_router)
app.include_router(ai.router)


@app.get("/health")
def health():
    return {"status": "ok"}
