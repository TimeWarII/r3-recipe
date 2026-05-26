// Recipe step card for step index (in create / edit)
import type { RecipeStep, StepType } from '../types/recipe'

interface Props {
    step: RecipeStep
    index: number
    stepTypes: StepType[]
    isDragging: boolean
    dragHandleProps: React.HTMLAttributes<HTMLDivElement>
    onEdit: () => void
    onDelete: () => void
}

export default function StepCard({
    step,
    index,
    stepTypes,
    isDragging,
    dragHandleProps,
    onEdit,
    onDelete,
}: Props) {
    const stepType = stepTypes.find((t) => t.id === step.step_type_id)

    // Build a human-readable summary of property values
    const propertySummary = step.property_values
        .map((pv) => {
            const def = stepType?.property_definitions.find(
                (d) => d.id === pv.property_definition_id
            )
            if (!def) return null
            const displayVal =
                def.input_type === 'boolean'
                    ? pv.value === 'true' ? 'Yes' : 'No'
                    : pv.value.replace(/_/g, ' ')
            return `${def.label}: ${displayVal}`
        })
        .filter(Boolean)

    return (
        <div
            className={`group flex items-start gap-3 p-4 rounded-xl border transition-all duration-150 ${
                isDragging
                    ? 'bg-amber-400/8 border-amber-400/30 shadow-xl shadow-black/40 scale-[1.01]'
                    : 'bg-white/4 border-white/8 hover:border-white/14'
            }`}
        >
            {/* Step number badge */}
            <div className="shrink-0 w-6 h-6 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center mt-0.5">
                <span className="text-[10px] font-semibold text-zinc-500" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {String(index + 1).padStart(2, '0')}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                    {stepType?.label ?? `Step type ${step.step_type_id}`}
                </p>
                {propertySummary.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        {propertySummary.join(' · ')}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <button
                    onClick={onEdit}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"
                    title="Edit step"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                </button>
                <button
                    onClick={onDelete}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove step"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
                {/* Drag handle */}
                <div
                    {...dragHandleProps}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-white/8 transition-colors cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </div>
            </div>
        </div>
    )
}
