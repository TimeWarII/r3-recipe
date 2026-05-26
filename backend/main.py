from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import SessionLocal
from app.db.seed import seed
from app.models import (  # noqa: F401 – tell flake8 to ignore the line
    User, Recipe, StepType, PropertyDefinition,
    PropertyCondition, PropertyValidationRule,
    RecipeStep, StepPropertyValue,
)
from app.api.routers import auth, recipes, steps, step_types

app = FastAPI(title='Recipe Creation API', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(recipes.router)
app.include_router(steps.router)
app.include_router(step_types.router)


@app.on_event("startup")
def on_startup() -> None:
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}
