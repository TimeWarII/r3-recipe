import axios from 'axios'
import type {
    RecipeListItem,
    RecipeDetail,
    RecipeCreateIn,
    RecipeUpdateIn,
    RecipeStep,
    RecipeStepIn,
    ReorderItem,
    StepType,
} from '../types/recipe'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('access_token')
            window.location.href = '/login'
        }
        return Promise.reject(err)
    }
)

// Auth
export const authApi = {
    login: (login: string, password: string) =>
        api.post<{ access_token: string; token_type: string }>('/auth/login', { login, password }),
    logout: () => api.post('/auth/logout'),
    me: () => api.get<{ id: number; name: string; login: string }>('/auth/me'),
}

// Step types
export const stepTypesApi = {
    list: () => api.get<StepType[]>('/step-types'),
}

// Recipes
export const recipesApi = {
    list: () => api.get<RecipeListItem[]>('/recipes'),
    get: (id: number) => api.get<RecipeDetail>(`/recipes/${id}`),
    create: (payload: RecipeCreateIn) => api.post<RecipeDetail>('/recipes', payload),
    update: (id: number, payload: RecipeUpdateIn) =>
        api.put<RecipeDetail>(`/recipes/${id}`, payload),
    delete: (id: number) => api.delete(`/recipes/${id}`),
    export: (id: number) => api.get<object>(`/recipes/${id}/export`),
    import: (payload: object) => api.post<RecipeDetail>('/recipes/import', payload),
}

// Steps (nested under a recipe)
export const stepsApi = {
    add: (recipeId: number, payload: RecipeStepIn) =>
        api.post<RecipeStep>(`/recipes/${recipeId}/steps`, payload),
    update: (recipeId: number, stepId: number, payload: RecipeStepIn) =>
        api.put<RecipeStep>(`/recipes/${recipeId}/steps/${stepId}`, payload),
    delete: (recipeId: number, stepId: number) =>
        api.delete(`/recipes/${recipeId}/steps/${stepId}`),
    reorder: (recipeId: number, items: ReorderItem[]) =>
        api.patch<RecipeStep[]>(`/recipes/${recipeId}/steps/reorder`, items),
}