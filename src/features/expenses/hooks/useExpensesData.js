import { useState, useEffect, useRef } from 'react'
import { storage } from '../../../core'
import { calculateExpenseProjections } from '../Expenses.calc'
import { calculateIncomeProjections } from '../../income/Income.calc'
import { JUMP_DESCRIPTIONS, DEFAULT_EXPENSE_CATEGORIES, JUMP_TYPES } from '../config/expensesSchema'

export function useExpensesData() {
    // Calculate years to retirement from profile
    const getYearsToRetirement = () => {
        const profile = storage.load('profile') || {}
        return profile.retirementAge && profile.age
            ? profile.retirementAge - profile.age
            : 30
    }
    const yearsToRetirement = getYearsToRetirement()

    // Load profile for inflation rate (needed for new categories)
    const profile = storage.load('profile') || {}
    const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7

    // Initialize state
    const [data, setData] = useState(() => {
        const saved = storage.load('expenses')
        if (saved && saved.expenseCategories && saved.expenseCategories.length > 0) {
            // Migration: Ensure amountType exists and update names from schema (to remove emojis)
            const migratedCategories = saved.expenseCategories.map(cat => {
                // Find matching default category to get the clean name
                const defaultCat = DEFAULT_EXPENSE_CATEGORIES.find(d => d.id === cat.id)
                return {
                    ...cat,
                    name: defaultCat ? defaultCat.name : cat.name, // Update name if it's a default category
                    amountType: cat.amountType || 'percent', // Default to percent as requested
                    percentOfIncome: cat.percentOfIncome || '',
                    annualAmount: cat.annualAmount || ''
                }
            })

            // Reorder categories based on DEFAULT_EXPENSE_CATEGORIES order
            const reorderedCategories = DEFAULT_EXPENSE_CATEGORIES
                .map(defaultCat => migratedCategories.find(cat => cat.id === defaultCat.id))
                .filter(cat => cat !== undefined) // Only include categories that exist in saved data

            // Add any custom categories (not in defaults) at the end
            const customCategories = migratedCategories.filter(cat =>
                !DEFAULT_EXPENSE_CATEGORIES.find(d => d.id === cat.id)
            )

            const finalCategories = [...reorderedCategories, ...customCategories]

            // Ensure oneTimeExpenses exists
            return {
                ...saved,
                expenseCategories: finalCategories,
                oneTimeExpenses: saved.oneTimeExpenses || []
            }
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
            expenseCategories: defaultCategories,
            oneTimeExpenses: []
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
    const [projections, setProjections] = useState(() => {
        const profile = storage.load('profile') || {}
        const incomeData = storage.load('income')
        // Calculate income projections first
        const incomeProjections = incomeData ? calculateIncomeProjections(incomeData, profile) : null
        return calculateExpenseProjections(data, profile, incomeProjections)
    })

    useEffect(() => {
        const timer = setTimeout(() => {
            const profile = storage.load('profile') || {}
            const incomeData = storage.load('income')
            // Calculate income projections first
            const incomeProjections = incomeData ? calculateIncomeProjections(incomeData, profile) : null
            setProjections(calculateExpenseProjections(data, profile, incomeProjections))
        }, 300) // 300ms debounce

        return () => clearTimeout(timer)
    }, [data])

    // Actions
    const updateCategory = (categoryId, field, value) => {
        setData(prev => ({
            ...prev,
            expenseCategories: prev.expenseCategories.map(cat => {
                if (cat.id !== categoryId) return cat

                // Handle amountType switch
                if (field === 'amountType') {
                    // When switching, ensure the other value is initialized if missing to prevent NaN
                    // But mainly, we just switch the type. The calculation logic should handle empty strings as 0.
                    return {
                        ...cat,
                        amountType: value,
                        // Optional: clear the other field or keep it? Keeping it allows switching back.
                        // But we must ensure the active field has a valid value or is empty string (which calc handles)
                    }
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

    const moveJump = (jumpId, oldCategoryId, newCategoryId) => {
        setData(prev => {
            // Find the jump in the old category
            const oldCategory = prev.expenseCategories.find(c => c.id === oldCategoryId)
            const jumpToMove = oldCategory?.jumps.find(j => j.id === jumpId)

            if (!jumpToMove) return prev

            return {
                ...prev,
                expenseCategories: prev.expenseCategories.map(c => {
                    if (c.id === oldCategoryId) {
                        // Remove from old
                        return { ...c, jumps: c.jumps.filter(j => j.id !== jumpId) }
                    }
                    if (c.id === newCategoryId) {
                        // Add to new
                        return { ...c, jumps: [...c.jumps, jumpToMove] }
                    }
                    return c
                })
            }
        })
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

    // One-time expense actions
    const addOneTimeExpense = () => {
        const newExpense = {
            id: `onetime-${Date.now()}`,
            year: '',
            description: '',
            amount: ''
        }

        setData(prev => ({
            ...prev,
            oneTimeExpenses: [...prev.oneTimeExpenses, newExpense]
        }))
    }

    const updateOneTimeExpense = (expenseId, field, value) => {
        setData(prev => ({
            ...prev,
            oneTimeExpenses: prev.oneTimeExpenses.map(e =>
                e.id === expenseId ? { ...e, [field]: value } : e
            )
        }))
    }

    const removeOneTimeExpense = (expenseId) => {
        setData(prev => ({
            ...prev,
            oneTimeExpenses: prev.oneTimeExpenses.filter(e => e.id !== expenseId)
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
            moveJump,
            addCategory,
            removeCategory,
            addOneTimeExpense,
            updateOneTimeExpense,
            removeOneTimeExpense
        }
    }
}
