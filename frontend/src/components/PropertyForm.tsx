// Set / update the step property
import type { PropertyDefinition } from '../types/recipe'
import { visibleProperties } from '../utils/validation'
import type { FieldErrors } from '../utils/validation'

interface Props {
    definitions: PropertyDefinition[]
    values: Record<number, string>
    onChange: (id: number, value: string) => void
    errors: FieldErrors
}

export default function PropertyForm({ definitions, values, onChange, errors }: Props) {
    const visible = visibleProperties(definitions, values)

    if (visible.length === 0) {
        return <p className="text-xs text-zinc-600 italic">No properties for this step.</p>
    }

    return (
        <div className="space-y-4">
            {visible.map((def) => {
                const val = values[def.id] ?? def.default_value ?? ''
                const error = errors[def.key]

                return (
                    <div key={def.id}>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-widest mb-1.5">
                            {def.label}
                        </label>

                        {/* Boolean */}
                        {def.input_type === 'boolean' && (
                            <div className="flex gap-3">
                                {['true', 'false'].map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => onChange(def.id, opt)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                                            val === opt
                                                ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                                                : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300'
                                        }`}
                                    >
                                        {opt === 'true' ? 'Yes' : 'No'}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Select */}
                        {def.input_type === 'select' && def.options && (
                            <div className="flex flex-wrap gap-2">
                                {def.options.split(',').map((opt) => {
                                    const trimmed = opt.trim()
                                    const label = trimmed.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                                    return (
                                        <button
                                            key={trimmed}
                                            type="button"
                                            onClick={() => onChange(def.id, trimmed)}
                                            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
                                                val === trimmed
                                                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                                                    : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Number */}
                        {def.input_type === 'number' && (
                            <input
                                type="number"
                                value={val}
                                onChange={(e) => onChange(def.id, e.target.value)}
                                placeholder="0"
                                className={`w-full bg-white/5 border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:ring-1 ${
                                    error
                                        ? 'border-red-500/50 focus:border-red-400/60 focus:ring-red-400/20'
                                        : 'border-white/10 focus:border-amber-400/60 focus:ring-amber-400/20'
                                }`}
                            />
                        )}

                        {error && (
                            <p className="mt-1.5 text-xs text-red-400">{error}</p>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
