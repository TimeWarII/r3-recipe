import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { recipesApi } from '../services/api'
import { downloadJson, pickJsonFile } from '../utils/json'
import type { RecipeListItem, RecipeDetail } from '../types/recipe'

interface Props {
    onNewRecipe: () => void
    onOpenRecipe: (id: number) => void
    onImported: (recipe: RecipeDetail) => void
}

export default function DashboardPage({ onNewRecipe, onOpenRecipe, onImported }: Props) {
    const { user, logout } = useAuth()
    const [recipes, setRecipes] = useState<RecipeListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [downloadingId, setDownloadingId] = useState<number | null>(null)
    const [importing, setImporting] = useState(false)
    const [importError, setImportError] = useState<string | null>(null)

    useEffect(() => {
        recipesApi.list()
            .then((res) => setRecipes(res.data))
            .finally(() => setLoading(false))
    }, [])

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation()
        if (!confirm('Delete this recipe? This cannot be undone.')) return
        setDeletingId(id)
        try {
            await recipesApi.delete(id)
            setRecipes((prev) => prev.filter((r) => r.id !== id))
        } finally {
            setDeletingId(null)
        }
    }

    const handleDownload = async (e: React.MouseEvent, recipe: RecipeListItem) => {
        e.stopPropagation()
        setDownloadingId(recipe.id)
        try {
            const res = await recipesApi.export(recipe.id)
            downloadJson(res.data, recipe.name)
        } finally {
            setDownloadingId(null)
        }
    }

    const handleImport = async () => {
        setImportError(null)
        try {
            const json = await pickJsonFile()
            if (!json) return
            setImporting(true)
            const res = await recipesApi.import(json)
            onImported(res.data)
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
            let msg = 'Failed to import recipe. Check the file format and try again.'
            if (typeof detail === 'string') {
                msg = detail
            } else if (Array.isArray(detail)) {
                msg = detail.map((e: { msg?: string; loc?: unknown[] }) => {
                    const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : null
                    return field ? `${field}: ${e.msg}` : (e.msg ?? String(e))
                }).join(', ')
            }
            setImportError(msg)
            setImporting(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
            <header className="border-b border-white/8 backdrop-blur-md bg-zinc-950/80 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-400 flex items-center justify-center">
                            <svg className='h-3.5 w-3.5' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                                <path d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z"/>
                            </svg>
                        </div>
                        <span className="text-sm font-semibold tracking-tight" style={{ fontFamily: "'DM Mono', monospace" }}>
                            RC<span className="text-amber-400">A</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-zinc-500">{user?.name}</span>
                        <button onClick={logout} className="text-xs text-zinc-500 hover:text-white transition-colors border border-white/10 hover:border-white/20 rounded-md px-3 py-1.5">
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Recipes</h1>
                        <p className="text-sm text-zinc-500 mt-0.5">All recipes across the team</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleImport}
                            disabled={importing}
                            className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {importing ? (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                            )}
                            Import JSON
                        </button>
                        <button
                            onClick={onNewRecipe}
                            className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all duration-150 shadow-lg shadow-amber-500/20"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            New Recipe
                        </button>
                    </div>
                </div>

                {importError && (
                    <div className="mb-6 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                        <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p className="text-xs text-red-400 flex-1">{importError}</p>
                        <button onClick={() => setImportError(null)} className="text-zinc-600 hover:text-zinc-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                    </div>
                ) : recipes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-24 border border-dashed border-white/10 rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center">
                            <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-zinc-400">No recipes yet</p>
                            <p className="text-xs text-zinc-600 mt-1">Create your first recipe or import a JSON file</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <button onClick={handleImport} className="h-8 px-4 rounded-lg text-xs font-medium border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all">Import JSON</button>
                            <button onClick={onNewRecipe} className="h-8 px-4 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all">New Recipe</button>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {recipes.map((recipe) => (
                            <div
                                key={recipe.id}
                                onClick={() => onOpenRecipe(recipe.id)}
                                className="group relative flex flex-col gap-3 p-5 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-white/14 transition-all duration-200 cursor-pointer"
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-white truncate">{recipe.name}</h3>
                                    {recipe.description && (
                                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{recipe.description}</p>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600">by <span className="text-zinc-500">{recipe.created_by}</span></span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                        <button
                                            onClick={(e) => handleDownload(e, recipe)}
                                            disabled={downloadingId === recipe.id}
                                            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-600 hover:text-amber-400 hover:bg-amber-400/10 transition-all duration-150"
                                            title="Download JSON"
                                        >
                                            {downloadingId === recipe.id ? (
                                                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            ) : (
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, recipe.id)}
                                            disabled={deletingId === recipe.id}
                                            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                                            title="Delete recipe"
                                        >
                                            {deletingId === recipe.id ? (
                                                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            ) : (
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}