from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import PropertyDefinition, PropertyCondition, StepType
from app.models.enums import RuleType


class ValidationError(Exception):
    """Raised when one or more property values fail validation."""

    def __init__(self, errors: dict[str, list[str]]) -> None:
        self.errors = errors
        super().__init__(str(errors))


def validate_step_properties(
    db: Session,
    step_type_id: int,
    property_values: dict[int, str],  # property_definition_id -> raw value
) -> None:
    """
    Validate a set of property values against the rules defined for a step
    type. Raises ValidationError with a full map of errors if anything fails.

    Conditional properties:
    - If a property is gated behind a PropertyCondition and the trigger value
      was NOT supplied, that property is ignored entirely (not required, not
      accepted).
    - If the trigger value WAS supplied, the revealed property is validated
      normally.
    """
    step_type: StepType | None = (
        db.query(StepType).filter(StepType.id == step_type_id).first()
    )
    if step_type is None:
        raise ValidationError(
            {"step_type_id": [f"Step type {step_type_id} does not exist."]}
        )

    # Build the set of property definition IDs that are visible given the
    # current values.
    all_defs: list[PropertyDefinition] = step_type.property_definitions

    # Determine which conditional properties are unlocked
    all_conditions: list[PropertyCondition] = (
        db.query(PropertyCondition)
        .filter(
            PropertyCondition.trigger_property_id.in_([d.id for d in all_defs])
            )
        .all()
    )

    # Map: reveals_property_id -> list of conditions that reveal it
    gated: dict[int, list[PropertyCondition]] = {}
    for cond in all_conditions:
        gated.setdefault(cond.reveals_property_id, []).append(cond)

    def is_visible(prop: PropertyDefinition) -> bool:
        if prop.id not in gated:
            return True  # not gated — always visible
        # Visible if ANY of its conditions are satisfied
        for cond in gated[prop.id]:
            supplied = property_values.get(cond.trigger_property_id, "")
            if supplied == cond.trigger_value:
                return True
        return False

    errors: dict[str, list[str]] = {}

    # Check for values supplied for invisible (gated-off) properties
    invisible_ids = {d.id for d in all_defs if not is_visible(d)}
    for prop_def_id in property_values:
        if prop_def_id in invisible_ids:
            prop = next((d for d in all_defs if d.id == prop_def_id), None)
            key = prop.key if prop else str(prop_def_id)
            errors.setdefault(key, []).append(
                """This property is not applicable for
                    the current configuration."""
            )

    # Validate visible properties
    visible_defs = [d for d in all_defs if is_visible(d)]

    for prop in visible_defs:
        raw = property_values.get(prop.id)  # None if not supplied

        for rule in prop.validation_rules:
            match rule.rule_type:

                case RuleType.required:
                    if raw is None or raw.strip() == "":
                        errors.setdefault(prop.key, []).append(
                                rule.error_message
                            )

                case RuleType.non_negative:
                    if raw is not None and raw.strip() != "":
                        try:
                            if float(raw) < 0:
                                errors.setdefault(prop.key, []).append(
                                    rule.error_message
                                )
                        except ValueError:
                            errors.setdefault(prop.key, []).append(
                                f"{prop.label} must be a number."
                            )

                case RuleType.min_value:
                    if (
                        raw is not None
                        and raw.strip() != ""
                        and rule.rule_value is not None
                    ):
                        try:
                            if float(raw) < float(rule.rule_value):
                                errors.setdefault(prop.key, []).append(
                                    rule.error_message
                                )
                        except ValueError:
                            errors.setdefault(prop.key, []).append(
                                    rule.error_message
                                )

                case RuleType.max_value:
                    if (
                        raw is not None
                        and raw.strip() != ""
                        and rule.rule_value is not None
                    ):
                        try:
                            if float(raw) > float(rule.rule_value):
                                errors.setdefault(prop.key, []).append(
                                    rule.error_message
                                )
                        except ValueError:
                            errors.setdefault(prop.key, []).append(
                                rule.error_message
                            )

                case RuleType.integer_only:
                    if raw is not None and raw.strip() != "":
                        try:
                            float_val = float(raw)
                            if float_val != int(float_val):
                                errors.setdefault(prop.key, []).append(
                                    rule.error_message
                                )
                        except ValueError:
                            errors.setdefault(prop.key, []).append(
                                    rule.error_message
                                )

                case RuleType.one_of:
                    if raw is not None and rule.rule_value is not None:
                        allowed = [
                            v.strip() for v in rule.rule_value.split(",")
                        ]
                        if raw not in allowed:
                            errors.setdefault(prop.key, []).append(
                                rule.error_message
                            )

    if errors:
        raise ValidationError(errors)
