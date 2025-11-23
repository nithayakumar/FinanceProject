import React, { useState, useEffect, useCallback } from 'react'
import { useScenarioData } from './hooks/useScenarioData'
import SplitLayout from '../../shared/components/SplitLayout'
import { Card, Input, Button } from '../../shared/ui'
import { storage } from '../../core/storage'
import { calculateScenarioProjections, calculateScenarioSummary } from './Scenario.calc'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

function Scenarios() {
  const { scenarios, activeScenarioId, addScenario, updateScenario, deleteScenario, setActiveScenario } = useScenarioData()
  const [comparisonData, setComparisonData] = useState([])

  // Define calculateComparisons BEFORE using it in useEffect
  const calculateComparisons = useCallback(() => {
    const data = scenarios.map(scenario => {
      // Load data for this specific scenario
      const profile = storage.load('profile', scenario.id) || {}
      const income = storage.load('income', scenario.id) || {}
      const expenses = storage.load('expenses', scenario.id) || {}
      const investmentsDebt = storage.load('investmentsDebt', scenario.id) || {}

      const scenarioData = {
        profile: { ...profile, age: profile.age || 30, retirementAge: profile.retirementAge || 65 },
        income: { incomeStreams: income.incomeStreams || [], ...income },
        expenses: { expenseCategories: expenses.expenseCategories || [], oneTimeExpenses: expenses.oneTimeExpenses || [], ...expenses },
        investmentsDebt: { investments: investmentsDebt.investments || [], ...investmentsDebt }
      }

      console.log(`[Scenario ${scenario.id}] Loaded Data:`, scenarioData)
      console.log(`[Scenario ${scenario.id}] Income Streams:`, scenarioData.income.incomeStreams)
      try {
        const projections = calculateScenarioProjections(scenarioData)
        const summary = calculateScenarioSummary(projections)

        // Calculate current net worth (Investments + Cash + Savings)
        const currentInvestments = (investmentsDebt.investments || []).reduce((sum, inv) => sum + (Number(inv.currentValue) || 0), 0)
        const current401k = Number(investmentsDebt.retirement401k?.currentValue) || 0
        const currentCash = Number(profile.currentCash) || 0
        const currentSavings = Number(profile.currentSavings) || 0
        const currentNetWorth = currentInvestments + current401k + currentCash + currentSavings

        // Get Y1 metrics
        const y1Income = summary?.firstYearIncome || 0
        const y1Expenses = summary?.firstYearExpenses || 0
        const y1Taxes = summary?.firstYearTaxes || 0
        const y1TaxRate = y1Income > 0 ? (y1Taxes / y1Income) * 100 : 0

        return {
          id: scenario.id,
          name: scenario.name,
          color: scenario.color,
          netWorth: summary?.netWorthAtRetirement || 0,
          savingsRate: summary?.avgSavingsRate || 0,
          location: profile.location || profile.state || 'Not Set',
          y1Income,
          y1Expenses,
          y1TaxRate,
          currentNetWorth
        }
      } catch (e) {
        console.error(`Error calculating scenario ${scenario.id}`, e)
        return {
          id: scenario.id,
          name: scenario.name,
          color: scenario.color,
          netWorth: 0,
          savingsRate: 0,
          location: 'Error',
          y1Income: 0,
          y1Expenses: 0,
          y1TaxRate: 0,
          currentNetWorth: 0
        }
      }
    })
    setComparisonData(data)
  }, [scenarios])

  useEffect(() => {
    calculateComparisons()
  }, [calculateComparisons])

  // Listen for storage changes to recalculate when data is updated
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Recalculate when any scenario-specific data changes
      const scenarioKeys = ['income', 'expenses', 'investmentsDebt', 'taxes', 'taxLadders', 'gap', 'profile']
      if (scenarioKeys.some(key => e.detail.key?.startsWith(key))) {
        console.log('Storage changed, recalculating scenarios:', e.detail.key)
        calculateComparisons()
      }
    }

    window.addEventListener('localStorageChange', handleStorageChange)
    return () => window.removeEventListener('localStorageChange', handleStorageChange)
  }, [calculateComparisons])

  const handleClone = (id) => {
    // Cloning is handled by addScenario logic in hook, but we need to ensure we clone FROM the specific ID
    // The hook currently clones from ACTIVE.
    // To clone a specific one, we might need to switch to it first or update hook.
    // For now, let's just use addScenario which clones active. 
    // If user wants to clone a non-active one, they should switch first.
    // Or we update hook. Let's assume addScenario clones active for now.
    if (activeScenarioId !== id) {
      setActiveScenario(id)
      setTimeout(() => addScenario(), 100) // Hacky but ensures state update
    } else {
      addScenario()
    }
  }

  const colorMap = {
    blue: '#2563eb',
    green: '#16a34a',
    purple: '#9333ea',
    gray: '#4b5563'
  }

  const formatCompact = (num) => {
    if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
    if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(0)}k`
    return `$${num.toFixed(0)}`
  }

  return (
    <SplitLayout
      inputSection={
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Financial Scenarios</h2>
            <Button
              onClick={addScenario}
              disabled={scenarios.length >= 3}
              variant="primary"
              size="sm"
            >
              + Create Scenario
            </Button>
          </div>

          <div className="space-y-4">
            {scenarios.map((scenario) => {
              const metrics = comparisonData.find(d => d.id === scenario.id) || {}
              return (
                <Card
                  key={scenario.id}
                  className={`transition-all border-2 ${activeScenarioId === scenario.id
                    ? `border-${scenario.color}-500 shadow-md`
                    : 'border-transparent hover:border-gray-200'
                    }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2 w-full">
                        <div className={`w-3 h-3 rounded-full bg-${scenario.color}-500 flex-shrink-0`} />
                        <Input
                          value={scenario.name}
                          onChange={(val) => updateScenario(scenario.id, { name: val })}
                          className="font-semibold text-lg border-none p-0 focus:ring-0 w-full"
                          disabled={scenario.isLocked}
                        />
                      </div>
                      {activeScenarioId === scenario.id && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium whitespace-nowrap ml-2">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Scenario Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 p-3 rounded-md">
                      <div>
                        <span className="text-gray-500 block text-xs">Location</span>
                        <span className="font-medium text-gray-900">{metrics.location || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">Current Net Worth</span>
                        <span className="font-medium text-gray-900">{metrics.currentNetWorth ? formatCompact(metrics.currentNetWorth) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">Y1 Income</span>
                        <span className="font-medium text-gray-900">{metrics.y1Income ? formatCompact(metrics.y1Income) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">Y1 Expenses</span>
                        <span className="font-medium text-gray-900">{metrics.y1Expenses ? formatCompact(metrics.y1Expenses) : '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500 block text-xs">Y1 Effective Tax Rate</span>
                        <span className="font-medium text-gray-900">{metrics.y1TaxRate ? `${metrics.y1TaxRate.toFixed(1)}%` : '-'}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setActiveScenario(scenario.id)}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        disabled={activeScenarioId === scenario.id}
                      >
                        {activeScenarioId === scenario.id ? 'Currently Editing' : 'Switch to Scenario'}
                      </Button>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateScenario(scenario.id, { isLocked: !scenario.isLocked })}
                          className={`text-sm ${scenario.isLocked ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                          title={scenario.isLocked ? "Unlock Scenario" : "Lock Scenario"}
                        >
                          {scenario.isLocked ? '🔒 Locked' : '🔓 Unlocked'}
                        </button>
                      </div>
                      <div className="flex space-x-2">
                        {scenarios.length < 3 && (
                          <button
                            onClick={() => handleClone(scenario.id)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                            title="Clone this scenario"
                          >
                            Clone
                          </button>
                        )}
                        {scenarios.length > 1 && (
                          <button
                            onClick={() => deleteScenario(scenario.id)}
                            className="text-sm text-red-400 hover:text-red-600"
                            title="Delete Scenario"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
            <p><strong>Tip:</strong> Create up to 3 scenarios to compare different life choices (e.g., "Retire Early", "Buy House", "Career Change").</p>
          </div>
        </div>
      }
      outputSection={
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-6 text-gray-700">Net Worth at Retirement Comparison</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    formatter={(value) => [`$${(value / 1000000).toFixed(2)}M`, 'Net Worth']}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="netWorth" radius={[4, 4, 0, 0]}>
                    {comparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colorMap[entry.color] || '#4b5563'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700">Scenario Details</h3>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Scenario</th>
                  <th className="px-6 py-3 text-right">Net Worth</th>
                  <th className="px-6 py-3 text-right">Savings Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparisonData.map((data) => (
                  <tr key={data.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900 flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full bg-${data.color}-500`} />
                      <span>{data.name}</span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium">
                      ${(data.netWorth / 1000000).toFixed(2)}M
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {data.savingsRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
    />
  )
}

export default Scenarios
