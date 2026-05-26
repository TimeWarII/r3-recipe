from __future__ import annotations

from pydantic import BaseModel, field_validator

# ---------------------------------------------------------------------------
# Property value schemas
# ---------------------------------------------------------------------------


class StepPropertyValueIn(BaseModel):
    property_definition_id: int
    value: str


class StepPropertyValueOut(BaseModel):
    id: int
    property_definition_id: int
    value: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Step schemas
# ---------------------------------------------------------------------------


class RecipeStepIn(BaseModel):
    step_type_id: int
    property_values: list[StepPropertyValueIn] = []


class RecipeStepReorderItem(BaseModel):
    id: int
    order: int


class RecipeStepOut(BaseModel):
    id: int
    step_type_id: int
    order: int
    property_values: list[StepPropertyValueOut] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Recipe schemas
# ---------------------------------------------------------------------------


class RecipeCreateIn(BaseModel):
    name: str
    description: str | None = None
    steps: list[RecipeStepIn]

    @field_validator("steps")
    @classmethod
    def at_least_one_step(cls, v: list[RecipeStepIn]) -> list[RecipeStepIn]:
        if len(v) < 1:
            raise ValueError("A recipe must have at least one step.")
        return v


class RecipeUpdateIn(BaseModel):
    name: str | None = None
    description: str | None = None


class RecipeListItemOut(BaseModel):
    id: int
    name: str
    description: str | None
    created_by: str  # username of the creator

    model_config = {"from_attributes": True}


class RecipeDetailOut(BaseModel):
    id: int
    name: str
    description: str | None
    created_by: str
    steps: list[RecipeStepOut] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Step-type / property schemas (for the step-type index endpoints)
# ---------------------------------------------------------------------------


class ValidationRuleOut(BaseModel):
    id: int
    rule_type: str
    rule_value: str | None
    error_message: str

    model_config = {"from_attributes": True}


class PropertyConditionOut(BaseModel):
    id: int
    trigger_property_id: int
    trigger_value: str
    reveals_property_id: int

    model_config = {"from_attributes": True}


class PropertyDefinitionOut(BaseModel):
    id: int
    key: str
    label: str
    input_type: str
    options: str | None  # comma-separated, split client-side
    default_value: str | None
    order: int
    validation_rules: list[ValidationRuleOut] = []
    # conditions that this property *triggers* (i.e. it is the trigger field)
    trigger_conditions: list[PropertyConditionOut] = []

    model_config = {"from_attributes": True}


class StepTypeOut(BaseModel):
    id: int
    name: str
    label: str
    property_definitions: list[PropertyDefinitionOut] = []

    model_config = {"from_attributes": True}


# Export / import
class RecipeExportStepOut(BaseModel):
    step_type: str  # StepType.name
    order: int
    properties: dict[str, str]  # PropertyDefinition.key → value


class RecipeExportOut(BaseModel):
    name: str
    description: str | None
    steps: list[RecipeExportStepOut]


class RecipeImportStepIn(BaseModel):
    step_type: str
    order: int
    properties: dict[str, str]


class RecipeImportIn(BaseModel):
    name: str
    description: str | None = None
    steps: list[RecipeImportStepIn]

    @field_validator("steps")
    @classmethod
    def at_least_one_step(
                cls, v: list[RecipeImportStepIn]
            ) -> list[RecipeImportStepIn]:
        if len(v) < 1:
            raise ValueError("A recipe must have at least one step.")
        return v
