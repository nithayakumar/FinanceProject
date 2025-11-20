import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { storage } from "../../core/storage"
import { calculateTaxesCSV } from './csvTaxCalculator'
import {
  initializeTaxLadders,
  getCountryForState,
  getFilingStatusesForTaxType,
  mapFilingStatusToCSV,
  mapFilingStatusFromCSV,
  getStateTaxLadder,
  getFederalTaxLadder
} from './csvTaxLadders'

const FILING_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married Filing Jointly' },
  { value: 'Separate', label: 'Married Filing Separately' },
  { value: 'Head_of_Household', label: 'Head of Household' }
]

const getFilingStatusLabel = (value) => {
  return FILING_STATUS_OPTIONS.find(option => option.value === value)?.label || value
}

const formatFilingTypeLabel = (type) => {
  switch (type) {
    case 'married':
      return 'Married Filing Jointly'
    case 'separate':
      return 'Married Filing Separately'
    case 'head':
      return 'Head of Household'
    default:
      return 'Single'
  }
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

function Taxes() {
  const navigate = useNavigate()
  const [calculations, setCalculations] = useState(null)
  const [isSaved, setIsSaved] = useState(false)
  const [showReview, setShowReview] = useState(true)
  const [filingStatusRemap, setFilingStatusRemap] = useState('')
  const [missingFilingStatus, setMissingFilingStatus] = useState(null) // { status, state, country }
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

    console.log('📋 Auto-loaded from profile and income:', {
      filingStatus: profile.filingStatus,
      mappedFilingType: mapFilingStatus(profile.filingStatus),
      state: userState,
      country: userCountry,
      totalSalary
    })

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
        || availableStatuses[0]
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
      console.warn(`Filing status "${csvFilingStatus}" not available for ${location}`)
    } else {
      setMissingFilingStatus(null)
    }

    // Auto-calculate taxes
    if (taxData.incomes.length > 0) {
      console.group('💰 Auto-calculating Taxes')

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

      setCalculations({
        individual: taxCalculations,
        totals
      })

      console.log('✅ Taxes auto-calculated')
      console.groupEnd()
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
    console.log('📋 Saved filing status remapping:', remapping)

    // Trigger recalculation by reloading
    window.location.reload()
  }

  if (!calculations) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Tax Summary</h1>
          <p className="text-gray-600 mb-6">No income data found. Please add income in the Income section first.</p>

          <div className="max-w-md mx-auto text-left border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-3">Filing Status Review</h3>
            <p className="text-sm text-gray-600 mb-3">
              Choose the brackets we should use if your filing status isn't supported in {data.state}.
            </p>
            <select
              value={filingStatusRemap}
              onChange={(e) => handleRemapChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Not remapped</option>
              {remapOptions.map(status => (
                <option key={status.value} value={status.value}>
                  Use {status.label} brackets
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate('/income')}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Income →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tax Summary</h1>
          <p className="text-gray-600">
            Filing as: <span className="font-medium">{data.filingType === 'married' ? 'Married Filing Jointly' : data.filingType === 'separate' ? 'Married Filing Separately' : data.filingType === 'head' ? 'Head of Household' : 'Single'}</span>
            {' • '}
            <span className="font-medium">{data.state} ({data.country})</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">Auto-loaded from Personal Details and Income</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/custom-ladder"
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            Custom Ladder
          </Link>
          <button
            onClick={() => navigate('/tax-brackets')}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Manage Tax Brackets
          </button>
        </div>
      </div>

      {/* Filing Status Warning */}
      {missingFilingStatus && !filingStatusRemap && (
        <div className="mb-6 bg-amber-50 border border-amber-300 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-amber-600 text-xl mr-3">⚠️</span>
            <div className="flex-1">
              <p className="text-amber-900 font-medium mb-2">
                "{missingFilingStatus.status}" isn't available for {missingFilingStatus.location}.
              </p>
              <p className="text-amber-800 text-sm mb-3">
                We'll temporarily use {missingFilingStatus.suggestedLabel || 'the closest available'} brackets until you confirm your preference below.
              </p>
              {missingFilingStatus.suggestedStatus && (
                <button
                  onClick={() => handleRemapChange(missingFilingStatus.suggestedStatus)}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition"
                >
                  Accept & use {missingFilingStatus.suggestedLabel} brackets
                </button>
              )}
              {missingFilingStatus.availableStatuses.length > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Available filing statuses: {missingFilingStatus.availableStatuses.map(getFilingStatusLabel).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Status Banner */}
      {isSaved && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <span className="text-green-600 text-xl mr-3">✅</span>
          <div>
            <p className="text-green-900 font-medium">Data Auto-Calculated and Saved</p>
            <p className="text-green-700 text-sm">This section is ready for the Dashboard</p>
          </div>
        </div>
      )}

      {/* Filing Status Review */}
      <div className="mb-6 border border-gray-200 rounded-lg">
        <button
          type="button"
          onClick={() => setShowReview(!showReview)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
        >
          <span className="font-medium">Filing Status Review</span>
          <span className="text-xs">{showReview ? '▲' : '▼'}</span>
        </button>

        {showReview && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-3">
                Confirm which brackets we should use if {data.filingStatus} isn't supported in {data.state}.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Your Filing Status
                  </label>
                  <div className="px-3 py-2 bg-gray-100 rounded text-sm">
                    {data.filingStatus || formatFilingTypeLabel(data.filingType)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Use Instead
                  </label>
                  <select
                    value={filingStatusRemap}
                    onChange={(e) => handleRemapChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Not remapped</option>
                    {remapOptions.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {filingStatusRemap && (
                <p className="mt-2 text-xs text-blue-600">
                  Tax calculations will use {getFilingStatusLabel(filingStatusRemap)} brackets for {data.state}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Total Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard
          title="Total Income"
          value={`$${Math.round(calculations.totals.totalIncome).toLocaleString()}`}
        />
        <SummaryCard
          title="State Tax"
          subtitle={data.state}
          value={`$${Math.round(calculations.totals.totalStateTax).toLocaleString()}`}
        />
        <SummaryCard
          title="Federal Tax"
          subtitle={data.country}
          value={`$${Math.round(calculations.totals.totalFederalTax).toLocaleString()}`}
        />
        <SummaryCard
          title={data.country === 'Canada' ? 'Payroll Tax' : 'FICA Tax'}
          subtitle={data.country === 'Canada' ? 'CPP + EI' : 'Soc Sec + Medicare'}
          value={`$${Math.round(calculations.totals.totalFICA).toLocaleString()}`}
        />
        <SummaryCard
          title="Total Tax"
          value={`$${Math.round(calculations.totals.totalTax).toLocaleString()}`}
          subtitle={`${(calculations.totals.effectiveRate * 100).toFixed(2)}% effective rate`}
          highlight
        />
      </div>

      {/* Individual Income Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Detailed Income Breakdown</h2>
        <div className="space-y-6">
          {data.incomes.map((income, index) => {
            const calc = calculations.individual[index]
            return (
              <div key={income.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{income.description || 'Untitled Income'}</h3>
                    <p className="text-sm text-gray-500">
                      {income.incomeType === 'salary' ? 'Salary' : 'Investment Income'} • ${Math.round(income.amount).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">Total Tax: ${Math.round(calc.totalTax).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{(calc.effectiveRate * 100).toFixed(2)}% effective rate</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4 pb-4 border-b">
                  <div>
                    <p className="text-gray-600">State Tax</p>
                    <p className="font-medium">${Math.round(calc.stateTax).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Federal Tax</p>
                    <p className="font-medium">${Math.round(calc.federalTax).toLocaleString()}</p>
                  </div>
                  {income.incomeType === 'salary' && (
                    <>
                      <div>
                        <p className="text-gray-600">Social Security</p>
                        <p className="font-medium">${Math.round(calc.fica.socialSecurity).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Medicare</p>
                        <p className="font-medium">${Math.round(calc.fica.medicare + calc.fica.additionalMedicare).toLocaleString()}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* State Tax Breakdown */}
                {calc.stateTaxBreakdown.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      {data.state === 'california' ? 'California' : data.state.charAt(0).toUpperCase() + data.state.slice(1)} Tax Breakdown
                      {income.incomeType === 'investment' && data.state === 'california' && (
                        <span className="text-xs font-normal text-blue-600 ml-2">(Capital gains taxed as ordinary income)</span>
                      )}
                      {calc.actualStateFilingType !== data.filingType && (
                        <span className="text-xs font-normal text-orange-600 ml-2">
                          (Using {calc.actualStateFilingType === 'married' ? 'Married' : calc.actualStateFilingType === 'head' ? 'Head' : 'Single'} brackets - {data.filingType === 'separate' ? 'Separate' : data.filingType} not available)
                        </span>
                      )}
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-600 border-b border-gray-200">
                            <th className="text-left py-2">Bracket</th>
                            <th className="text-right py-2">Rate</th>
                            <th className="text-right py-2">Taxable Amount</th>
                            <th className="text-right py-2">Tax</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calc.stateTaxBreakdown.map((bracket, idx) => (
                            <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                              <td className="py-2 text-gray-700">
                                ${Math.round(bracket.min).toLocaleString()} - {bracket.max === Infinity ? '∞' : `$${Math.round(bracket.max).toLocaleString()}`}
                              </td>
                              <td className="text-right text-gray-700">{(bracket.rate * 100).toFixed(1)}%</td>
                              <td className="text-right text-gray-700">${Math.round(bracket.taxableAmount).toLocaleString()}</td>
                              <td className="text-right font-medium text-gray-900">${Math.round(bracket.taxAmount).toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold">
                            <td colSpan="3" className="text-right py-2">Total:</td>
                            <td className="text-right py-2">${Math.round(calc.stateTax).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Federal Tax Breakdown */}
                {calc.federalTaxBreakdown.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Federal Tax Breakdown
                      {income.incomeType === 'investment' && (
                        <span className="text-xs font-normal text-blue-600 ml-2">(Capital Gains Rates)</span>
                      )}
                      {calc.actualFederalFilingType !== data.filingType && (
                        <span className="text-xs font-normal text-orange-600 ml-2">
                          (Using {calc.actualFederalFilingType === 'married' ? 'Married' : calc.actualFederalFilingType === 'head' ? 'Head' : 'Single'} brackets)
                        </span>
                      )}
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-600 border-b border-gray-200">
                            <th className="text-left py-2">Bracket</th>
                            <th className="text-right py-2">Rate</th>
                            <th className="text-right py-2">Taxable Amount</th>
                            <th className="text-right py-2">Tax</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calc.federalTaxBreakdown.map((bracket, idx) => (
                            <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                              <td className="py-2 text-gray-700">
                                ${Math.round(bracket.min).toLocaleString()} - {bracket.max === Infinity ? '∞' : `$${Math.round(bracket.max).toLocaleString()}`}
                              </td>
                              <td className="text-right text-gray-700">{(bracket.rate * 100).toFixed(1)}%</td>
                              <td className="text-right text-gray-700">${Math.round(bracket.taxableAmount).toLocaleString()}</td>
                              <td className="text-right font-medium text-gray-900">${Math.round(bracket.taxAmount).toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold">
                            <td colSpan="3" className="text-right py-2">Total:</td>
                            <td className="text-right py-2">${Math.round(calc.federalTax).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Payroll Tax Breakdown (Salary only) */}
                {income.incomeType === 'salary' && calc.fica.total > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      {calc.country === 'Canada' ? 'Canadian Payroll Tax Breakdown' : 'FICA Tax Breakdown'}
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="space-y-2 text-sm">
                        {/* US FICA Taxes */}
                        {calc.fica.socialSecurity > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700">Social Security (6.2% up to $168,600):</span>
                            <span className="font-medium">${Math.round(calc.fica.socialSecurity).toLocaleString()}</span>
                          </div>
                        )}
                        {calc.fica.medicare > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700">Medicare (1.45%):</span>
                            <span className="font-medium">${Math.round(calc.fica.medicare).toLocaleString()}</span>
                          </div>
                        )}
                        {calc.fica.additionalMedicare > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700">Additional Medicare (0.9% over threshold):</span>
                            <span className="font-medium">${Math.round(calc.fica.additionalMedicare).toLocaleString()}</span>
                          </div>
                        )}
                        {/* Canadian Payroll Taxes */}
                        {calc.fica.cpp > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700">CPP (Canada Pension Plan):</span>
                            <span className="font-medium">${Math.round(calc.fica.cpp).toLocaleString()}</span>
                          </div>
                        )}
                        {calc.fica.ei > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700">EI (Employment Insurance):</span>
                            <span className="font-medium">${Math.round(calc.fica.ei).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
                          <span>Total {calc.country === 'Canada' ? 'Payroll Tax' : 'FICA'}:</span>
                          <span>${Math.round(calc.fica.total).toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {calc.country === 'Canada'
                          ? 'Note: Your employer also pays matching CPP and 1.4x EI contributions'
                          : 'Note: Your employer also pays matching FICA taxes'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={() => navigate('/investments-debt')}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
        >
          Continue to Investments & Debt →
        </button>
      </div>
    </div>
  )
}

// Summary Card Component
function SummaryCard({ title, subtitle, value, highlight }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${highlight ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mb-2">{subtitle}</p>}
      <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

export default Taxes
