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
            const investments = saved.investments && saved.investments.length > 0
                ? saved.investments
                : [createDefaultInvestment(1, 0, 7)]

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
            ] : [createDefaultInvestment(1, 0, 7)] // Always start with at least one

            return {
                currentCash: currentCash,
                targetCash: targetCash,
                retirement401k: createDefault401k(totalCompany401k),
                investments: preloadedInvestments
            }
        }
    })

    const [errors, setErrors] = useState({})
    const [projections, setProjections] = useState(null)
    const [isCalculating, setIsCalculating] = useState(false)

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
            setIsCalculating(true)
            const profile = storage.load('profile') || {}
            const incomeData = storage.load('income')
            const expensesData = storage.load('expenses')

            if (!incomeData || !expensesData) {
                setIsCalculating(false)
                return
            }

            const yearsToRetirement = (profile.retirementAge && profile.age)
                ? profile.retirementAge - profile.age
                : 30

            const enrichedProfile = { ...profile, yearsToRetirement }

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
                enrichedProfile
            )

            setProjections(gapProjections)
            setIsCalculating(false)
        }

        const timer = setTimeout(calculate, 500) // 500ms debounce for heavier calc
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
        const newInvestment = createDefaultInvestment(data.investments.length + 1, 0, 0)
        setData(prev => ({ ...prev, investments: [...prev.investments, newInvestment] }))
    }

    const removeInvestment = (id) => {
        // Don't allow removing the last investment
        if (data.investments.length <= 1) return
        setData(prev => ({ ...prev, investments: prev.investments.filter(i => i.id !== id) }))
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
