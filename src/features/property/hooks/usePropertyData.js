import { useState, useEffect, useRef } from 'react'
import { storage } from '../../../core'
import { DEFAULT_PROPERTY_STATE, PROPERTY_MODES } from '../config/propertySchema'
import { calculatePropertyProjections, calculateMonthlyPayment } from '../Property.calc'

export function usePropertyData() {
    // Load initial property state
    const [data, setData] = useState(() => {
        const saved = storage.load('property')
        // Deep merge defaults to ensure all fields exist even if saved state is partial
        return {
            ...DEFAULT_PROPERTY_STATE,
            ...saved,
            details: { ...DEFAULT_PROPERTY_STATE.details, ...(saved?.details || {}) }
        }
    })

    // Load expenses state to control mode and sync housing data
    const [expensesData, setExpensesData] = useState(() => {
        return storage.load('expenses') || { expenseCategories: [], simpleMode: true }
    })

    const [projections, setProjections] = useState(null)

    // Auto-save property data
    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        storage.save('property', data)
    }, [data])

    // Calculate Projections
    useEffect(() => {
        const profile = storage.load('profile') || {}
        const calc = calculatePropertyProjections(data, profile)
        setProjections(calc)

        // Sync to Expenses ONLY if "Buy" or "Own" AND not simple mode
        // Actually, user said "Any change... reflected in Expense page".
        // Sync logic helps keep them consistent.
        // If we calculate a new Mortgage Payment in "Buy" mode, should we push that to Housing?
        // User: "The second card should be Current Expenses with ONLY the Housing category... Any change... reflected in Expense page"
        // So yes.

        // NOTE: We need to be careful about infinite loops if expenses updates trigger property updates.
        // But property page is the driver here.

    }, [data])

    // Actions
    const updateMode = (mode) => {
        setData(prev => ({ ...prev, mode }))
    }

    const updateDetails = (field, value) => {
        setData(prev => {
            const newData = {
                ...prev,
                details: { ...prev.details, [field]: value }
            }

            // Auto-calculate Mortgage Payment if in Buy mode and fields correct?
            // Or just let the UI/Calc handle it? 
            // The calc function handles projection. 
            // User said: "This will autogenerate the Mortgage Payment amount."
            // We can update the state with the calculated formatted amount for display if we want, 
            // but usually better to compute derived values or let the Calc output it.
            // However, for Syncing to Expenses, we need a concrete number.
            // We'll do a sync effect below.

            return newData
        })
    }

    // --- Expenses Sync Logic ---
    const updateHousingExpense = (field, value) => {
        // This updates the 'Housing' category in the Expenses storage
        // It mirrors the logic in useExpensesData

        // First, update local state mirror
        let newExpensesData = { ...expensesData }

        // Find housing category
        const housingIndex = newExpensesData.expenseCategories.findIndex(c => c.id === 'housing')

        if (housingIndex >= 0) {
            const cat = newExpensesData.expenseCategories[housingIndex]
            const updatedCat = { ...cat, [field]: value }
            newExpensesData.expenseCategories[housingIndex] = updatedCat

            // Save to storage
            setExpensesData(newExpensesData)
            storage.save('expenses', newExpensesData)
        }
    }

    // Explicit sync action (e.g. when Mortgage is calculated in Buy mode, apply to Housing)
    const syncMortgageToHousing = () => {
        if (data.mode === PROPERTY_MODES.BUY && !expensesData.simpleMode) {
            // Calc payment
            const { term, mortgageRate, homePrice, downPayment, downPaymentType } = data.details

            let loan = 0
            if (downPaymentType === 'percent') {
                loan = homePrice * (1 - (downPayment / 100))
            } else {
                loan = homePrice - downPayment
            }
            loan = Math.max(0, loan)

            const payment = calculateMonthlyPayment(loan, mortgageRate, term)
            const annual = payment * 12

            updateHousingExpense('annualAmount', Math.round(annual))
            updateHousingExpense('amountType', 'fixed')
        }
    }

    // --- Housing Jump Management ---
    const updateHousingJumps = (action, payload) => {
        let newExpensesData = { ...expensesData }
        const housingIndex = newExpensesData.expenseCategories.findIndex(c => c.id === 'housing')

        if (housingIndex >= 0) {
            const cat = { ...newExpensesData.expenseCategories[housingIndex] }
            let jumps = [...(cat.jumps || [])]

            if (action === 'add') {
                jumps.push({
                    id: Date.now().toString(),
                    year: 1, // Default to Relative Year 1
                    type: 'change_percent',
                    value: 0
                })
            } else if (action === 'update') {
                const { jumpId, field, value } = payload
                const jumpIndex = jumps.findIndex(j => j.id === jumpId)
                if (jumpIndex >= 0) {
                    jumps[jumpIndex] = { ...jumps[jumpIndex], [field]: value }
                }
            } else if (action === 'remove') {
                jumps = jumps.filter(j => j.id !== payload.jumpId)
            }

            cat.jumps = jumps
            newExpensesData.expenseCategories[housingIndex] = cat

            setExpensesData(newExpensesData)
            storage.save('expenses', newExpensesData)
        }
    }

    return {
        data,
        expensesData,
        projections,
        actions: {
            updateMode,
            updateDetails,
            updateHousingExpense,
            syncMortgageToHousing,
            updateHousingJumps
        }
    }
}
