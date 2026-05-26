from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, get_recipe_or_404
from app.schemas.auth import CurrentUser
from app.schemas.recipe import (
    RecipeCreateIn,
    RecipeDetailOut,
    RecipeListItemOut,
    RecipeUpdateIn,
    RecipeExportOut,
    RecipeImportIn,
)
from app.services import recipe_service
from app.services.validation import ValidationError

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("", response_model=list[RecipeListItemOut])
def list_recipes(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    return recipe_service.list_recipes(db)


@router.get("/{recipe_id}", response_model=RecipeDetailOut)
def get_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    recipe = recipe_service.get_recipe(db, recipe_id)
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found."
        )
    return recipe


@router.post("", response_model=RecipeDetailOut,
             status_code=status.HTTP_201_CREATED)
def create_recipe(
    payload: RecipeCreateIn,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        return recipe_service.create_recipe(db, current_user.id, payload)
    except ValidationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors,
        )


@router.put("/{recipe_id}", response_model=RecipeDetailOut)
def update_recipe(
    recipe_id: int,
    payload: RecipeUpdateIn,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    recipe = get_recipe_or_404(recipe_id, db)
    return recipe_service.update_recipe(db, recipe, payload)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    recipe = get_recipe_or_404(recipe_id, db)
    recipe_service.delete_recipe(db, recipe)


@router.get("/{recipe_id}/export", response_model=RecipeExportOut)
def export_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    result = recipe_service.export_recipe(db, recipe_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found."
        )
    return result


@router.post("/import", response_model=RecipeDetailOut,
             status_code=status.HTTP_201_CREATED)
def import_recipe(
    payload: RecipeImportIn,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        return recipe_service.import_recipe(db, current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except ValidationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors,
        )
