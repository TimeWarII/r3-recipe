from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import (
        get_current_user, get_db, get_recipe_or_404, get_step_or_404
    )
from app.schemas.auth import CurrentUser
from app.schemas.recipe import (
    RecipeStepIn,
    RecipeStepOut,
    RecipeStepReorderItem,
)
from app.services import step_service
from app.services.validation import ValidationError

router = APIRouter(
    prefix="/recipes/{recipe_id}/steps",
    tags=["steps"],
)


@router.post(
        "", response_model=RecipeStepOut, status_code=status.HTTP_201_CREATED
    )
def add_step(
    recipe_id: int,
    payload: RecipeStepIn,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    recipe = get_recipe_or_404(recipe_id, db)
    next_order = max((s.order for s in recipe.steps), default=-1) + 1
    try:
        step = step_service.create_step(
                db, recipe.id, payload, order=next_order
            )
        db.commit()
        db.refresh(step)
        return step
    except ValidationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors,
        )


@router.put("/{step_id}", response_model=RecipeStepOut)
def edit_step(
    recipe_id: int,
    step_id: int,
    payload: RecipeStepIn,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    recipe = get_recipe_or_404(recipe_id, db)
    step = get_step_or_404(step_id, recipe)
    try:
        updated = step_service.update_step(db, step, payload)
        db.commit()
        db.refresh(updated)
        return updated
    except ValidationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors,
        )


@router.delete("/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_step(
    recipe_id: int,
    step_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    recipe = get_recipe_or_404(recipe_id, db)
    step = get_step_or_404(step_id, recipe)
    step_service.delete_step(db, step)
    db.commit()


@router.patch("/reorder", response_model=list[RecipeStepOut])
def reorder_steps(
    recipe_id: int,
    items: list[RecipeStepReorderItem],
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    get_recipe_or_404(recipe_id, db)
    try:
        steps = step_service.reorder_steps(db, recipe_id, items)
        db.commit()
        return sorted(steps, key=lambda s: s.order)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
