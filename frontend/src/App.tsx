import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RecipeEditorPage from './pages/RecipeEditorPage'
import { recipesApi } from './services/api'
import type { RecipeDetail } from './types/recipe'

type View =
    | { page: 'dashboard' }
    | { page: 'new-recipe' }
    | { page: 'edit-recipe'; recipeId: number }

function AppRoutes() {
    const { user, loading } = useAuth()
    const [view, setView] = useState<View>({ page: 'dashboard' })
    const [editRecipe, setEditRecipe] = useState<RecipeDetail | undefined>()

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            </div>
        )
    }

    if (!user) return <LoginPage />

    const openRecipe = async (id: number) => {
        const res = await recipesApi.get(id)
        setEditRecipe(res.data)
        setView({ page: 'edit-recipe', recipeId: id })
    }

    const handleSaved = (recipe: RecipeDetail) => {
        setEditRecipe(recipe)
        // After saving stay on editor so the user can keep editing
    }

    if (view.page === 'new-recipe') {
        return (
            <RecipeEditorPage
                onSaved={(recipe) => {
                    handleSaved(recipe)
                    setView({ page: 'edit-recipe', recipeId: recipe.id })
                }}
                onImported={(recipe) => {
                    setEditRecipe(recipe)
                    setView({ page: 'edit-recipe', recipeId: recipe.id })
                }}
                onBack={() => setView({ page: 'dashboard' })}
            />
        )
    }

    if (view.page === 'edit-recipe') {
        return (
            <RecipeEditorPage
                key={view.recipeId}
                recipe={editRecipe}
                onSaved={handleSaved}
                onBack={() => { setEditRecipe(undefined); setView({ page: 'dashboard' }) }}
            />
        )
    }

    return (
        <DashboardPage
            onNewRecipe={() => { setEditRecipe(undefined); setView({ page: 'new-recipe' }) }}
            onOpenRecipe={openRecipe}
            onImported={(recipe) => {
                setEditRecipe(recipe)
                setView({ page: 'edit-recipe', recipeId: recipe.id })
            }}
        />
    )
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    )
}