import type { PropertyDefinition, PropertyCondition, StepPropertyValueIn } from '../types/recipe'

export type FieldErrors = Record<string, string>

// Determine which property definitions are visible given the current values,
// mirroring the backend's condition logic.
export function visibleProperties(
    definitions: PropertyDefinition[],
    values: Record<number, string>, // property_definition_id -> value
): PropertyDefinition[] {
    // Collect all conditions across all definitions
    const allConditions: PropertyCondition[] = definitions.flatMap(
        (d) => d.trigger_conditions
    )

    // Map: reveals_property_id -> conditions that reveal it
    const gated = new Map<number, PropertyCondition[]>()
    for (const cond of allConditions) {
        const existing = gated.get(cond.reveals_property_id) ?? []
        gated.set(cond.reveals_property_id, [...existing, cond])
    }

    return definitions.filter((def) => {
        const conditions = gated.get(def.id)
        if (!conditions) return true     // not gated
        return conditions.some(
            (cond) => values[cond.trigger_property_id] === cond.trigger_value
        )
    })
}

// Client-side step property validation. Returns a map of field key -> error
// message (first failure per field). Empty map means valid.
export function validateStepProperties(
    definitions: PropertyDefinition[],
    values: Record<number, string>,
): FieldErrors {
    const errors: FieldErrors = {}
    const visible = visibleProperties(definitions, values)

    // Skip non-empty input check for invisible fields, e.g., when setting authomatic unscrewing
    // and still having the coordinates in buffer. The buildPropertyValuePayload in frontend/src/components/StepModal.tsx
    // constructs visibleProperties of only visible fields, thus skipping old values persisting in DOM
    
    // const visibleIds = new Set(visible.map((d) => d.id))

    // for (let [id, value] of Object.entries(values).map(([k, v]) => [Number(k), v] as const)) {
    //     console.log(value !== null, value !== '', value !== undefined, !visibleIds.has(id))
        
    //     if (value !== null && value !== '' && value !== undefined && !visibleIds.has(id)) {
    //         const def = definitions.find((d) => d.id === id)
    //         if (def) errors[def.key] = `The value ${value} is not applicable for current configuration.`
    //     }
    // }

    for (const def of visible) {
        const raw = values[def.id] ?? ''

        for (const rule of def.validation_rules) {
            if (errors[def.key]) break     // first error per field is enough

            switch (rule.rule_type) {
                case 'required':
                    if (raw.trim() === '') errors[def.key] = rule.error_message
                    break

                case 'non_negative':
                    if (raw.trim() !== '' && Number(raw) < 0)
                        errors[def.key] = rule.error_message
                    break

                case 'min_value':
                    if (raw.trim() !== '' && rule.rule_value !== null && Number(raw) < Number(rule.rule_value))
                        errors[def.key] = rule.error_message
                    break

                case 'max_value':
                    if (raw.trim() !== '' && rule.rule_value !== null && Number(raw) > Number(rule.rule_value))
                        errors[def.key] = rule.error_message
                    break

                case 'integer_only':
                    if (raw.trim() !== '') {
                        const n = Number(raw)
                        if (isNaN(n) || n !== Math.floor(n))
                            errors[def.key] = rule.error_message
                    }
                    break

                case 'one_of':
                    if (rule.rule_value !== null) {
                        const allowed = rule.rule_value.split(',').map((s) => s.trim())
                        if (!allowed.includes(raw)) errors[def.key] = rule.error_message
                    }
                    break
            }
        }
    }

    return errors
}

// Convert a values map to the array shape the API expects, omitting invisible
// properties.
export function buildPropertyValuePayload(
    definitions: PropertyDefinition[],
    values: Record<number, string>,
): StepPropertyValueIn[] {
    const visible = visibleProperties(definitions, values)
    return visible
        .filter((def) => (values[def.id] ?? '').trim() !== '')
        .map((def) => ({ property_definition_id: def.id, value: values[def.id] }))
}

