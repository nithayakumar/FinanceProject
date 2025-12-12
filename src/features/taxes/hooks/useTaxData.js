import { useState, useEffect, useCallback } from 'react'
import { storage } from "../../../core/storage"
import { calculateTaxesCSV } from '../csvTaxCalculator'
import {
    initializeTaxLadders,
    getCountryForState,
    getFilingStatusesForTaxType,
    mapFilingStatusToCSV,
    mapFilingStatusFromCSV,
    getStateTaxLadder,
    getFederalTaxLadder,
    getStandardDeduction,
    getTaxCredit
} from '../csvTaxLadders'

const FILING_STATUS_OPTIONS = [
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Couple' }
]

export const getFilingStatusLabel = (value) => {
    return FILING_STATUS_OPTIONS.find(option => option.value === value)?.label || value
}

const deriveFallbackStatus = (scope, location, csvStatus) => {
    const ladder = scope === 'state'
        ? getStateTaxLadder(location, 'Income', csvStatus)
        : getFederalTaxLadder(location, 'Income', csvStatus)

    if (ladder && ladder.filingStatus && ladder.filingStatus !== csvStatus) {
        // Convert CSV format to user-friendly format before returning
        return mapFilingStatusFromCSV(ladder.filingStatus)
    }
    return null
}

