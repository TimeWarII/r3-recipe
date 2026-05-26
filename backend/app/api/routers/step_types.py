from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models import StepType, PropertyDefinition
from app.schemas.auth import CurrentUser
from app.schemas.recipe import StepTypeOut

router = APIRouter(prefix="/step-types", tags=["step-types"])


@router.get("", response_model=list[StepTypeOut])
def list_step_types(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    """
    Return all step types with their property definitions, validation rules,
    and trigger conditions fully nested. Used by the frontend when a user
    opens the 'add step' panel.
    """
    step_types = (
        db.query(StepType)
        .options(
            joinedload(StepType.property_definitions)
            .joinedload(PropertyDefinition.validation_rules),
            joinedload(StepType.property_definitions)
            .joinedload(PropertyDefinition.trigger_conditions),
        )
        .order_by(StepType.id)
        .all()
    )
    return step_types
