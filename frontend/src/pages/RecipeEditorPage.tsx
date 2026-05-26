import { useState, useEffect, useRef, useCallback } from 'react'
import type { RecipeDetail, RecipeStep, StepType, RecipeStepIn } from '../types/recipe'
import { recipesApi, stepsApi, stepTypesApi } from '../services/api'
import { downloadJson, pickJsonFile } from '../utils/json'
import StepCard from '../components/StepCard'
import StepModal from '../components/StepModal'

interface Props {
    recipe?: RecipeDetail
    onSaved: (recipe: RecipeDetail) => void
    onImported?: (recipe: RecipeDetail) => void
    onBack: () => void
}

type ModalState =
    | { mode: 'add' }
    | { mode: 'edit'; step: RecipeStep }
    | null

export default function RecipeEditorPage({ recipe: initialRecipe, onSaved, onImported, onBack }: Props) {
    const isCreating = !initialRecipe

    const [name, setName] = useState(initialRecipe?.name ?? '')
    const [description, setDescription] = useState(initialRecipe?.description ?? '')
    const [steps, setSteps] = useState<RecipeStep[]>(
        [...(initialRecipe?.steps ?? [])].sort((a, b) => a.order - b.order)
    )
    const [stepTypes, setStepTypes] = useState<StepType[]>([])
    const [modal, setModal] = useState<ModalState>(null)
    const [saving, setSaving] = useState(false)
    const [nameError, setNameError] = useState('')
    const [globalError, setGlobalError] = useState('')
    const [recipeId, setRecipeId] = useState<number | null>(initialRecipe?.id ?? null)

    // JSON preview — holds the last *saved* export, not a live view
    // (the save method runs on most recipe and step actions, except name, desc change, etc)
    const [jsonPreview, setJsonPreview] = useState<object | null>(null)
    const [loadingPreview, setLoadingPreview] = useState(false)

    // Drag state
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const dragNode = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        stepTypesApi.list().then((res) => setStepTypes(res.data)).catch(() => {})
    }, [])

    // Load the initial JSON preview in edit mode
    useEffect(() => {
        if (!isCreating && recipeId) {
            setLoadingPreview(true) // eslint-disable-line react-hooks/set-state-in-effect
            recipesApi.export(recipeId)
                .then((res) => setJsonPreview(res.data))
                .finally(() => setLoadingPreview(false))
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Refresh preview after a successful save
    const refreshPreview = useCallback(async (id: number) => {
        try {
            const res = await recipesApi.export(id)
            setJsonPreview(res.data)
        } catch {
            // If save fails, we keep whatever was in the JSON viewer last –
            // non-critical
        }
    }, [])

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDragIndex(index)
        dragNode.current = e.currentTarget as HTMLDivElement
        e.dataTransfer.effectAllowed = 'move'
        setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = '0.4' }, 0)
    }

    const handleDragEnter = (index: number) => {
        if (dragIndex === null || dragIndex === index) return
        setDragOverIndex(index)
    }

    const handleDragEnd = useCallback(async () => {
        if (dragNode.current) dragNode.current.style.opacity = '1'
        if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
            const reordered = [...steps]
            const [moved] = reordered.splice(dragIndex, 1)
            reordered.splice(dragOverIndex, 0, moved)
            const withOrder = reordered.map((s, i) => ({ ...s, order: i }))
            setSteps(withOrder)
            if (recipeId) {
                try {
                    await stepsApi.reorder(recipeId, withOrder.map((s) => ({ id: s.id, order: s.order })))
                    await refreshPreview(recipeId)
                } catch {
                    setSteps(steps)
                }
            }
        }
        setDragIndex(null)
        setDragOverIndex(null)
        dragNode.current = null
    }, [dragIndex, dragOverIndex, steps, recipeId, refreshPreview])

    // Step mutations
    const handleAddStep = async (payload: RecipeStepIn) => {
        if (!recipeId) {
            const tempStep: RecipeStep = {
                id: -(Date.now()),
                step_type_id: payload.step_type_id,
                order: steps.length,
                property_values: payload.property_values.map((pv, i) => ({
                    id: -(i + 1),
                    property_definition_id: pv.property_definition_id,
                    value: pv.value,
                })),
            }
            setSteps((prev) => [...prev, tempStep])
            setModal(null)
            return
        }
        const res = await stepsApi.add(recipeId, payload)
        setSteps((prev) => [...prev, res.data].sort((a, b) => a.order - b.order))
        setModal(null)
        await refreshPreview(recipeId)
    }

    const handleEditStep = async (step: RecipeStep, payload: RecipeStepIn) => {
        if (!recipeId || step.id < 0) {
            setSteps((prev) =>
                prev.map((s) =>
                    s.id === step.id
                        ? { ...s, property_values: payload.property_values.map((pv, i) => ({ id: -(i + 1), property_definition_id: pv.property_definition_id, value: pv.value })) }
                        : s
                )
            )
            setModal(null)
            return
        }
        const res = await stepsApi.update(recipeId, step.id, payload)
        setSteps((prev) => prev.map((s) => (s.id === step.id ? res.data : s)))
        setModal(null)
        await refreshPreview(recipeId)
    }

    const handleDeleteStep = async (step: RecipeStep) => {
        if (!recipeId || step.id < 0) {
            setSteps((prev) => prev.filter((s) => s.id !== step.id).map((s, i) => ({ ...s, order: i })))
            return
        }
        await stepsApi.delete(recipeId, step.id)
        setSteps((prev) => prev.filter((s) => s.id !== step.id).map((s, i) => ({ ...s, order: i })))
        await refreshPreview(recipeId)
    }

    const handleSave = async () => {
        setNameError('')
        setGlobalError('')
        if (!name.trim()) { setNameError('Recipe name is required.'); return }
        if (isCreating && steps.length === 0) { setGlobalError('Add at least one step before saving.'); return }
        setSaving(true)
        try {
            if (isCreating) {
                const res = await recipesApi.create({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    steps: steps.map((s) => ({
                        step_type_id: s.step_type_id,
                        property_values: s.property_values.map((pv) => ({
                            property_definition_id: pv.property_definition_id,
                            value: pv.value,
                        })),
                    })),
                })
                setRecipeId(res.data.id)
                await refreshPreview(res.data.id)
                onSaved(res.data)
            } else {
                const res = await recipesApi.update(recipeId!, {
                    name: name.trim(),
                    description: description.trim() || undefined,
                })
                await refreshPreview(recipeId!)
                onSaved(res.data)
            }
        } catch {
            setGlobalError('Failed to save recipe. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleDownload = async () => {
        if (!recipeId) return
        const res = await recipesApi.export(recipeId)
        downloadJson(res.data, name || 'recipe')
    }

    // Populate from JSON (create mode only)
    const handlePopulateFromJson = async () => {
        try {
            const json = await pickJsonFile()
            if (!json) return
            const res = await recipesApi.import(json)
            console.log('import success', res.data)
            if (onImported) {
                console.log('calling onImported')
                onImported(res.data)
            } else {
                console.log('calling onSaved')
                onSaved(res.data)
            }
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
            let msg = 'Failed to import JSON. Check the file format.'
            if (typeof detail === 'string') {
                msg = detail
            } else if (Array.isArray(detail)) {
                msg = detail.map((e: { msg?: string; loc?: unknown[] }) => {
                    const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : null
                    return field ? `${field}: ${e.msg}` : (e.msg ?? String(e))
                }).join(', ')
            }
            setGlobalError(msg)
        }
    }

    // Two-column layout in edit mode – to support JSON previews; single column in create mode
    const showPreview = !isCreating

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
            {/* Header */}
            <header className="border-b border-white/8 backdrop-blur-md bg-zinc-950/80 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                        </button>
                        <span className="text-sm font-semibold text-white">
                            {isCreating ? 'New Recipe' : 'Edit Recipe'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Download JSON — edit mode only */}
                        {!isCreating && recipeId && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-white/10 text-zinc-400 hover:text-amber-400 hover:border-amber-400/30 transition-all duration-150"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Download JSON
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="h-8 px-4 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:cursor-not-allowed text-zinc-950 transition-all duration-150 shadow-lg shadow-amber-500/20"
                        >
                            {saving ? 'Saving…' : isCreating ? 'Create Recipe' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </header>

            <main className={`flex-1 mx-auto w-full px-6 py-10 ${showPreview ? 'max-w-6xl' : 'max-w-2xl'}`}>
                <div className={`${showPreview ? 'grid grid-cols-1 lg:grid-cols-2 gap-8 items-start' : ''}`}>

                    {/* Left column — editor */}
                    <div className="space-y-8">
                        {/* Meta */}
                        <section className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-widest mb-1.5">Recipe Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setNameError('') }}
                                    placeholder="e.g. Battery Inspection A"
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:ring-1 ${
                                        nameError ? 'border-red-500/50 focus:border-red-400/60 focus:ring-red-400/20' : 'border-white/10 focus:border-amber-400/60 focus:ring-amber-400/20'
                                    }`}
                                />
                                {nameError && <p className="mt-1.5 text-xs text-red-400">{nameError}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-widest mb-1.5">
                                    Description <span className="normal-case text-zinc-600">(optional)</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    placeholder="Brief description of this recipe…"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 resize-none"
                                />
                            </div>
                        </section>

                        {/* Steps */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-sm font-semibold text-white">Steps</h2>
                                    <p className="text-xs text-zinc-600 mt-0.5">
                                        {steps.length === 0 ? 'No steps yet.' : `${steps.length} step${steps.length !== 1 ? 's' : ''}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Populate from JSON — create mode only */}
                                    {isCreating && (
                                        <button
                                            onClick={handlePopulateFromJson}
                                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                            </svg>
                                            From JSON
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setModal({ mode: 'add' })}
                                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        Add Step
                                    </button>
                                </div>
                            </div>

                            {globalError && (
                                <p className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{globalError}</p>
                            )}

                            {steps.length === 0 ? (
                                <div
                                    onClick={() => setModal({ mode: 'add' })}
                                    className="flex flex-col items-center justify-center gap-3 border border-dashed border-white/10 rounded-2xl py-12 cursor-pointer hover:border-white/20 hover:bg-white/2 transition-all duration-200 group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors">
                                        <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-zinc-600">Click to add the first step</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {steps.map((step, index) => (
                                        <div
                                            key={step.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragEnter={() => handleDragEnter(index)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={(e) => e.preventDefault()}
                                            className={`transition-all duration-150 ${
                                                dragOverIndex === index && dragIndex !== index ? 'translate-y-0.5 opacity-60' : ''
                                            }`}
                                        >
                                            <StepCard
                                                step={step}
                                                index={index}
                                                stepTypes={stepTypes}
                                                isDragging={dragIndex === index}
                                                dragHandleProps={{}}
                                                onEdit={() => setModal({ mode: 'edit', step })}
                                                onDelete={() => handleDeleteStep(step)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right column — JSON preview (edit mode only) */}
                    {showPreview && (
                        <div className="lg:sticky lg:top-20">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-white">JSON Preview</h2>
                                    <p className="text-xs text-zinc-600 mt-0.5">Last saved version</p>
                                </div>
                                {recipeId && (
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-zinc-500 hover:text-amber-400 border border-white/8 hover:border-amber-400/30 transition-all duration-150"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                        Download
                                    </button>
                                )}
                            </div>

                            <div className="relative rounded-2xl border border-white/8 bg-zinc-900 overflow-hidden">
                                {loadingPreview ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                                    </div>
                                ) : jsonPreview ? (
                                    <pre className="text-xs text-zinc-300 p-5 overflow-auto max-h-[70vh] leading-relaxed" style={{ fontFamily: "'DM Mono', monospace" }}>
                                        <code>{JSON.stringify(jsonPreview, null, 2)}</code>
                                    </pre>
                                ) : (
                                    <div className="flex items-center justify-center py-16">
                                        <p className="text-xs text-zinc-600">Save the recipe to see the JSON output.</p>
                                    </div>
                                )}

                                {/* Fade gradient at bottom */}
                                {jsonPreview && (
                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {modal && (
                <StepModal
                    stepTypes={stepTypes}
                    existingStep={modal.mode === 'edit' ? modal.step : undefined}
                    onConfirm={
                        modal.mode === 'add'
                            ? handleAddStep
                            : (payload) => handleEditStep(modal.step, payload)
                    }
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    )
}