from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import RecipeStep, StepPropertyValue
from app.schemas.recipe import RecipeStepIn, RecipeStepReorderItem
from app.services.validation import validate_step_properties

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _renormalise_order(db: Session, recipe_id: int) -> None:
    """Re-assign 0-based order values to all steps of a recipe, sorted
    by their current order. Called after any delete."""
    steps = (
        db.query(RecipeStep)
        .filter(RecipeStep.recipe_id == recipe_id)
        .order_by(RecipeStep.order)
        .all()
    )
    # Ordered 0..n by order, where idx = new 0..n without gaps
    for idx, step in enumerate(steps):
        step.order = idx


def _write_property_values(
    db: Session,
    step: RecipeStep,
    property_values: list,
) -> None:
    """Delete existing values for this step and insert the new ones."""
    db.query(StepPropertyValue).filter(
        StepPropertyValue.recipe_step_id == step.id
    ).delete()

    for pv in property_values:
        db.add(
            StepPropertyValue(
                recipe_step_id=step.id,
                property_definition_id=pv.property_definition_id,
                value=pv.value,
            )
        )


# ---------------------------------------------------------------------------
# Public API used by both the recipe service and the steps router
# ---------------------------------------------------------------------------


def create_step(
    db: Session,
    recipe_id: int,
    payload: RecipeStepIn,
    order: int,
) -> RecipeStep:
    """
    Validate and create a single step.  Does NOT commit — caller owns the
    transaction.
    """
    pv_map = {
        pv.property_definition_id: pv.value for pv in payload.property_values
    }
    validate_step_properties(
            db, payload.step_type_id, pv_map
        )  # raises ValidationError

    step = RecipeStep(
        recipe_id=recipe_id,
        step_type_id=payload.step_type_id,
        order=order,
    )
    db.add(step)
    db.flush()

    _write_property_values(db, step, payload.property_values)
    return step


def update_step(
    db: Session,
    step: RecipeStep,
    payload: RecipeStepIn,
) -> RecipeStep:
    """
    Validate and replace a step's property values.  Step type cannot be
    changed (remove + add instead).  Does NOT commit.
    """
    pv_map = {
        pv.property_definition_id: pv.value for pv in payload.property_values
    }
    validate_step_properties(db, step.step_type_id, pv_map)

    _write_property_values(db, step, payload.property_values)
    return step


def delete_step(db: Session, step: RecipeStep) -> None:
    """
    Delete the step and renormalise the order of siblings.
    Does NOT commit.
    """
    recipe_id = step.recipe_id
    db.delete(step)
    db.flush()
    _renormalise_order(db, recipe_id)


def reorder_steps(
    db: Session,
    recipe_id: int,
    items: list[RecipeStepReorderItem],
) -> list[RecipeStep]:
    """
    Apply a client-supplied ordering.  Validates that every ID belongs to the
    recipe and that no IDs are missing.  Does NOT commit.
    """
    existing_steps = (
        db.query(RecipeStep).filter(RecipeStep.recipe_id == recipe_id).all()
    )
    existing_ids = {s.id for s in existing_steps}
    supplied_ids = {item.id for item in items}

    if supplied_ids != existing_ids:
        raise ValueError(
                "The supplied step IDs do not match the steps of this recipe."
            )

    step_map = {s.id: s for s in existing_steps}
    for item in items:
        step_map[item.id].order = item.order

    # Normalise to ensure 0-based integer ordering
    # Skip; the client should return a 0-based array, unless steps got removed
    # in which case the _renormalise_order fires from delete_step
    # _renormalise_order(db, recipe_id)
    db.flush()
    return list(step_map.values())
