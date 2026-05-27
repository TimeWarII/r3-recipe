from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models import (
        Recipe, RecipeStep, StepPropertyValue, StepType, PropertyDefinition
    )
from app.schemas.recipe import (
        RecipeCreateIn,
        RecipeUpdateIn,
        RecipeImportIn,
        RecipeExportOut,
        RecipeExportStepOut
    )
from app.services.step_service import create_step


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _recipe_with_detail(db: Session, recipe_id: int) -> Recipe | None:
    """Eager-load a recipe with all nested relations in one query."""
    return (
        db.query(Recipe)
        .options(
            joinedload(Recipe.user),
            joinedload(Recipe.steps)
            .joinedload(RecipeStep.property_values)
            .joinedload(StepPropertyValue.property_definition),
        )
        .filter(Recipe.id == recipe_id)
        .first()
    )


def _attach_creator(recipe: Recipe) -> Recipe:
    """Attach a `created_by` attribute so the schema can read it."""
    recipe.created_by = recipe.user.login  # type: ignore[attr-defined]
    return recipe


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def list_recipes(db: Session) -> list[Recipe]:
    recipes = (
        db.query(Recipe)
        .options(joinedload(Recipe.user))
        .order_by(Recipe.created_at.desc())
        .all()
    )
    for r in recipes:
        _attach_creator(r)
    return recipes


def get_recipe(db: Session, recipe_id: int) -> Recipe | None:
    recipe = _recipe_with_detail(db, recipe_id)
    if recipe is None:
        return None
    return _attach_creator(recipe)


def create_recipe(
            db: Session, user_id: int, payload: RecipeCreateIn
        ) -> Recipe:
    """
    Create a recipe with all its steps in a single transaction.
    Raises ValidationError (from step_service) if any step is invalid —
    the whole operation is rolled back by the caller.
    """
    recipe = Recipe(
        name=payload.name,
        description=payload.description,
        user_id=user_id,
    )
    db.add(recipe)
    db.flush()   # get recipe.id

    for idx, step_payload in enumerate(payload.steps):
        create_step(db, recipe.id, step_payload, order=idx)

    db.commit()
    db.refresh(recipe)
    return _attach_creator(_recipe_with_detail(
            db, recipe.id
        ))  # type: ignore[arg-type]


def update_recipe(
    db: Session,
    recipe: Recipe,
    payload: RecipeUpdateIn,
) -> Recipe:
    if payload.name is not None:
        recipe.name = payload.name
    if payload.description is not None:
        recipe.description = payload.description
    db.commit()
    db.refresh(recipe)
    return _attach_creator(_recipe_with_detail(
            db, recipe.id
        ))  # type: ignore[arg-type]


def delete_recipe(db: Session, recipe: Recipe) -> None:
    db.delete(recipe)
    db.commit()


def export_recipe(db: Session, recipe_id: int) -> RecipeExportOut | None:
    """
    Build a human-readable, id-free export of a recipe.
    Resolves step_type_id → StepType.name and
    property_definition_id → PropertyDefinition.key.
    """
    recipe = _recipe_with_detail(db, recipe_id)
    if recipe is None:
        return None

    # Build a lookup of all property_definition ids touched by this recipe
    # so we avoid N+1 queries.
    all_pd_ids = {
        pv.property_definition_id
        for step in recipe.steps
        for pv in step.property_values
    }
    pd_key_map: dict[int, str] = {}
    if all_pd_ids:
        rows = (
            db.query(PropertyDefinition.id, PropertyDefinition.key)
            .filter(PropertyDefinition.id.in_(all_pd_ids))
            .all()
        )
        pd_key_map = {row.id: row.key for row in rows}

    # N+1 example for presentation:

    # for step in recipe.steps:
    # for pv in step.property_values:
    #     definition = db.query(PropertyDefinition).filter(PropertyDefinition.id == pv.property_definition_id).first()
        # ...

    # i.e., in the version that we use, we collect all the property definition id's from the result of _recipe_with_detail
    # – no additional DB calls at this stage. When we need full definitions, we simply run the .filter(PropertyDefinition.id.in_(all_pd_ids)) query
    # in the N+1 example, we perform a databse call for each pv.property_definition_id

    # Build a lookup for step type names
    all_st_ids = {step.step_type_id for step in recipe.steps}
    st_name_map: dict[int, str] = {}
    if all_st_ids:
        rows = (
            db.query(StepType.id, StepType.name)
            .filter(StepType.id.in_(all_st_ids))
            .all()
        )
        st_name_map = {row.id: row.name for row in rows}

    export_steps = [
        RecipeExportStepOut(
            step_type=st_name_map[step.step_type_id],
            order=step.order,
            properties={
                pd_key_map[pv.property_definition_id]: pv.value
                for pv in step.property_values
                if pv.property_definition_id in pd_key_map
            },
        )
        for step in sorted(recipe.steps, key=lambda s: s.order)
    ]

    return RecipeExportOut(
        name=recipe.name,
        description=recipe.description,
        steps=export_steps,
    )


def import_recipe(
    db: Session,
    user_id: int,
    payload: RecipeImportIn,
) -> Recipe:
    """
    Reconstruct a recipe from an export payload.
    Resolves StepType.name → id and PropertyDefinition.key → id.
    Raises ValueError for unknown step types or property keys.
    Raises ValidationError (from step_service) if property values are invalid.
    """
    # Resolve all step type names up front
    step_type_names = {s.step_type for s in payload.steps}
    st_rows = (
        db.query(StepType)
        .options(joinedload(StepType.property_definitions))
        .filter(StepType.name.in_(step_type_names))
        .all()
    )
    st_map: dict[str, StepType] = {st.name: st for st in st_rows}

    missing_types = step_type_names - st_map.keys()
    if missing_types:
        raise ValueError(
            f"Unknown step type(s): {', '.join(sorted(missing_types))}"
        )

    # Build property key → PropertyDefinition.id per step type
    pd_map: dict[str, dict[str, int]] = {
        st.name: {pd.key: pd.id for pd in st.property_definitions}
        for st in st_rows
    }

    # Build RecipeCreateIn-compatible objects without re-importing that schema;
    # we construct the ORM objects directly for clarity.
    recipe = Recipe(
        name=payload.name,
        description=payload.description,
        user_id=user_id,
    )
    db.add(recipe)
    db.flush()

    for step_in in sorted(payload.steps, key=lambda s: s.order):
        st = st_map[step_in.step_type]
        key_to_id = pd_map[step_in.step_type]

        unknown_keys = set(step_in.properties) - key_to_id.keys()
        if unknown_keys:
            raise ValueError(
                f"Step type '{step_in.step_type}' has no property key(s): "
                f"{', '.join(sorted(unknown_keys))}"
            )

        pv_map = {key_to_id[k]: v for k, v in step_in.properties.items()}

        # Reuse the existing create_step which runs validation
        from app.schemas.recipe import RecipeStepIn, StepPropertyValueIn
        step_payload = RecipeStepIn(
            step_type_id=st.id,
            property_values=[
                StepPropertyValueIn(property_definition_id=pd_id, value=val)
                for pd_id, val in pv_map.items()
            ],
        )
        create_step(db, recipe.id, step_payload, order=step_in.order)

    db.commit()
    db.refresh(recipe)
    return _attach_creator(
        _recipe_with_detail(db, recipe.id)  # type: ignore[arg-type]
    )
