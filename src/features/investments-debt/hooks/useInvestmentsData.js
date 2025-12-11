import { useState, useEffect, useRef } from 'react'
import {
    storage,
    INVESTMENTS_CONFIG,
    createDefaultInvestment,
    createDefault401k
} from '../../../core'
import { validateInvestments } from '../InvestmentsDebt.calc'
import { calculateGapProjections } from '../../gap/Gap.calc'
import { calculateIncomeProjections } from '../../income/Income.calc'
import { calculateExpenseProjections } from '../../expenses/Expenses.calc'

export function useInvestmentsData() {
    // Load initial data
    const [data, setData] = useState(() => {
        const saved = storage.load('investmentsDebt')
        const profile = storage.load('profile') || {}
        const incomeData = storage.load('income') || { incomeStreams: [] }

        // Calculate total company 401k contribution from all income streams
        const totalCompany401k = incomeData.incomeStreams.reduce((sum, stream) => {
            return sum + (Number(stream.company401k) || 0)
        }, 0)

        if (saved) {
            const profileTargetCash = profile.targetCash || saved.targetCash || 0

            // Ensure at least one investment always exists
            const investments = saved.investments || []

            return {
                ...saved,
                targetCash: profileTargetCash,
                investments,
                retirement401k: {
                    ...saved.retirement401k,
                    companyContribution: totalCompany401k
                }
            }
        } else {
            // Initialize from profile
            const currentCash = profile.currentCash || 0
            const targetCash = profile.targetCash || 0
            const totalInvestments = profile.currentSavings || 0
            const investmentValue = Math.round(totalInvestments / 3)

            const preloadedInvestments = totalInvestments > 0 ? [
                createDefaultInvestment(1, investmentValue, 33.33),
                createDefaultInvestment(2, investmentValue, 33.33),
                createDefaultInvestment(3, investmentValue, 33.34)
            ] : [] // Allow empty investments

            return {
                currentCash: currentCash,
                targetCash: targetCash,
                retirement401k: createDefault401k(totalCompany401k),
                investments: preloadedInvestments
            }
        }
    })

    const [errors, setErrors] = useState({})
    const [projections, setProjections] = useState(() => {
        try {
            // Calculate initial projections synchronously to avoid loading delay
            const profile = storage.load('profile') || {}
            const incomeData = storage.load('income')
            const expensesData = storage.load('expenses')
            const propertyData = storage.load('property') || {}

            const hasIncome = incomeData?.incomeStreams?.length > 0
            const hasExpenses = expensesData?.expenseCategories?.length > 0

            if (!hasIncome || !hasExpenses) {
                return null
            }

            const yearsToRetirement = (profile.retirementAge && profile.age)
                ? profile.retirementAge - profile.age
                : 30

            const enrichedProfile = { ...profile, yearsToRetirement }

            // Get current data value from the useState initializer above
            const currentData = storage.load('investmentsDebt')
            if (!currentData) return null

            const incomeProjections = calculateIncomeProjections(incomeData, enrichedProfile)
            const expenseProjections = calculateExpenseProjections(
                expensesData,
                enrichedProfile,
                incomeProjections.projections
            )

            const incomeWithProjections = { ...incomeData, projections: incomeProjections.projections }
            const expensesWithProjections = { ...expensesData, projections: expenseProjections.projections }

            return calculateGapProjections(
                incomeWithProjections,
                expensesWithProjections,
                currentData,
                propertyData,
                enrichedProfile
            )
        } catch (err) {
            console.error("Initial investments calculation error:", err)
            return null
        }
    })
    const [isCalculating, setIsCalculating] = useState(false)
    const isInitialCalculation = useRef(true)

    // Auto-save effect
    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        storage.save('investmentsDebt', data)

        // Sync to profile
        const profile = storage.load('profile') || {}
        profile.currentCash = data.currentCash
        profile.targetCash = data.targetCash

        const nonCashSavings = (Number(data.retirement401k.currentValue) || 0) +
            data.investments.reduce((sum, inv) => sum + (Number(inv.currentValue) || 0), 0)
        profile.currentSavings = nonCashSavings
        storage.save('profile', profile)

    }, [data])

    // Debounced Calculation
    useEffect(() => {
        const calculate = () => {
            // Only show loading state for subsequent calculations, not initial load
            if (!isInitialCalculation.current) {
                setIsCalculating(true)
            }

            const profile = storage.load('profile') || {}
            const incomeData = storage.load('income')
            const expensesData = storage.load('expenses')
            const propertyData = storage.load('property') || {}

            // Check if we have actual data (not just empty objects)
            const hasIncome = incomeData?.incomeStreams?.length > 0
            const hasExpenses = expensesData?.expenseCategories?.length > 0

            if (!hasIncome || !hasExpenses) {
                setProjections(null)
                setIsCalculating(false)
                isInitialCalculation.current = false
                return
            }

            const yearsToRetirement = (profile.retirementAge && profile.age)
                ? profile.retirementAge - profile.age
                : 30

            const enrichedProfile = { ...profile, yearsToRetirement }

            try {
                // 1. Income
                const incomeProjections = calculateIncomeProjections(incomeData, enrichedProfile)

                // 2. Expenses
                const expenseProjections = calculateExpenseProjections(
                    expensesData,
                    enrichedProfile,
                    incomeProjections.projections
                )

                // 3. Gap (Investments)
                const incomeWithProjections = { ...incomeData, projections: incomeProjections.projections }
                const expensesWithProjections = { ...expensesData, projections: expenseProjections.projections }

                const gapProjections = calculateGapProjections(
                    incomeWithProjections,
                    expensesWithProjections,
                    data,
                    propertyData,
                    enrichedProfile
                )

                setProjections(gapProjections)
            } catch (err) {
                console.error("Investments calculation error:", err)
                // Optionally set error state or fallback
            } finally {
                setIsCalculating(false)
                isInitialCalculation.current = false
            }
        }

        // Use shorter delay for initial calculation (100ms), longer for subsequent edits (300ms)
        const delay = isInitialCalculation.current ? 100 : 300
        const timer = setTimeout(calculate, delay)
        return () => clearTimeout(timer)
    }, [data])

    // Actions
    const updateField = (field, value) => {
        setData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
    }

    const update401k = (field, value) => {
        setData(prev => ({
            ...prev,
            retirement401k: { ...prev.retirement401k, [field]: value }
        }))
        if (errors[`401k-${field}`]) setErrors(prev => ({ ...prev, [`401k-${field}`]: '' }))
    }

    const addInvestment = () => {
        if (data.investments.length >= INVESTMENTS_CONFIG.MAX_INVESTMENTS) return

        const currentCount = data.investments.length
        const newCount = currentCount + 1
        const newAllocation = Number((100 / newCount).toFixed(2)) // e.g. 33.33
        const remainingAllocation = 100 - newAllocation // e.g. 66.67

        // Adjust existing investments proportionally
        // New % = Old % * (Remaining / 100)
        const updatedInvestments = data.investments.map(inv => ({
            ...inv,
            portfolioPercent: Number((inv.portfolioPercent * (remainingAllocation / 100)).toFixed(2))
        }))

        // Get growth rate from first investment if it exists
        const defaultGrowthRate = currentCount > 0
            ? data.investments[0].growthRate
            : INVESTMENTS_CONFIG.DEFAULT_GROWTH_RATE

        // Create new investment
        const newInvestment = createDefaultInvestment(newCount, 0, newAllocation)
        newInvestment.growthRate = defaultGrowthRate

        // Handle rounding error on last item (ensure sum is 100)
        // Sum all updated + new, check difference from 100, apply to new investment
        const currentSum = updatedInvestments.reduce((sum, inv) => sum + inv.portfolioPercent, 0)
        newInvestment.portfolioPercent = Number((100 - currentSum).toFixed(2))

        setData(prev => ({ ...prev, investments: [...updatedInvestments, newInvestment] }))
    }

    const removeInvestment = (id) => {
        const removedInv = data.investments.find(i => i.id === id)
        if (!removedInv) return

        const removedAllocation = removedInv.portfolioPercent || 0
        const remainingInvestments = data.investments.filter(i => i.id !== id)

        if (remainingInvestments.length > 0) {
            // If we removed an investment with 0 allocation, no rebalancing needed (avoid divide by zero)
            // Otherwise scale up remaining investments
            const currentSum = remainingInvestments.reduce((sum, inv) => sum + (inv.portfolioPercent || 0), 0)

            if (currentSum > 0) {
                const scaleFactor = 100 / currentSum

                const updatedInvestments = remainingInvestments.map((inv, index) => {
                    // For last item, handle rounding to ensure exactly 100
                    if (index === remainingInvestments.length - 1) {
                        const othersSum = remainingInvestments
                            .slice(0, index)
                            .reduce((sum, i) => sum + Number((i.portfolioPercent * scaleFactor).toFixed(2)), 0)
                        return { ...inv, portfolioPercent: Number((100 - othersSum).toFixed(2)) }
                    }
                    return { ...inv, portfolioPercent: Number((inv.portfolioPercent * scaleFactor).toFixed(2)) }
                })

                setData(prev => ({ ...prev, investments: updatedInvestments }))
            } else {
                // If remaining sum is 0 (e.g. all were 0), set first one to 100
                const updatedInvestments = remainingInvestments.map((inv, index) =>
                    index === 0 ? { ...inv, portfolioPercent: 100 } : inv
                )
                setData(prev => ({ ...prev, investments: updatedInvestments }))
            }
        } else {
            setData(prev => ({ ...prev, investments: [] }))
        }
    }

    const updateInvestment = (id, field, value) => {
        setData(prev => ({
            ...prev,
            investments: prev.investments.map(inv => inv.id === id ? { ...inv, [field]: value } : inv)
        }))
        const index = data.investments.findIndex(i => i.id === id)
        if (errors[`${index}-${field}`]) setErrors(prev => ({ ...prev, [`${index}-${field}`]: '' }))
    }

    return {
        data,
        projections,
        errors,
        isCalculating,
        actions: {
            updateField,
            update401k,
            addInvestment,
            removeInvestment,
            updateInvestment
        }
    }
}
