import { useState, useEffect, useRef } from 'react'
import { storage } from '../../../core'
import { calculateExpenseProjections } from '../Expenses.calc'
import { JUMP_DESCRIPTIONS, DEFAULT_EXPENSE_CATEGORIES, JUMP_TYPES } from '../config/expensesSchema'

export function useExpensesData() {
    // Load profile for inflation rate
    const profile = storage.load('profile') || {}
    const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7
    const incomeData = storage.load('income')

    // Initialize state
    const [data, setData] = useState(() => {
        const saved = storage.load('expenses')
        if (saved && saved.expenseCategories && saved.expenseCategories.length > 0) {
            // Migration: Ensure amountType exists if loading old data
            const migratedCategories = saved.expenseCategories.map(cat => ({
                ...cat,
                amountType: cat.amountType || 'percent', // Default to percent as requested
                percentOfIncome: cat.percentOfIncome || '',
                annualAmount: cat.annualAmount || ''
            }))
            return { ...saved, expenseCategories: migratedCategories }
        }

        // Initialize with new defaults
        const defaultCategories = DEFAULT_EXPENSE_CATEGORIES.map(cat => ({
            id: cat.id,
            category: cat.name, // keeping 'category' key for compatibility if needed, or just use name
            name: cat.name,
            annualAmount: cat.defaultAmount || '',
            amountType: 'percent',
            percentOfIncome: cat.defaultPercent || '',
            growthRate: inflationRate,
            jumps: []
        }))

        return {
            expenseCategories: defaultCategories
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

                // Handle amountType switch
                if (field === 'amountType') {
                    // When switching, we might want to clear the other value or calculate it?
                    // For now, just switch the type.
                    return { ...cat, amountType: value }
                }

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
        // Default jump type
        const newJump = {
            id: `jump-${Date.now()}`,
            year: '',
            type: JUMP_TYPES.CHANGE_PERCENT.value, // Default to change by %
            value: '',
            description: desc
        }

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

    // Add new category action (since we are moving to a list view)
    const addCategory = () => {
        const newCategory = {
            id: `cat-${Date.now()}`,
            name: 'New Expense',
            annualAmount: '',
            amountType: 'percent',
            percentOfIncome: '',
            growthRate: inflationRate,
            jumps: []
        }

        setData(prev => ({
            ...prev,
            expenseCategories: [...prev.expenseCategories, newCategory]
        }))
    }

    const removeCategory = (categoryId) => {
        setData(prev => ({
            ...prev,
            expenseCategories: prev.expenseCategories.filter(c => c.id !== categoryId)
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
            removeJump,
            addCategory,
            removeCategory
        }
    }
}
