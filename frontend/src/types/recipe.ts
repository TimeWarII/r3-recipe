
// Step types / property definitions
export interface ValidationRule {
    id: number
    rule_type: string
    rule_value: string | null
    error_message: string
}

export interface PropertyCondition {
    id: number
    trigger_property_id: number
    trigger_value: string
    reveals_property_id: number
}

export interface PropertyDefinition {
    id: number
    key: string
    label: string
    input_type: 'boolean' | 'select' | 'number'
    options: string | null  // comma-separated
    default_value: string | null
    order: number
    validation_rules: ValidationRule[]
    trigger_conditions: PropertyCondition[]
}

export interface StepType {
    id: number
    name: string
    label: string
    property_definitions: PropertyDefinition[]
}

// Recipe / steps
export interface StepPropertyValue {
    id: number
    property_definition_id: number
    value: string
}

export interface RecipeStep {
    id: number
    step_type_id: number
    order: number
    property_values: StepPropertyValue[]
}

export interface RecipeListItem {
    id: number
    name: string
    description: string | null
    created_by: string
}

export interface RecipeDetail extends RecipeListItem {
    steps: RecipeStep[]
}

// Payloads

export interface StepPropertyValueIn {
    property_definition_id: number
    value: string
}

export interface RecipeStepIn {
    step_type_id: number
    property_values: StepPropertyValueIn[]
}

export interface RecipeCreateIn {
    name: string
    description?: string
    steps: RecipeStepIn[]
}

export interface RecipeUpdateIn {
    name?: string
    description?: string
}

export interface ReorderItem {
    id: number
    order: number
}

// Validation error shape returned by the API
export type StepValidationErrors = Record<string, string[]>
