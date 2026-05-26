// Create / edit Step
import { useState, useEffect } from 'react'
import type { StepType, RecipeStep, RecipeStepIn } from '../types/recipe'
import { validateStepProperties, buildPropertyValuePayload } from '../utils/validation'
import type { FieldErrors } from '../utils/validation'
import PropertyForm from './PropertyForm'

interface Props {
    stepTypes: StepType[]
    existingStep?: RecipeStep   // If provided, we are editing an existing step
    onConfirm: (payload: RecipeStepIn) => Promise<void>
    onClose: () => void
}

export default function StepModal({ stepTypes, existingStep, onConfirm, onClose }: Props) {
    const isEditing = !!existingStep

    // Step type selection — locked when editing
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(
        existingStep?.step_type_id ?? null
    )

    // Property values keyed by property_definition_id
    const [values, setValues] = useState<Record<number, string>>({})
    const [errors, setErrors] = useState<FieldErrors>({})
    const [submitting, setSubmitting] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null)
    const selectedType = stepTypes.find((t) => t.id === selectedTypeId) ?? null

    // Populate defaults or existing values when type is set
    useEffect(() => {
        if (!selectedType) { setValues({}); return }
        const initial: Record<number, string> = {}
        for (const def of selectedType.property_definitions) {
            if (isEditing && existingStep) {
                const match = existingStep.property_values.find(
                    (pv) => pv.property_definition_id === def.id
                )
            initial[def.id] = match?.value ?? def.default_value ?? ''
            } else {
                initial[def.id] = def.default_value ?? ''    // always write, even if ''
            }
        }
        setValues(initial)
        setErrors({})
    }, [selectedTypeId]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = (id: number, value: string) => {
        setValues((prev) => ({ ...prev, [id]: value }))
        // Clear error for this field on change
        if (selectedType) {
            const def = selectedType.property_definitions.find((d) => d.id === id)
            if (def) setErrors((prev) => { const next = { ...prev }; delete next[def.key]; return next })
        }
    }

    const handleSubmit = async () => {
        if (!selectedType) return

        const fieldErrors = validateStepProperties(selectedType.property_definitions, values)
        console.log(fieldErrors)
        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors)
            return
        }

        const payload: RecipeStepIn = {
            step_type_id: selectedType.id,
            property_values: buildPropertyValuePayload(selectedType.property_definitions, values),
        }

        setSubmitting(true)
        setApiError(null)
        try {
            await onConfirm(payload)
        } catch (err: unknown) {
            // Backend validation errors come back as { detail: { field: [msg] } }
            const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
            if (detail && typeof detail === 'object') {
                const mapped: FieldErrors = {}
                for (const [key, msgs] of Object.entries(detail as Record<string, string[]>)) {
                    mapped[key] = Array.isArray(msgs) ? msgs[0] : String(msgs)
                }
                setErrors(mapped)
            } else {
                setApiError('Something went wrong. Please try again.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
                    <h2 className="text-sm font-semibold text-white">
                        {isEditing ? 'Edit Step' : 'Add Step'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                    {/* Step type picker — hidden when editing */}
                    {!isEditing && (
                        <div>
                            <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">
                                Step type
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {stepTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setSelectedTypeId(type.id)}
                                        className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                                            selectedTypeId === type.id
                                                ? 'bg-amber-400/10 border-amber-400/40 text-amber-300'
                                                : 'bg-white/4 border-white/8 text-zinc-400 hover:border-white/16 hover:text-zinc-300'
                                        }`}
                                    >
                                        <span className="text-xs font-medium">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Property form */}
                    {selectedType && (
                        <div>
                            {!isEditing && (
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-px flex-1 bg-white/8" />
                                    <span className="text-xs text-zinc-600">Properties</span>
                                    <div className="h-px flex-1 bg-white/8" />
                                </div>
                            )}
                            <PropertyForm
                                definitions={selectedType.property_definitions}
                                values={values}
                                onChange={handleChange}
                                errors={errors}
                            />
                        </div>
                    )}

                    {apiError && (
                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            {apiError}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/8 flex gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg text-sm text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!selectedType || submitting}
                        className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/30 disabled:cursor-not-allowed text-zinc-950 transition-all duration-150 shadow-lg shadow-amber-500/20"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Saving…
                            </span>
                        ) : isEditing ? 'Save Changes' : 'Add Step'}
                    </button>
                </div>
            </div>
        </div>
    )
}
