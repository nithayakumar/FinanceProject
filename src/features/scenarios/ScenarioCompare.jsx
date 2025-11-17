import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../shared/storage'
import {
  getCurrentPlanData,
  calculateScenarioProjections,
  calculateScenarioSummary,
  compareScenarios
} from './Scenario.calc'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

function ScenarioCompare() {
  const navigate = useNavigate()
  const [scenarios, setScenarios] = useState([])
  const [selectedScenarioIds, setSelectedScenarioIds] = useState([])
  const [comparisonData, setComparisonData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [baseData, setBaseData] = useState(null)
  const [baseResults, setBaseResults] = useState(null)

  // Load scenarios and current plan (NEW: uses active scenario from scenarios array)
  useEffect(() => {
    const saved = storage.load('scenarios') || []

    // Find active scenario
    const activeScenario = saved.find(s => s.isActive)

    // Filter out active scenario from alternatives list
    const alternativeScenarios = saved.filter(s => !s.isActive)
    setScenarios(alternativeScenarios)

    if (!activeScenario) {
      console.warn('⚠️ No active scenario found - user needs to set up their plan or promote a scenario')
      setBaseData(null)
      setBaseResults(null)
      return
    }

    // Use active scenario data as base, but ensure it has proper defaults
    // Pass through getCurrentPlanData to normalize and add defaults
    const rawData = activeScenario.data

    // Apply defaults using the same logic as getCurrentPlanData
    const currentPlan = {
      profile: {
        age: 30,
        retirementAge: 65,
        inflationRate: 2.7,
        currentCash: 0,
        targetCash: 0,
        currentSavings: 0,
        ...(rawData.profile || {})
      },
      income: {
        incomeStreams: rawData.income?.incomeStreams || [],
        ...(rawData.income || {})
      },
      expenses: {
        expenseCategories: rawData.expenses?.expenseCategories || [],
        oneTimeExpenses: rawData.expenses?.oneTimeExpenses || [],
        ...(rawData.expenses || {})
      },
      investmentsDebt: {
        currentCash: 0,
        targetCash: 0,
        retirement401k: {
          individualLimit: 23500,
          limitGrowth: 3,
          currentValue: 0,
          growthRate: 7,
          companyContribution: 0,
          ...(rawData.investmentsDebt?.retirement401k || {})
        },
        investments: rawData.investmentsDebt?.investments || [],
        ...(rawData.investmentsDebt || {})
      }
    }

    setBaseData(currentPlan)

    // Validate current plan has data
    const hasProfile = currentPlan.profile && Object.keys(currentPlan.profile).length > 0
    const hasIncome = currentPlan.income && currentPlan.income.incomeStreams && currentPlan.income.incomeStreams.length > 0
    const hasExpenses = currentPlan.expenses && Object.keys(currentPlan.expenses).length > 0
    const hasInvestments = currentPlan.investmentsDebt && Object.keys(currentPlan.investmentsDebt).length > 0

    if (!hasProfile && !hasIncome && !hasExpenses && !hasInvestments) {
      console.warn('⚠️ Current Plan is empty - user needs to set up their plan first')
      setBaseResults(null)
      return
    }

    // Calculate current plan projections
    try {
      const baseProjectionResults = calculateScenarioProjections(currentPlan)
      setBaseResults(baseProjectionResults)
      console.log('✅ Current Plan loaded from active scenario:', activeScenario.name)
    } catch (error) {
      console.error('❌ Error calculating current plan projections:', error)
      setBaseResults(null)
    }
  }, [])

  // Run comparison when scenarios are selected (NEW: scenarios have complete data)
  const handleCompare = () => {
    console.group('📊 Scenario Comparison')
    console.log('📋 Base results available:', !!baseResults)
    console.log('📋 Selected scenario IDs:', selectedScenarioIds)
    console.log('📋 Available scenarios:', scenarios)

    if (!baseResults) {
      console.warn('⚠️ Base results not available - Current Plan not loaded')
      console.log('Base data:', baseData)
      console.groupEnd()
      alert('Current Plan is not set up yet.\n\nPlease complete your Current Plan first by:\n1. Setting up your Profile (age, retirement age, etc.)\n2. Adding Income streams\n3. Adding Expenses\n4. Adding Investments\n\nOr, promote one of your scenarios to become the Current Plan.')
      return
    }

    if (selectedScenarioIds.length === 0) {
      console.warn('⚠️ No scenarios selected')
      console.groupEnd()
      alert('Please select at least one scenario to compare')
      return
    }

    setLoading(true)

    try {
      // Build comparison array starting with current plan
      const scenariosToCompare = [
        {
          id: 'current',
          name: 'Current Plan',
          projectionResults: baseResults
        }
      ]
      console.log('✅ Added Current Plan to comparison')

      // Add selected scenarios (NEW: each scenario has complete data in scenario.data)
      selectedScenarioIds.forEach(scenarioId => {
        console.log(`🔍 Looking for scenario: ${scenarioId}`)
        const scenario = scenarios.find(s => s.id === scenarioId)

        if (scenario) {
          console.log(`✅ Found scenario: ${scenario.name}`)
          console.log('📋 Scenario data:', scenario.data)

          // Calculate projections using scenario's complete data
          const projectionResults = calculateScenarioProjections(scenario.data)
          console.log('📊 Calculated projections for', scenario.name)

          scenariosToCompare.push({
            id: scenario.id,
            name: scenario.name,
            projectionResults
          })
        } else {
          console.error(`❌ Scenario not found: ${scenarioId}`)
        }
      })

      console.log(`📊 Total scenarios to compare: ${scenariosToCompare.length}`)

      // Run comparison
      const comparison = compareScenarios(scenariosToCompare)
      console.log('✅ Comparison complete:', comparison)
      setComparisonData(comparison)
    } catch (error) {
      console.error('❌ Error comparing scenarios:', error)
      console.error('Error stack:', error.stack)
      alert(`Error comparing scenarios: ${error.message}\n\nCheck console for details.`)
    } finally {
      setLoading(false)
      console.groupEnd()
    }
  }

  // Toggle scenario selection
  const toggleScenario = (scenarioId) => {
    setSelectedScenarioIds(prev =>
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    )
  }

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value)
  }

  // Format percentage
  const formatPercent = (value) => {
    return value.toFixed(1) + '%'
  }

  // Render difference indicator
  const renderDiff = (diff) => {
    if (!diff) return null

    const isPositive = diff.absolute > 0
    const color = diff.better ? 'text-green-600' : diff.worse ? 'text-red-600' : 'text-gray-600'

    return (
      <div className={`text-sm ${color}`}>
        {isPositive ? '+' : ''}{formatCurrency(diff.absolute)}
        {diff.percentage !== null && (
          <span className="ml-1">({diff.percentage > 0 ? '+' : ''}{diff.percentage.toFixed(1)}%)</span>
        )}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Compare Scenarios</h1>

      {/* Scenario Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Select Scenarios to Compare</h2>

        <div className="mb-4">
          <div className="bg-blue-50 border-2 border-blue-300 rounded p-3 mb-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                className="mr-2"
              />
              <span className="font-medium">Current Plan (Baseline)</span>
            </label>
          </div>

          {scenarios.length === 0 ? (
            <p className="text-gray-500">No scenarios available. Create a scenario first.</p>
          ) : (
            <div className="space-y-2">
              {scenarios.map(scenario => (
                <div key={scenario.id} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedScenarioIds.includes(scenario.id)}
                      onChange={() => toggleScenario(scenario.id)}
                      className="mr-2"
                    />
                    <div>
                      <span className="font-medium">{scenario.name}</span>
                      {scenario.description && (
                        <p className="text-sm text-gray-600">{scenario.description}</p>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleCompare}
          disabled={selectedScenarioIds.length === 0 || loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Calculating...' : 'Compare Selected Scenarios'}
        </button>
      </div>

      {/* Comparison Results */}
      {comparisonData && (
        <>
          {/* Summary Comparison Table */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 overflow-x-auto">
            <h2 className="text-xl font-semibold mb-4">Summary Comparison</h2>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 pr-4">Metric</th>
                  {comparisonData.scenarios.map(scenario => (
                    <th key={scenario.id} className="text-right py-2 px-4 min-w-[150px]">
                      {scenario.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Average Annual Income */}
                <tr className="border-b border-gray-200">
                  <td className="py-3 pr-4 font-medium">Avg Annual Income</td>
                  {comparisonData.scenarios.map(scenario => (
                    <td key={scenario.id} className="text-right py-3 px-4">
                      <div className="font-semibold">{formatCurrency(scenario.summary.avgAnnualIncome)}</div>
                      {renderDiff(scenario.differences?.avgAnnualIncome)}
                    </td>
                  ))}
                </tr>

                {/* Average Annual Taxes */}
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="py-3 pr-4 font-medium">Avg Annual Taxes</td>
                  {comparisonData.scenarios.map(scenario => (
                    <td key={scenario.id} className="text-right py-3 px-4">
                      <div className="font-semibold">{formatCurrency(scenario.summary.avgAnnualTaxes)}</div>
                      {renderDiff(scenario.differences?.avgAnnualTaxes)}
                    </td>
                  ))}
                </tr>

                {/* Average Annual Expenses */}
                <tr className="border-b border-gray-200">
                  <td className="py-3 pr-4 font-medium">Avg Annual Expenses</td>
                  {comparisonData.scenarios.map(scenario => (
                    <td key={scenario.id} className="text-right py-3 px-4">
                      <div className="font-semibold">{formatCurrency(scenario.summary.avgAnnualExpenses)}</div>
                      {renderDiff(scenario.differences?.avgAnnualExpenses)}
                    </td>
                  ))}
                </tr>

                {/* Average Annual Savings */}
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="py-3 pr-4 font-medium">Avg Annual Savings</td>
                  {comparisonData.scenarios.map(scenario => (
                    <td key={scenario.id} className="text-right py-3 px-4">
                      <div className="font-semibold">{formatCurrency(scenario.summary.avgAnnualGap)}</div>
                      {renderDiff(scenario.differences?.avgAnnualGap)}
                    </td>
                  ))}
                </tr>

                {/* Savings Rate */}
                <tr className="border-b border-gray-200">
                  <td className="py-3 pr-4 font-medium">Avg Savings Rate</td>
                  {comparisonData.scenarios.map(scenario => (
                    <td key={scenario.id} className="text-right py-3 px-4">
                      <div className="font-semibold">{formatPercent(scenario.summary.avgSavingsRate)}</div>
                      {scenario.differences?.avgSavingsRate && (
                        <div className={`text-sm ${scenario.differences.avgSavingsRate.better ? 'text-green-600' : scenario.differences.avgSavingsRate.worse ? 'text-red-600' : 'text-gray-600'}`}>
                          {scenario.differences.avgSavingsRate.absolute > 0 ? '+' : ''}
                          {scenario.differences.avgSavingsRate.absolute.toFixed(1)}pp
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Net Worth at Retirement */}
                <tr className="border-b-2 border-gray-300 bg-yellow-50">
                  <td className="py-3 pr-4 font-bold">Net Worth at Retirement</td>
                  {comparisonData.scenarios.map(scenario => (
                    <td key={scenario.id} className="text-right py-3 px-4">
                      <div className="font-bold text-lg">{formatCurrency(scenario.summary.netWorthAtRetirement)}</div>
                      {renderDiff(scenario.differences?.netWorthAtRetirement)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Net Worth Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Net Worth Trajectory</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend />
                {comparisonData.scenarios.map((scenario, index) => (
                  <Line
                    key={scenario.id}
                    data={scenario.summary.yearlyProjections}
                    dataKey="netWorth"
                    name={scenario.name}
                    stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]}
                    strokeWidth={scenario.id === 'base' ? 3 : 2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart Comparison */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Key Metrics Comparison</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={comparisonData.scenarios.map(s => ({
                  name: s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name,
                  Income: s.summary.avgAnnualIncome,
                  Taxes: s.summary.avgAnnualTaxes,
                  Expenses: s.summary.avgAnnualExpenses,
                  Savings: s.summary.avgAnnualGap
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Income" fill="#3b82f6" />
                <Bar dataKey="Taxes" fill="#ef4444" />
                <Bar dataKey="Expenses" fill="#f59e0b" />
                <Bar dataKey="Savings" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Back Button */}
      <div className="mt-6">
        <button
          onClick={() => navigate('/scenarios')}
          className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          ← Back to Scenarios
        </button>
      </div>
    </div>
  )
}

export default ScenarioCompare
