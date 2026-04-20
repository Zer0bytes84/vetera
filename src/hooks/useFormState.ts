import { useState } from "react"

export function useFormState<T>(initialState: T) {
  const [data, setData] = useState<T>(initialState)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const updateField = <K extends keyof T>(field: K, value: T[K]) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const reset = () => {
    setData(initialState)
    setIsEditing(false)
    setIsSaving(false)
  }

  return {
    data,
    setData,
    isEditing,
    setIsEditing,
    isSaving,
    setIsSaving,
    updateField,
    reset
  }
}

export function useFilterState<T>(initialFilter: T) {
  const [filter, setFilter] = useState<T>(initialFilter)

  const resetFilters = () => {
    setFilter(initialFilter)
  }

  return {
    filter,
    setFilter,
    resetFilters
  }
}
