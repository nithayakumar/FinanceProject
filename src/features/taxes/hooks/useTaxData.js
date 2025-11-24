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
    getFederalTaxLadder
} from '../csvTaxLadders'

const FILING_STATUS_OPTIONS = [
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married Filing Jointly' },
    { value: 'Separate', label: 'Married Filing Separately' },
    { value: 'Head_of_Household', label: 'Head of Household' }
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
    const remapOptions = FILING_STATUS_OPTIONS.filter(option => option.value !== currentCsvStatus)

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

        // Calculate total income excluding 401k contributions
        const totalSalary = incomeData.incomeStreams.reduce((sum, stream) => {
            const annualIncome = Number(stream.annualIncome) || 0
            const individual401k = Number(stream.individual401k) || 0
            return sum + annualIncome - individual401k
        }, 0)

        // Auto-populate with data from profile and income
        const taxData = {
            filingType: mapFilingStatus(profile.filingStatus),
            filingStatus: profile.filingStatus || 'Single',
            state: userState,
            country: userCountry,
            incomes: totalSalary > 0 ? [{
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
        const stateHasStatus = stateFilingStatuses.includes(csvFilingStatus) || stateHasAll || stateFilingStatuses.length === 0
        const federalHasStatus = federalFilingStatuses.includes(csvFilingStatus) || federalHasAll

        if (!stateHasStatus || !federalHasStatus) {
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
                // Transform result to match legacy format for display
                return {
                    income: csvResult.grossIncome,
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
                    effectiveRate: csvResult.effectiveRate,
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

        // Load filing status remapping for this state
        const remapping = storage.load('filingStatusRemapping') || {}
        const storedRemap = remapping[userState]?.[profile.filingStatus]
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

    return {
        data,
        calculations,
        isSaved,
        filingStatusRemap,
        missingFilingStatus,
        remapOptions,
        handleRemapChange,
        FILING_STATUS_OPTIONS
    }
}
