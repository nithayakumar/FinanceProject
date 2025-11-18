import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../core'
import { calculateTaxes } from './Taxes.calc'

function Taxes() {
  const navigate = useNavigate()
  const [calculations, setCalculations] = useState(null)
  const [isSaved, setIsSaved] = useState(false)
  const [data, setData] = useState({
    filingType: 'single',
    state: 'california',
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

  // Load profile and income data on mount, then auto-calculate
  useEffect(() => {
    const profile = storage.load('profile') || {}
    const incomeData = storage.load('income') || { incomeStreams: [] }

    // Calculate total income excluding 401k contributions
    const totalSalary = incomeData.incomeStreams.reduce((sum, stream) => {
      const annualIncome = Number(stream.annualIncome) || 0
      const individual401k = Number(stream.individual401k) || 0
      return sum + annualIncome - individual401k
    }, 0)

    // Auto-populate with data from profile and income
    const taxData = {
      filingType: mapFilingStatus(profile.filingStatus),
      state: 'california',
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
      totalSalary
    })

    // Auto-calculate taxes
    if (taxData.incomes.length > 0) {
      console.group('💰 Auto-calculating Taxes')

      // Save to localStorage
      storage.save('taxes', taxData)
      setIsSaved(true)

      // Calculate taxes for each income source
      const taxCalculations = taxData.incomes.map(income =>
        calculateTaxes(income.amount, income.incomeType, taxData.filingType, taxData.state)
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

      console.log('✅ Taxes auto-calculated')
      console.groupEnd()
    }
  }, [])

  if (!calculations) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading tax calculations...</p>
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
            <span className="font-medium">{data.state === 'california' ? 'California' : data.state}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Auto-loaded from Personal Details and Income
          </p>
        </div>
        <div>
          <button
            onClick={() => navigate('/tax-brackets')}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Manage Tax Brackets
          </button>
        </div>
      </div>

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

      {/* Total Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard
          title="Total Income"
          value={`$${Math.round(calculations.totals.totalIncome).toLocaleString()}`}
        />
        <SummaryCard
          title="State Tax"
          subtitle="California"
          value={`$${Math.round(calculations.totals.totalStateTax).toLocaleString()}`}
        />
        <SummaryCard
          title="Federal Tax"
          value={`$${Math.round(calculations.totals.totalFederalTax).toLocaleString()}`}
        />
        <SummaryCard
          title="FICA Tax"
          subtitle="Soc Sec + Medicare"
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

                {/* FICA Breakdown (Salary only) */}
                {income.incomeType === 'salary' && calc.fica.total > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">FICA Tax Breakdown</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Social Security (6.2% up to $168,600):</span>
                          <span className="font-medium">${Math.round(calc.fica.socialSecurity).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Medicare (1.45%):</span>
                          <span className="font-medium">${Math.round(calc.fica.medicare).toLocaleString()}</span>
                        </div>
                        {calc.fica.additionalMedicare > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700">Additional Medicare (0.9% over threshold):</span>
                            <span className="font-medium">${Math.round(calc.fica.additionalMedicare).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
                          <span>Total FICA:</span>
                          <span>${Math.round(calc.fica.total).toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Note: Your employer also pays matching FICA taxes
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