export function useTaxData() {
    const [calculations, setCalculations] = useState(null)
    const [isSaved, setIsSaved] = useState(false)
    const [filingStatusRemap, setFilingStatusRemap] = useState('')
    const [missingFilingStatus, setMissingFilingStatus] = useState(null)
    const [standardDeductions, setStandardDeductions] = useState({
        federal: null,  // null means use default
        state: null     // null means use default
    })
    const [prevStandardDeductions, setPrevStandardDeductions] = useState({
        federal: null,
        state: null
    })
    const [hasCustomStandardDeductions, setHasCustomStandardDeductions] = useState({
        federal: false,
        state: false
    })
    const [taxCredits, setTaxCredits] = useState({
        federal: null,  // null means use default
        state: null     // null means use default
    })
    const [prevTaxCredits, setPrevTaxCredits] = useState({
        federal: null,
        state: null
    })
    const [hasCustomTaxCredits, setHasCustomTaxCredits] = useState({
        federal: false,
        state: false
    })
    const [data, setData] = useState({
        filingType: 'single',
        filingStatus: 'Single',
        state: 'California',
        country: 'USA',
        incomes: []
    })

    // Helper to map filing status from profile to tax format
    const mapFilingStatus = (status) => {
        const mapping = {
            'Single': 'single',
            'Married Filing Jointly': 'married',
            'Married Filing Separately': 'separate',
            'Head of Household': 'head'
        }
        return mapping[status] || 'single'
    }

    const currentCsvStatus = mapFilingStatusToCSV(data.filingStatus || 'Single')
    // Canada only has Single filing status
    const availableOptions = data.country === 'Canada'
        ? FILING_STATUS_OPTIONS.filter(option => option.value === 'Single')
        : FILING_STATUS_OPTIONS
    const remapOptions = availableOptions.filter(option => option.value !== currentCsvStatus)


    // Load profile and income data on mount, then auto-calculate
    useEffect(() => {
        initializeTaxLadders()

        const profile = storage.load('profile') || {}
        const incomeData = storage.load('income') || { incomeStreams: [] }

        // Get state and country from profile
        const userState = profile.location || 'California'
        const userCountry = profile.country || getCountryForState(userState) || 'USA'
        const userInflationRate = (profile.inflationRate || 2.7) / 100
        const currentYear = new Date().getFullYear()
        const csvFilingStatus = mapFilingStatusToCSV(profile.filingStatus || 'Single')

        // Calculate total gross income and 401k contributions
        const totalGrossIncome = incomeData.incomeStreams.reduce((sum, stream) => {
            return sum + (Number(stream.annualIncome) || 0)
        }, 0)

        const total401k = incomeData.incomeStreams.reduce((sum, stream) => {
            return sum + (Number(stream.individual401k) || 0)
        }, 0)

        const totalSalary = totalGrossIncome - total401k

        // Auto-populate with data from profile and income
        const taxData = {
            filingType: mapFilingStatus(profile.filingStatus),
            filingStatus: profile.filingStatus || 'Single',
            state: userState,
            country: userCountry,
            incomes: totalGrossIncome > 0 ? [{
                id: 'salary-income',
                description: 'Total Annual Income (excl. 401k)',
                amount: totalSalary,
                incomeType: 'salary'
            }] : []
        }

        setData(taxData)

        // Check filing status availability for the user's jurisdiction
        const stateFilingStatuses = getFilingStatusesForTaxType('State_Province', userState, 'Income')
        const federalFilingStatuses = getFilingStatusesForTaxType('Federal', userCountry, 'Income')

        const stateHasAll = stateFilingStatuses.includes('All')
        const federalHasAll = federalFilingStatuses.includes('All')

        // If "All" is available, it applies to all filing statuses (e.g., flat tax states like Arizona)
        // Only show error if status is explicitly missing AND no "All" fallback exists
        const stateHasStatus = stateFilingStatuses.includes(csvFilingStatus) || stateHasAll || stateFilingStatuses.length === 0
        const federalHasStatus = federalFilingStatuses.includes(csvFilingStatus) || federalHasAll

        // Only set missing status if the specific filing status is not available AND there's no "All" option
        // For states with only "All" (like Arizona), we should never show an error
        const shouldShowMissingStatus = (!stateHasStatus || !federalHasStatus) && !stateHasAll && !federalHasAll

        if (shouldShowMissingStatus) {
            const scope = !stateHasStatus ? 'state' : 'federal'
            const location = scope === 'state' ? userState : userCountry
            const availableStatuses = scope === 'state' ? stateFilingStatuses : federalFilingStatuses
            // Convert CSV format fallback to user-friendly format
            const csvFallback = deriveFallbackStatus(scope === 'state' ? 'state' : 'federal', location, csvFilingStatus)
                || (userCountry === 'Canada' ? 'Single' : availableStatuses[0])
                || null
            const fallback = csvFallback ? (typeof csvFallback === 'string' && csvFallback.includes('_') ? mapFilingStatusFromCSV(csvFallback) : csvFallback) : null

            setMissingFilingStatus({
                status: profile.filingStatus || 'Single',
                csvStatus: csvFilingStatus,
                location,
                country: userCountry,
                availableStatuses: availableStatuses || [],
                scope,
                suggestedStatus: fallback,
                suggestedLabel: fallback ? getFilingStatusLabel(fallback) : null
            })
        } else {
            setMissingFilingStatus(null)
        }

        // Auto-calculate taxes
        if (taxData.incomes.length > 0) {
            // Save to localStorage
            storage.save('taxes', taxData)
            setIsSaved(true)

            const taxCalculations = taxData.incomes.map(income => {
                const csvResult = calculateTaxesCSV(
                    income.amount,
                    income.incomeType,
                    taxData.filingStatus,
                    taxData.state,
                    currentYear,
                    userInflationRate
                )
                // Calculate effective rate based on GROSS income (before 401k deduction)
                const effectiveRate = totalGrossIncome > 0 ? (csvResult.totalTax / totalGrossIncome) : 0

                // Transform result to match legacy format for display
                return {
                    income: totalGrossIncome,  // Use gross income for display
                    stateTax: csvResult.stateTax.amount,
                    federalTax: csvResult.federalTax.amount,
                    fica: {
                        socialSecurity: csvResult.payrollTaxes.socialSecurity,
                        medicare: csvResult.payrollTaxes.medicare,
                        additionalMedicare: csvResult.payrollTaxes.additionalMedicare,
                        cpp: csvResult.payrollTaxes.cpp,
                        ei: csvResult.payrollTaxes.ei,
                        total: csvResult.payrollTaxes.total
                    },
                    totalTax: csvResult.totalTax,
                    effectiveRate: effectiveRate,  // Use recalculated rate
                    stateTaxBreakdown: csvResult.stateTax.breakdown || [],
                    federalTaxBreakdown: csvResult.federalTax.breakdown || [],
                    actualStateFilingType: taxData.filingType,
                    actualFederalFilingType: taxData.filingType,
                    country: csvResult.country
                }
            })

            // Calculate totals
            const totals = {
                totalIncome: taxCalculations.reduce((sum, calc) => sum + calc.income, 0),
                totalStateTax: taxCalculations.reduce((sum, calc) => sum + calc.stateTax, 0),
                totalFederalTax: taxCalculations.reduce((sum, calc) => sum + calc.federalTax, 0),
                totalFICA: taxCalculations.reduce((sum, calc) => sum + calc.fica.total, 0),
                totalTax: taxCalculations.reduce((sum, calc) => sum + calc.totalTax, 0)
            }
            totals.effectiveRate = totals.totalIncome > 0 ? (totals.totalTax / totals.totalIncome) : 0

            // Calculate Marginal Rate (simplified: sum of top bracket rates from federal + state)
            // Note: This is an approximation. Ideally we'd look up the specific bracket for the total income.
            const marginalStateRate = taxCalculations[0]?.stateTaxBreakdown.length > 0
                ? taxCalculations[0].stateTaxBreakdown[taxCalculations[0].stateTaxBreakdown.length - 1].rate
                : 0
            const marginalFederalRate = taxCalculations[0]?.federalTaxBreakdown.length > 0
                ? taxCalculations[0].federalTaxBreakdown[taxCalculations[0].federalTaxBreakdown.length - 1].rate
                : 0
            totals.marginalRate = marginalStateRate + marginalFederalRate

            setCalculations({
                individual: taxCalculations,
                totals
            })
        }

        // Load custom standard deductions from storage
        const customDeductions = storage.load('customStandardDeductions') || {}
        const jurisdictionKey = `${userCountry}_${userState}_${csvFilingStatus}`
        const savedDeductions = customDeductions[jurisdictionKey]

        if (savedDeductions) {
            const deductions = {
                federal: savedDeductions.federal ?? null,
                state: savedDeductions.state ?? null
            }
            const hasCustom = {
                federal: savedDeductions.federal !== null && savedDeductions.federal !== undefined,
                state: savedDeductions.state !== null && savedDeductions.state !== undefined
            }
            console.log('📊 Loading saved deductions:', {
                savedDeductions,
                deductions,
                hasCustom,
                jurisdictionKey
            })
            setStandardDeductions(deductions)
            setPrevStandardDeductions(deductions)
            setHasCustomStandardDeductions(hasCustom)
        } else {
            console.log('📊 No saved deductions found for:', jurisdictionKey)
            setStandardDeductions({ federal: null, state: null })
            setPrevStandardDeductions({ federal: null, state: null })
            setHasCustomStandardDeductions({ federal: false, state: false })
        }

        // Load custom tax credits from storage
        const customCredits = storage.load('customTaxCredits') || {}
        const savedCredits = customCredits[jurisdictionKey]

        if (savedCredits) {
            const credits = {
                federal: savedCredits.federal ?? null,
                state: savedCredits.state ?? null
            }
            setTaxCredits(credits)
            setPrevTaxCredits(credits)
            setHasCustomTaxCredits({
                federal: savedCredits.federal !== null && savedCredits.federal !== undefined,
                state: savedCredits.state !== null && savedCredits.state !== undefined
            })
        } else {
            setTaxCredits({ federal: null, state: null })
            setPrevTaxCredits({ federal: null, state: null })
            setHasCustomTaxCredits({ federal: false, state: false })
        }

        // Load filing status remapping for this state
        const remapping = storage.load('filingStatusRemapping') || {}
        const storedRemap = remapping[userState]?.[profile.filingStatus]

        // Apply stored remapping if it exists and is different from current filing status
        // This allows manual overrides even when both filing statuses are available
        if (storedRemap && storedRemap !== csvFilingStatus) {
            // Convert CSV format to user-friendly format if needed (for backwards compatibility)
            const userFriendlyRemap = storedRemap.includes('_') ? mapFilingStatusFromCSV(storedRemap) : storedRemap
            setFilingStatusRemap(userFriendlyRemap)
        } else {
            setFilingStatusRemap('')
        }
    }, [])

    // Handle filing status remapping change
    const handleRemapChange = (targetStatus) => {
        const normalizedTarget = targetStatus || ''
        setFilingStatusRemap(normalizedTarget)

        // Save to storage
        const remapping = storage.load('filingStatusRemapping') || {}
        const stateKey = data.state
        const profileStatusKey = data.filingStatus || 'Single'

        if (!remapping[stateKey]) {
            remapping[stateKey] = {}
        }

        const currentCsvStatus = mapFilingStatusToCSV(profileStatusKey)

        if (!normalizedTarget || normalizedTarget === currentCsvStatus) {
            delete remapping[stateKey][profileStatusKey]
            if (Object.keys(remapping[stateKey]).length === 0) {
                delete remapping[stateKey]
            }
        } else {
            remapping[stateKey][profileStatusKey] = normalizedTarget
        }

        storage.save('filingStatusRemapping', remapping)

        // Trigger recalculation by reloading (for now, to keep it simple as per original)
        window.location.reload()
    }

    // Handle standard deduction changes
    const handleStandardDeductionChange = (type, value, shouldReload = false) => {
        const newDeductions = {
            ...standardDeductions,
            [type]: value === '' || value === null ? null : Number(value)
        }

        console.log('🔄 handleStandardDeductionChange called:', {
            type,
            value,
            shouldReload,
            oldValue: standardDeductions[type],
            newValue: newDeductions[type],
            prevValue: prevStandardDeductions[type],
            willChange: newDeductions[type] !== prevStandardDeductions[type]
        })

        setStandardDeductions(newDeductions)

        // Update custom flag immediately to show/hide Reset button
        setHasCustomStandardDeductions({
            ...hasCustomStandardDeductions,
            [type]: newDeductions[type] !== null
        })

        // Save to storage
        const customDeductions = storage.load('customStandardDeductions') || {}
        const profile = storage.load('profile') || {}
        const csvFilingStatus = mapFilingStatusToCSV(profile.filingStatus || 'Single')
        const jurisdictionKey = `${data.country}_${data.state}_${csvFilingStatus}`

        if (newDeductions.federal === null && newDeductions.state === null) {
            // Both are default, remove from storage
            delete customDeductions[jurisdictionKey]
        } else {
            customDeductions[jurisdictionKey] = {
                federal: newDeductions.federal,
                state: newDeductions.state
            }
        }

        storage.save('customStandardDeductions', customDeductions)

        // Only reload if explicitly requested (blur) AND value changed
        if (shouldReload) {
            const changed = newDeductions[type] !== prevStandardDeductions[type]
            console.log('🔄 Reload decision:', {
                shouldReload,
                changed,
                newValue: newDeductions[type],
                prevValue: prevStandardDeductions[type]
            })

            if (changed) {
                console.log('✅ WILL RELOAD - value changed')
                // Small delay to ensure state update
                setTimeout(() => {
                    window.location.reload()
                }, 10)
            } else {
                console.log('⏭️  NO RELOAD - value unchanged')
                // Update prev to current even if no reload (for next comparison)
                setPrevStandardDeductions(newDeductions)
            }
        }
    }

    // Reset standard deduction to default
    const handleResetStandardDeduction = (type) => {
        console.log('🔄 Reset button clicked for:', type, {
            currentValue: standardDeductions[type],
            prevValue: prevStandardDeductions[type],
            hasCustomFlag: hasCustomStandardDeductions[type]
        })

        // Clear the custom value from storage
        const customDeductions = storage.load('customStandardDeductions') || {}
        const profile = storage.load('profile') || {}
        const csvFilingStatus = mapFilingStatusToCSV(profile.filingStatus || 'Single')
        const jurisdictionKey = `${data.country}_${data.state}_${csvFilingStatus}`

        if (customDeductions[jurisdictionKey]) {
            // Remove just this field
            delete customDeductions[jurisdictionKey][type]

            // If no custom values left, remove the entire key
            const remaining = customDeductions[jurisdictionKey]
            const federalIsEmpty = !remaining.federal && remaining.federal !== 0
            const stateIsEmpty = !remaining.state && remaining.state !== 0

            if (Object.keys(remaining).length === 0 || (federalIsEmpty && stateIsEmpty)) {
                delete customDeductions[jurisdictionKey]
            }

            storage.save('customStandardDeductions', customDeductions)
        }

        // Reload to recalculate
        window.location.reload()
    }

    // Get default standard deduction values
    const getDefaultStandardDeduction = (type) => {
        const csvFilingStatus = mapFilingStatusToCSV(data.filingStatus || 'Single')
        const region = type === 'federal' ? 'Federal' : 'State_Province'
        const jurisdiction = type === 'federal' ? data.country : data.state

        return getStandardDeduction(region, jurisdiction, csvFilingStatus, 1)
    }

    // Handle tax credit changes
    const handleTaxCreditChange = (type, value, shouldReload = false) => {
        const newCredits = {
            ...taxCredits,
            [type]: value === '' || value === null ? null : Number(value)
        }
        setTaxCredits(newCredits)

        // Update custom flag immediately to show/hide Reset button
        setHasCustomTaxCredits({
            ...hasCustomTaxCredits,
            [type]: newCredits[type] !== null
        })

        // Save to storage
        const customCredits = storage.load('customTaxCredits') || {}
        const profile = storage.load('profile') || {}
        const csvFilingStatus = mapFilingStatusToCSV(profile.filingStatus || 'Single')
        const jurisdictionKey = `${data.country}_${data.state}_${csvFilingStatus}`

        if (newCredits.federal === null && newCredits.state === null) {
            // Both are default, remove from storage
            delete customCredits[jurisdictionKey]
        } else {
            customCredits[jurisdictionKey] = {
                federal: newCredits.federal,
                state: newCredits.state
            }
        }

        storage.save('customTaxCredits', customCredits)

        // Only reload if explicitly requested (blur) AND value changed
        if (shouldReload) {
            const changed = newCredits[type] !== prevTaxCredits[type]
            if (changed) {
                // Small delay to ensure state update
                setTimeout(() => {
                    window.location.reload()
                }, 10)
            } else {
                // Update prev to current even if no reload (for next comparison)
                setPrevTaxCredits(newCredits)
            }
        }
    }

    // Reset tax credit to default
    const handleResetTaxCredit = (type) => {
        console.log('🔄 Reset tax credit clicked for:', type, {
            currentValue: taxCredits[type],
            prevValue: prevTaxCredits[type],
            hasCustomFlag: hasCustomTaxCredits[type]
        })

        // Clear the custom value from storage
        const customCredits = storage.load('customTaxCredits') || {}
        const profile = storage.load('profile') || {}
        const csvFilingStatus = mapFilingStatusToCSV(profile.filingStatus || 'Single')
        const jurisdictionKey = `${data.country}_${data.state}_${csvFilingStatus}`

        if (customCredits[jurisdictionKey]) {
            // Remove just this field
            delete customCredits[jurisdictionKey][type]

            // If no custom values left, remove the entire key
            const remaining = customCredits[jurisdictionKey]
            const federalIsEmpty = !remaining.federal && remaining.federal !== 0
            const stateIsEmpty = !remaining.state && remaining.state !== 0

            if (Object.keys(remaining).length === 0 || (federalIsEmpty && stateIsEmpty)) {
                delete customCredits[jurisdictionKey]
            }

            storage.save('customTaxCredits', customCredits)
        }

        // Reload to recalculate
        window.location.reload()
    }

    // Get default tax credit values
    const getDefaultTaxCredit = (type) => {
        const csvFilingStatus = mapFilingStatusToCSV(data.filingStatus || 'Single')
        const region = type === 'federal' ? 'Federal' : 'State_Province'
        const jurisdiction = type === 'federal' ? data.country : data.state

        return getTaxCredit(region, jurisdiction, csvFilingStatus, 1)
    }

    return {
        data,
        calculations,
        isSaved,
        filingStatusRemap,
        missingFilingStatus,
        remapOptions,
        handleRemapChange,
        standardDeductions,
        handleStandardDeductionChange,
        handleResetStandardDeduction,
        getDefaultStandardDeduction,
        hasCustomStandardDeductions,
        taxCredits,
        handleTaxCreditChange,
        handleResetTaxCredit,
        getDefaultTaxCredit,
        hasCustomTaxCredits,
        FILING_STATUS_OPTIONS
    }
}
