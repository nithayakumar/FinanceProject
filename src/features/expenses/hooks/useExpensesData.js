import { useState, useEffect, useRef } from 'react'
import { storage, EXPENSE_CONFIG, createDefaultExpenseCategories } from '../../../core'
import { calculateExpenseProjections } from '../Expenses.calc'
import { JUMP_DESCRIPTIONS } from '../config/expensesSchema'

export function useExpensesData() {
    // Load profile for inflation rate
    const profile = storage.load('profile') || {}
    const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7
    const incomeData = storage.load('income')

    // Initialize state directly from storage
    const [data, setData] = useState(() => {
        const saved = storage.load('expenses')
        if (saved) {
            return saved
        }
        return {
            expenseCategories: createDefaultExpenseCategories(inflationRate)
        }
    })

    const [expandedCategories, setExpandedCategories] = useState({})
    const [errors, setErrors] = useState({})

    // Auto-save effect
    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        storage.save('expenses', data)
    }, [data])

    // Debounced Projections
    const [projections, setProjections] = useState(() => calculateExpenseProjections(data, profile, incomeData))

    useEffect(() => {
        const timer = setTimeout(() => {
            setProjections(calculateExpenseProjections(data, profile, incomeData))
        }, 300) // 300ms debounce

        return () => clearTimeout(timer)
    }, [data, profile, incomeData])

    // Actions
    const updateCategory = (categoryId, field, value) => {
        setData(prev => ({
            ...prev,
            expenseCategories: prev.expenseCategories.map(cat => {
                if (cat.id !== categoryId) return cat
                return { ...cat, [field]: value }
            })
        }))
    }

    const toggleAdvanced = (categoryId) => {
        setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }))
    }

    // Jumps Logic
    const addJump = (categoryId) => {
        const desc = JUMP_DESCRIPTIONS[Math.floor(Math.random() * JUMP_DESCRIPTIONS.length)]
        const newJump = { id: `jump-${Date.now()}`, year: '', jumpPercent: '', description: desc }

        setData(prev => ({
            ...prev,
            expenseCategories: prev.expenseCategories.map(c =>
                c.id === categoryId ? { ...c, jumps: [...c.jumps, newJump] } : c
            )
        }))
    }

    const updateJump = (categoryId, jumpId, field, value) => {
        setData(prev => ({
            ...prev,
            expenseCategories: prev.expenseCategories.map(c =>
                c.id === categoryId ? {
                    ...c,
                    jumps: c.jumps.map(j => j.id === jumpId ? { ...j, [field]: value } : j)
                } : c
            )
        }))
    }

    const removeJump = (categoryId, jumpId) => {
        setData(prev => ({
            ...prev,
            expenseCategories: prev.expenseCategories.map(c =>
                c.id === categoryId ? { ...c, jumps: c.jumps.filter(j => j.id !== jumpId) } : c
            )
        }))
    }

    return {
        data,
        projections,
        expandedCategories,
        actions: {
            updateCategory,
            toggleAdvanced,
            addJump,
            updateJump,
            removeJump
        }
    }
}
