import { useState, useEffect } from 'react'
import { storage } from '../../shared/storage'
import { calculateIncomeProjections } from '../income/Income.calc'
import { calculateExpenseProjections } from '../expenses/Expenses.calc'
import { calculateGapProjections } from '../gap/Gap.calc'
import NetWorthTab from './NetWorthTab'
import IncomeTab from './IncomeTab'
import ExpensesTab from './ExpensesTab'
import RetirementTab from './RetirementTab'

function Dashboard() {
  const [activeTab, setActiveTab] = useState('networth')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.group('📊 Loading Dashboard Data')

    const profile = storage.load('profile')
    const incomeData = storage.load('income')
    const expensesData = storage.load('expenses')
    const investmentsData = storage.load('investmentsDebt')

    console.log('Profile:', profile)
    console.log('Income Data:', incomeData)
    console.log('Expenses Data:', expensesData)
    console.log('Investments Data:', investmentsData)

    // Validate required data with detailed checks
    const hasProfile = !!(profile && profile.age && profile.retirementAge)
    const hasIncome = !!(incomeData && incomeData.incomeStreams && incomeData.incomeStreams.length > 0)
    const hasExpenses = !!(expensesData && expensesData.expenseCategories && expensesData.expenseCategories.length > 0)
    const hasInvestments = !!(investmentsData &&
                          investmentsData.currentCash !== undefined &&
                          investmentsData.targetCash !== undefined)

    console.log('Validation results:', {
      hasProfile,
      profileFields: profile ? { age: profile.age, retirementAge: profile.retirementAge } : null,
      hasIncome,
      incomeStreamsCount: incomeData?.incomeStreams?.length || 0,
      hasExpenses,
      expenseCategoriesCount: expensesData?.expenseCategories?.length || 0,
      hasInvestments,
      investmentFields: investmentsData ? {
        currentCash: investmentsData.currentCash,
        targetCash: investmentsData.targetCash
      } : null
    })

    if (!hasProfile || !hasIncome || !hasExpenses || !hasInvestments) {
      console.error('Missing required data for dashboard')
      console.groupEnd()
      setData({
        validationErrors: {
          hasProfile,
          hasIncome,
          hasExpenses,
          hasInvestments,
          profile,
          incomeData,
          expensesData,
          investmentsData
        }
      })
      setLoading(false)
      return
    }

    try {
      // Ensure profile has yearsToRetirement calculated
      const enrichedProfile = {
        ...profile,
        yearsToRetirement: profile.retirementAge - profile.age,
        currentAge: profile.age  // Add alias for backward compatibility
      }

      // Calculate projections
      console.log('Calculating income projections...')
      const incomeProjections = calculateIncomeProjections(incomeData, enrichedProfile)

      console.log('Calculating expense projections...')
      const expenseProjections = calculateExpenseProjections(expensesData, enrichedProfile)

      console.log('Calculating gap projections...')
      // Gap needs both raw data (for incomeStreams) and projections (for monthly data)
      const incomeWithProjections = {
        ...incomeData,
        projections: incomeProjections.projections
      }
      const expensesWithProjections = {
        ...expensesData,
        projections: expenseProjections.projections
      }
      const gapProjections = calculateGapProjections(incomeWithProjections, expensesWithProjections, investmentsData, enrichedProfile)

      setData({
        profile: enrichedProfile,
        incomeData,
        expensesData,
        investmentsData,
        incomeProjections,
        expenseProjections,
        gapProjections
      })

      console.log('Dashboard data loaded:', {
        incomeProjections,
        expenseProjections,
        gapProjections
      })
      console.groupEnd()
      setLoading(false)
    } catch (error) {
      console.error('Error calculating dashboard data:', error)
      console.error('Error stack:', error.stack)
      console.groupEnd()
      setData({
        calculationError: error.message,
        validationErrors: {
          hasProfile,
          hasIncome,
          hasExpenses,
          hasInvestments,
          profile,
          incomeData,
          expensesData,
          investmentsData
        }
      })
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data || data.validationErrors) {
    const errors = data?.validationErrors || {}

    // Load raw localStorage data for debugging
    const rawProfile = storage.load('profile')
    const rawIncome = storage.load('income')
    const rawExpenses = storage.load('expenses')
    const rawInvestments = storage.load('investmentsDebt')

    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-4">⚠️ Dashboard Not Ready</h2>
          <p className="text-gray-700 mb-4">
            The dashboard requires data from all sections. Check the status below:
          </p>

          {/* Calculation Error */}
          {data?.calculationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="font-medium text-red-900">Calculation Error:</p>
              <p className="text-sm text-red-700 mt-1">{data.calculationError}</p>
              <p className="text-xs text-red-600 mt-2">Check the browser console for more details.</p>
            </div>
          )}

          {/* Debug Info */}
          <details className="mb-4 p-3 bg-gray-100 rounded">
            <summary className="cursor-pointer font-medium text-sm">Debug: View Raw localStorage Data</summary>
            <pre className="mt-2 text-xs overflow-auto max-h-60 bg-white p-2 rounded">
              {JSON.stringify({
                profile: rawProfile,
                income: rawIncome,
                expenses: rawExpenses,
                investments: rawInvestments,
                validationResults: {
                  hasProfile: !!(rawProfile && rawProfile.age && rawProfile.retirementAge),
                  hasIncome: !!(rawIncome && rawIncome.incomeStreams && rawIncome.incomeStreams.length > 0),
                  hasExpenses: !!(rawExpenses && rawExpenses.expenseCategories && rawExpenses.expenseCategories.length > 0),
                  hasInvestments: !!(rawInvestments && rawInvestments.currentCash !== undefined && rawInvestments.targetCash !== undefined)
                }
              }, null, 2)}
            </pre>
          </details>

          <div className="space-y-3">
            {/* Personal Details */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={errors.hasProfile}
                readOnly
                className="mt-1 h-5 w-5"
              />
              <div className="flex-1">
                <p className={`font-medium ${errors.hasProfile ? 'text-green-700' : 'text-red-700'}`}>
                  Personal Details
                </p>
                {!errors.hasProfile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Missing: {!errors.profile?.age && 'age'} {!errors.profile?.retirementAge && 'retirement age'}
                  </p>
                )}
              </div>
            </div>

            {/* Income */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={errors.hasIncome}
                readOnly
                className="mt-1 h-5 w-5"
              />
              <div className="flex-1">
                <p className={`font-medium ${errors.hasIncome ? 'text-green-700' : 'text-red-700'}`}>
                  Income
                </p>
                {!errors.hasIncome && (
                  <p className="text-sm text-gray-600 mt-1">
                    Need at least one income stream. Current: {errors.incomeData?.incomeStreams?.length || 0}
                  </p>
                )}
              </div>
            </div>

            {/* Expenses */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={errors.hasExpenses}
                readOnly
                className="mt-1 h-5 w-5"
              />
              <div className="flex-1">
                <p className={`font-medium ${errors.hasExpenses ? 'text-green-700' : 'text-red-700'}`}>
                  Expenses
                </p>
                {!errors.hasExpenses && (
                  <p className="text-sm text-gray-600 mt-1">
                    Missing expense categories. Found: {errors.expensesData?.expenseCategories?.length || 0}
                  </p>
                )}
              </div>
            </div>

            {/* Investments & Debt */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={errors.hasInvestments}
                readOnly
                className="mt-1 h-5 w-5"
              />
              <div className="flex-1">
                <p className={`font-medium ${errors.hasInvestments ? 'text-green-700' : 'text-red-700'}`}>
                  Investments & Debt
                </p>
                {!errors.hasInvestments && (
                  <p className="text-sm text-gray-600 mt-1">
                    Missing: {errors.investmentsData?.currentCash === undefined && 'current cash'}
                    {errors.investmentsData?.targetCash === undefined && ' target cash'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-6">
            💡 Navigate through each section and click the save/continue button to enable the Dashboard.
          </p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'networth', label: 'Net Worth' },
    { id: 'income', label: 'Income' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'retirement', label: 'Retirement' }
  ]

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Financial Dashboard</h1>
        <p className="text-gray-600">
          Comprehensive view of your financial projections and retirement readiness
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'networth' && <NetWorthTab data={data} />}
        {activeTab === 'income' && <IncomeTab data={data} />}
        {activeTab === 'expenses' && <ExpensesTab data={data} />}
        {activeTab === 'retirement' && <RetirementTab data={data} />}
      </div>
    </div>
  )
}

export default Dashboard
