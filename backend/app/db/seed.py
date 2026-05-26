from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models import (
    User, StepType, PropertyDefinition, PropertyCondition,
    PropertyValidationRule, InputType, RuleType,
)


def seed(db: Session) -> None:
    _seed_users(db)
    _seed_step_types(db)
    db.commit()
    print("Seeding complete.")


# Seeds 2 users for testing, to demonstrate Auth and the
# User->hasMany->Step relation. The latter is set up to keep track of
# step authorship; a authenticated non-author can perform CRUD operations
# on a step created by somebody else. In real life, a system would be
# put in place to keep track of the edits: ownership and versions
def _seed_users(db: Session) -> None:
    if db.query(User).count() > 0:
        print("Users already seeded, skipping.")
        return

    for name, login in [("User One", "user1"), ("User Two", "user2")]:
        db.add(User(
            name=name,
            login=login,
            hashed_password=hash_password("password"),
        ))
    db.flush()
    print("Users seeded.")


# Seeds step types with property definitions, conditions, etc related entities
def _seed_step_types(db: Session) -> None:
    if db.query(StepType).count() > 0:
        print("Step types already seeded, skipping.")
        return

    # ------------------------------------------------------------------
    # TAKE IMAGE
    # ------------------------------------------------------------------
    take_image = StepType(name="take_image", label="Take Image")
    db.add(take_image)
    db.flush()

    # Available properties are seeded; in real life, the solution might include
    # user functionality for defining new ones, depending on how customisable
    # the application needs to be: i.e., whether it provides a specific
    # solution for a rigid kind of an automated worklow, or aims to provide a
    # more flexible framework.
    p_pointcloud = PropertyDefinition(
        step_type_id=take_image.id,
        key="include_pointcloud",
        label="Include Pointcloud",
        input_type=InputType.boolean,   # from Models.enums
        default_value="false",
        order=0,
    )
    db.add(p_pointcloud)
    db.flush()
    db.add(PropertyValidationRule(
        property_definition_id=p_pointcloud.id,
        rule_type=RuleType.required,
        error_message="Pointcloud selection is required.",
    ))

    p_image_type = PropertyDefinition(
        step_type_id=take_image.id,
        key="image_type",
        label="Image Type",
        input_type=InputType.select,
        options="full_battery,section",
        default_value="full_battery",
        order=1,
    )
    db.add(p_image_type)
    db.flush()
    db.add(PropertyValidationRule(
        property_definition_id=p_image_type.id,
        rule_type=RuleType.required,
        error_message="Image type is required.",
    ))
    db.add(PropertyValidationRule(
        property_definition_id=p_image_type.id,
        rule_type=RuleType.one_of,
        rule_value="full_battery,section",
        error_message="Image type must be 'full_battery' or 'section'.",
    ))

    p_center_x = PropertyDefinition(
        step_type_id=take_image.id,
        key="center_x",
        label="Center X",
        input_type=InputType.number,
        order=2,
    )
    db.add(p_center_x)
    db.flush()
    db.add(PropertyValidationRule(
        property_definition_id=p_center_x.id,
        rule_type=RuleType.non_negative,
        error_message="Center X must be a non-negative number.",
    ))
    db.add(PropertyValidationRule(
        property_definition_id=p_center_x.id,
        rule_type=RuleType.integer_only,
        error_message="Center X must be an integer.",
    ))

    p_center_y = PropertyDefinition(
        step_type_id=take_image.id,
        key="center_y",
        label="Center Y",
        input_type=InputType.number,
        order=3,
    )
    db.add(p_center_y)
    db.flush()
    db.add(PropertyValidationRule(
        property_definition_id=p_center_y.id,
        rule_type=RuleType.non_negative,
        error_message="Center Y must be a non-negative number.",
    ))
    db.add(PropertyValidationRule(
        property_definition_id=p_center_y.id,
        rule_type=RuleType.integer_only,
        error_message="Center Y must be an integer.",
    ))

    # p_center_x and p_center_y are conditionally required (gated) if
    # p_image_type = "section"; the rule affects backend validation in
    # services.validation.validate_step_properties, as well as how the
    # frontend inputs are displayed and handled in
    # frontend/src/components/StepModal.tsx
    # and frontend/src/utils/validation.ts
    db.add(PropertyCondition(
        trigger_property_id=p_image_type.id,
        trigger_value="section",
        reveals_property_id=p_center_x.id,
    ))
    db.add(PropertyCondition(
        trigger_property_id=p_image_type.id,
        trigger_value="section",
        reveals_property_id=p_center_y.id,
    ))
    db.add(PropertyValidationRule(
        property_definition_id=p_center_x.id,
        rule_type=RuleType.required,
        error_message="Center X is required.",
    ))
    db.add(PropertyValidationRule(
        property_definition_id=p_center_y.id,
        rule_type=RuleType.required,
        error_message="Center Y is required.",
    ))

    # ------------------------------------------------------------------
    # UNSCREWING
    # ------------------------------------------------------------------
    unscrewing = StepType(name="unscrewing", label="Unscrewing")
    db.add(unscrewing)
    db.flush()

    p_mode = PropertyDefinition(
        step_type_id=unscrewing.id,
        key="unscrewing_mode",
        label="Unscrewing Mode",
        input_type=InputType.select,
        options="automatic,specific",
        default_value="automatic",
        order=0,
    )
    db.add(p_mode)
    db.flush()
    db.add(PropertyValidationRule(
        property_definition_id=p_mode.id,
        rule_type=RuleType.required,
        error_message="Unscrewing mode is required.",
    ))
    db.add(PropertyValidationRule(
        property_definition_id=p_mode.id,
        rule_type=RuleType.one_of,
        rule_value="automatic,specific",
        error_message="Unscrewing mode must be 'automatic' or 'specific'.",
    ))

    p_coord_x = PropertyDefinition(
        step_type_id=unscrewing.id,
        key="coord_x",
        label="Coordinate X",
        input_type=InputType.number,
        order=1,
    )
    db.add(p_coord_x)
    db.flush()
    db.add(PropertyValidationRule(
        property_definition_id=p_coord_x.id,
        rule_type=RuleType.non_negative,
        error_message="Coordinate X must be a non-negative number.",
    ))
    db.add(PropertyValidationRule(
        property_definition_id=p_coord_x.id,
        rule_type=RuleType.integer_only,
        error_message="Coordinate X must be an integer.",
    ))

    p_coord_y = PropertyDefinition(
        step_type_id=unscrewing.id,
        key="coord_y",
        label="Coordinate Y",
        input_type=InputType.number,
        order=2,
    )
    db.add(p_coord_y)
    db.flush()
    db.add(PropertyValidationRule(
        property_definition_id=p_coord_y.id,
        rule_type=RuleType.non_negative,
        error_message="Coordinate Y must be a non-negative number.",
    ))
    db.add(PropertyValidationRule(
        property_definition_id=p_coord_y.id,
        rule_type=RuleType.integer_only,
        error_message="Coordinate Y must be an integer.",
    ))

    db.add(PropertyCondition(
        trigger_property_id=p_mode.id,
        trigger_value="specific",
        reveals_property_id=p_coord_x.id,
    ))
    db.add(PropertyCondition(
        trigger_property_id=p_mode.id,
        trigger_value="specific",
        reveals_property_id=p_coord_y.id,
    ))
    db.add(PropertyValidationRule(
        property_definition_id=p_coord_x.id,
        rule_type=RuleType.required,
        error_message="Coordinate X is required.",
    ))
    db.add(PropertyValidationRule(
        property_definition_id=p_coord_y.id,
        rule_type=RuleType.required,
        error_message="Coordinate Y is required.",
    ))

    print("Step types seeded.")
