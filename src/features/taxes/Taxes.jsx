import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../shared/storage'
import { validateTaxInput, calculateTaxes } from './Taxes.calc'

function Taxes() {
  const navigate = useNavigate()
  const [view, setView] = useState('input')
  const [errors, setErrors] = useState({})

  const [data, setData] = useState({
    filingType: 'single',
    state: 'california',
    incomes: []
  })

  const [calculations, setCalculations] = useState(null)

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

  // Load profile and income data on mount
  useEffect(() => {
    const profile = storage.load('profile') || {}
    const incomeData = storage.load('income') || { incomeStreams: [] }

    // Calculate total income excluding 401k
    const totalSalary = incomeData.incomeStreams.reduce((sum, stream) => {
      const annualIncome = Number(stream.annualIncome) || 0
      return sum + annualIncome
    }, 0)

    // Auto-populate with data from profile and income
    setData(prev => ({
      ...prev,
      filingType: mapFilingStatus(profile.filingStatus),
      state: 'california',
      incomes: totalSalary > 0 ? [{
        id: 'salary-income',
        description: 'Total Annual Income (excl. 401k)',
        amount: totalSalary,
        incomeType: 'salary'
      }] : []
    }))

    console.log('📋 Auto-loaded from profile and income:', {
      filingStatus: profile.filingStatus,
      mappedFilingType: mapFilingStatus(profile.filingStatus),
      totalSalary
    })
  }, [])

  const handleFilingTypeChange = (value) => {
    setData(prev => ({
      ...prev,
      filingType: value
    }))

    if (errors.filingType) {
      setErrors(prev => ({ ...prev, filingType: '' }))
    }
  }

  const handleStateChange = (value) => {
    setData(prev => ({
      ...prev,
      state: value
    }))
  }

  const addIncome = () => {
    const newIncome = {
      id: `income-${Date.now()}`,
      description: '',
      amount: '',
      incomeType: 'salary'
    }

    setData(prev => ({
      ...prev,
      incomes: [...prev.incomes, newIncome]
    }))
  }

  const handleIncomeChange = (incomeId, field, value) => {
    setData(prev => ({
      ...prev,
      incomes: prev.incomes.map(income =>
        income.id === incomeId
          ? { ...income, [field]: value }
          : income
      )
    }))

    // Clear error
    const index = data.incomes.findIndex(i => i.id === incomeId)
    if (errors[`${index}-${field}`]) {
      setErrors(prev => ({ ...prev, [`${index}-${field}`]: '' }))
    }
  }

  const removeIncome = (incomeId) => {
    setData(prev => ({
      ...prev,
      incomes: prev.incomes.filter(i => i.id !== incomeId)
    }))
  }

  const handleCalculate = () => {
    console.group('💾 Calculating Taxes')
    console.log('Data:', data)

    // Validate
    const validationErrors = validateTaxInput(data)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      console.error('Validation errors:', validationErrors)
      console.groupEnd()
      return
    }

    // Save to localStorage
    storage.save('taxes', data)

    // Calculate taxes for each income source
    const taxCalculations = data.incomes.map(income =>
      calculateTaxes(income.amount, income.incomeType, data.filingType, data.state)
    )

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

    // Switch to output view
    setView('output')
    console.log('✅ Taxes calculated and saved')
    console.groupEnd()
  }

  const handleEdit = () => {
    setView('input')
  }

  const handleNextFeature = () => {
    navigate('/retirement')
  }

  // Input View
  if (view === 'input') {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Taxes</h1>
        <p className="text-gray-600 mb-8">Calculate your tax liability</p>

        <div className="space-y-6">
          {/* Auto-loaded notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ℹ️ Tax information has been automatically loaded from your Personal Details and Income data.
              You can adjust values below if needed.
            </p>
          </div>

          {/* Filing Type and State */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Filing Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filing Type
                </label>
                <select
                  value={data.filingType}
                  onChange={(e) => handleFilingTypeChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.filingType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="single">Single</option>
                  <option value="married">Married Filing Jointly</option>
                  <option value="separate">Married Filing Separately</option>
                  <option value="head">Head of Household</option>
                </select>
                {errors.filingType && (
                  <p className="mt-1 text-sm text-red-600">{errors.filingType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <select
                  value={data.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="california">California</option>
                </select>
              </div>
            </div>
          </div>

          {/* Income Sources */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">Income Sources</h2>
                <p className="text-sm text-gray-600">
                  {data.incomes.length > 0
                    ? 'Review and adjust your income sources, or add additional income'
                    : 'Add your income to calculate taxes'}
                </p>
              </div>
              <button
                onClick={addIncome}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Income
              </button>
            </div>

            {data.incomes.length > 0 ? (
              <div className="space-y-4">
                {data.incomes.map((income, index) => (
                  <div key={income.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={income.description}
                          onChange={(e) => handleIncomeChange(income.id, 'description', e.target.value)}
                          placeholder="Description (e.g., W-2 Salary, Dividends)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Amount</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">$</span>
                              <input
                                type="number"
                                value={income.amount}
                                onChange={(e) => handleIncomeChange(income.id, 'amount', e.target.value ? Number(e.target.value) : '')}
                                placeholder="100000"
                                className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  errors[`${index}-amount`] ? 'border-red-500' : 'border-gray-300'
                                }`}
                              />
                            </div>
                            {errors[`${index}-amount`] && (
                              <p className="mt-1 text-xs text-red-600">{errors[`${index}-amount`]}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Type</label>
                            <select
                              value={income.incomeType}
                              onChange={(e) => handleIncomeChange(income.id, 'incomeType', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors[`${index}-incomeType`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                            >
                              <option value="salary">Salary</option>
                              <option value="investment">Investment Income</option>
                            </select>
                            {errors[`${index}-incomeType`] && (
                              <p className="mt-1 text-xs text-red-600">{errors[`${index}-incomeType`]}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => removeIncome(income.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No income sources added yet</p>
            )}
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
          >
            Calculate Taxes →
          </button>
        </div>
      </div>
    )
  }

  // Output View
  if (!calculations) {
    return <div className="p-8">Loading calculations...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tax Summary</h1>
          <p className="text-gray-600">
            Filing as: <span className="font-medium">{data.filingType === 'married' ? 'Married Filing Jointly' : data.filingType === 'separate' ? 'Married Filing Separately' : data.filingType === 'head' ? 'Head of Household' : 'Single'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/tax-brackets')}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            Manage Tax Brackets
          </button>
          <button
            onClick={handleEdit}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Total Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard
          title="Total Income"
          value={`$${calculations.totals.totalIncome.toLocaleString()}`}
        />
        <SummaryCard
          title="State Tax"
          subtitle="California"
          value={`$${calculations.totals.totalStateTax.toLocaleString()}`}
        />
        <SummaryCard
          title="Federal Tax"
          value={`$${calculations.totals.totalFederalTax.toLocaleString()}`}
        />
        <SummaryCard
          title="FICA Tax"
          subtitle="Soc Sec + Medicare"
          value={`$${calculations.totals.totalFICA.toLocaleString()}`}
        />
        <SummaryCard
          title="Total Tax"
          value={`$${calculations.totals.totalTax.toLocaleString()}`}
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
                      {income.incomeType === 'salary' ? 'Salary' : 'Investment Income'} • ${income.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">Total Tax: ${calc.totalTax.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{(calc.effectiveRate * 100).toFixed(2)}% effective rate</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4 pb-4 border-b">
                  <div>
                    <p className="text-gray-600">State Tax</p>
                    <p className="font-medium">${calc.stateTax.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Federal Tax</p>
                    <p className="font-medium">${calc.federalTax.toLocaleString()}</p>
                  </div>
                  {income.incomeType === 'salary' && (
                    <>
                      <div>
                        <p className="text-gray-600">Social Security</p>
                        <p className="font-medium">${calc.fica.socialSecurity.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Medicare</p>
                        <p className="font-medium">${(calc.fica.medicare + calc.fica.additionalMedicare).toLocaleString()}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* California Tax Ladder */}
                {calc.stateTaxBreakdown.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      California Tax Breakdown
                      {income.incomeType === 'investment' && (
                        <span className="text-xs font-normal text-blue-600 ml-2">(Capital gains taxed as ordinary income)</span>
                      )}
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        (Filing as: {(() => {
                          // Show mapped filing type for California
                          const mappedType = data.filingType === 'separate' ? 'single' : data.filingType
                          return mappedType === 'married' ? 'Married Filing Jointly' : mappedType === 'head' ? 'Head of Household' : 'Single'
                        })()})
                      </span>
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
                                ${bracket.min.toLocaleString()} - {bracket.max === Infinity ? '∞' : `$${bracket.max.toLocaleString()}`}
                              </td>
                              <td className="text-right text-gray-700">{(bracket.rate * 100).toFixed(1)}%</td>
                              <td className="text-right text-gray-700">${Math.round(bracket.taxableAmount).toLocaleString()}</td>
                              <td className="text-right font-medium text-gray-900">${Math.round(bracket.taxAmount).toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold">
                            <td colSpan="3" className="text-right py-2">Total:</td>
                            <td className="text-right py-2">${calc.stateTax.toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Federal Tax Ladder */}
                {calc.federalTaxBreakdown.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Federal Tax Breakdown
                      {income.incomeType === 'investment' && (
                        <span className="text-xs font-normal text-blue-600 ml-2">(Capital Gains Rates)</span>
                      )}
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        (Filing as: {data.filingType === 'married' ? 'Married Filing Jointly' : data.filingType === 'separate' ? 'Married Filing Separately' : data.filingType === 'head' ? 'Head of Household' : 'Single'})
                      </span>
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
                                ${bracket.min.toLocaleString()} - {bracket.max === Infinity ? '∞' : `$${bracket.max.toLocaleString()}`}
                              </td>
                              <td className="text-right text-gray-700">{(bracket.rate * 100).toFixed(1)}%</td>
                              <td className="text-right text-gray-700">${Math.round(bracket.taxableAmount).toLocaleString()}</td>
                              <td className="text-right font-medium text-gray-900">${Math.round(bracket.taxAmount).toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr className="font-semibold">
                            <td colSpan="3" className="text-right py-2">Total:</td>
                            <td className="text-right py-2">${calc.federalTax.toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* FICA Tax Breakdown */}
                {income.incomeType === 'salary' && calc.fica.total > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">FICA Tax Breakdown (Employee Share)</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-600 border-b border-gray-200">
                            <th className="text-left py-2">Component</th>
                            <th className="text-right py-2">Rate</th>
                            <th className="text-right py-2">Wage Base</th>
                            <th className="text-right py-2">Tax</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Social Security */}
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-700">Social Security (OASDI)</td>
                            <td className="text-right text-gray-700">6.2%</td>
                            <td className="text-right text-gray-700">
                              ${Math.min(income.amount, 168600).toLocaleString()} <span className="text-xs text-gray-500">(max $168,600)</span>
                            </td>
                            <td className="text-right font-medium text-gray-900">${calc.fica.socialSecurity.toLocaleString()}</td>
                          </tr>

                          {/* Medicare */}
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-700">Medicare (HI)</td>
                            <td className="text-right text-gray-700">1.45%</td>
                            <td className="text-right text-gray-700">
                              ${income.amount.toLocaleString()} <span className="text-xs text-gray-500">(no limit)</span>
                            </td>
                            <td className="text-right font-medium text-gray-900">${calc.fica.medicare.toLocaleString()}</td>
                          </tr>

                          {/* Additional Medicare */}
                          {calc.fica.additionalMedicare > 0 && (
                            <tr className="border-b border-gray-100">
                              <td className="py-2 text-gray-700">Additional Medicare</td>
                              <td className="text-right text-gray-700">0.9%</td>
                              <td className="text-right text-gray-700">
                                ${(() => {
                                  const threshold = data.filingType === 'married' ? 250000 : data.filingType === 'separate' ? 125000 : 200000
                                  return (income.amount - threshold).toLocaleString()
                                })()}
                                <span className="text-xs text-gray-500 block">
                                  (over ${data.filingType === 'married' ? '250,000' : data.filingType === 'separate' ? '125,000' : '200,000'})
                                </span>
                              </td>
                              <td className="text-right font-medium text-gray-900">${calc.fica.additionalMedicare.toLocaleString()}</td>
                            </tr>
                          )}

                          <tr className="font-semibold">
                            <td colSpan="3" className="text-right py-2">Total FICA:</td>
                            <td className="text-right py-2">${calc.fica.total.toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-500 mt-2">
                        Note: Employer matches Social Security (6.2%) and Medicare (1.45%) for a combined total of 15.3%. Self-employed individuals pay both shares.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleNextFeature}
        className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
      >
        Continue to Retirement →
      </button>
    </div>
  )
}

function SummaryCard({ title, subtitle, value, highlight }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${highlight ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}>
      <div className="text-sm font-medium text-gray-600 mb-1">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mb-2">{subtitle}</div>}
      <div className={`text-2xl font-bold ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  )
}

export default Taxes
