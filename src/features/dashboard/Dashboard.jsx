import { useState, useEffect } from 'react'
import { storage } from '../../core'
import { calculateIncomeProjections } from '../income/Income.calc'
import { calculateExpenseProjections } from '../expenses/Expenses.calc'
import { calculateGapProjections } from '../gap/Gap.calc'
import NetWorthTab from './NetWorthTab'
import ForecastTab from './ForecastTab'
import WhatIfTab from './WhatIfTab'

function Dashboard() {
  const [activeTab, setActiveTab] = useState('networth')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Check on mount if data was modified while Dashboard was unmounted
  useEffect(() => {
    const lastModified = localStorage.getItem('lastModified')
    const dashboardLastViewed = localStorage.getItem('dashboardLastViewed')

    if (dashboardLastViewed && lastModified && parseInt(lastModified) > parseInt(dashboardLastViewed)) {
      // console.log('📡 Data was modified while Dashboard was unmounted, refreshing...')
      setRefreshTrigger(prev => prev + 1)
    }

    // Update last viewed timestamp when leaving
    return () => {
      localStorage.setItem('dashboardLastViewed', Date.now().toString())
    }
  }, [])

  useEffect(() => {
    console.group('📊 Loading Dashboard Data')

    const profile = storage.load('profile')
    const incomeData = storage.load('income')
    const expensesData = storage.load('expenses')
    const investmentsData = storage.load('investmentsDebt')
    const propertyData = storage.load('property')

    /* console.log('Profile:', profile)
    console.log('Income Data:', incomeData)
    console.log('Expenses Data:', expensesData)
    console.log('Investments Data:', investmentsData)
    console.log('Property Data:', propertyData) */

    // Validate required data with detailed checks
    const hasProfile = !!(profile && profile.age && profile.retirementAge)
    const hasIncome = !!(incomeData && incomeData.incomeStreams && incomeData.incomeStreams.length > 0)
    const hasExpenses = !!(expensesData && expensesData.expenseCategories && expensesData.expenseCategories.length > 0)
    const hasInvestments = !!(investmentsData &&
      investmentsData.currentCash !== undefined &&
      investmentsData.targetCash !== undefined)

    // console.log('Validation results:', {
    //   hasProfile,
    //   profileFields: profile ? { age: profile.age, retirementAge: profile.retirementAge } : null,
    //   hasIncome,
    //   incomeStreamsCount: incomeData?.incomeStreams?.length || 0,
    //   hasExpenses,
    //   expenseCategoriesCount: expensesData?.expenseCategories?.length || 0,
    //   hasInvestments,
    //   investmentFields: investmentsData ? {
    //     currentCash: investmentsData.currentCash,
    //     targetCash: investmentsData.targetCash
    //   } : null,
    //   hasProperty: !!propertyData
    // })

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
          investmentsData,
          propertyData
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
      // console.log('Calculating income projections...')
      const incomeProjections = calculateIncomeProjections(incomeData, enrichedProfile)

      // console.log('Calculating expense projections...')
      const expenseProjections = calculateExpenseProjections(expensesData, enrichedProfile, incomeProjections.projections)

      // console.log('Calculating gap projections...')
      // Gap needs both raw data (for incomeStreams) and projections (for monthly data)
      const incomeWithProjections = {
        ...incomeData,
        projections: incomeProjections.projections
      }
      const expensesWithProjections = {
        ...expensesData,
        projections: expenseProjections.projections
      }
      const gapProjections = calculateGapProjections(incomeWithProjections, expensesWithProjections, investmentsData, propertyData, enrichedProfile)

      setData({
        profile: enrichedProfile,
        incomeData,
        expensesData,
        investmentsData,
        propertyData,
        incomeProjections,
        expenseProjections,
        gapProjections
      })

      // console.log('Dashboard data loaded:', {
      //   incomeProjections,
      //   expenseProjections,
      //   gapProjections
      // })
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
  }, [refreshTrigger])

  // Listen for storage changes and refresh dashboard
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Storage event fires for changes in other tabs
      if (e.key === 'profile' || e.key === 'income' || e.key === 'expenses' || e.key === 'investmentsDebt') {
        // console.log('📡 Storage changed (other tab):', e.key)
        setRefreshTrigger(prev => prev + 1)
      }
    }

    const handleCustomStorageChange = (e) => {
      // Custom event fires for changes in same tab
      // console.log('📡 Storage changed (same tab):', e.detail.key)
      setRefreshTrigger(prev => prev + 1)
    }

    // Listen for both native storage events (cross-tab) and custom events (same-tab)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('localStorageChange', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageChange', handleCustomStorageChange)
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
      <div className="max-w-2xl mx-auto mt-12 px-4">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Let's build your dashboard</h2>
          <p className="text-gray-500 text-lg">Complete the following steps to unlock your financial insights.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
          {/* Personal Details */}
          <StepItem
            title="Personal Details"
            description="Set your age and retirement goals"
            isComplete={errors.hasProfile}
            missingText={!errors.hasProfile && `Missing: ${!errors.profile?.age ? 'age' : ''}${!errors.profile?.age && !errors.profile?.retirementAge ? ', ' : ''}${!errors.profile?.retirementAge ? 'retirement age' : ''}`}
          />

          {/* Income */}
          <StepItem
            title="Income"
            description="Add your income streams"
            isComplete={errors.hasIncome}
          />

          {/* Expenses */}
          <StepItem
            title="Expenses"
            description="Define your expense categories"
            isComplete={errors.hasExpenses}
          />

          {/* Investments & Debt */}
          <StepItem
            title="Investments"
            description="Add your investments"
            isComplete={errors.hasInvestments}
          />
        </div>

        {/* Calculation Error */}
        {data?.calculationError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-red-900">Calculation Error</p>
              <p className="text-sm text-red-700 mt-1">{data.calculationError}</p>
            </div>
          </div>
        )}

        {/* Debug Info (Collapsed) */}
        <div className="mt-8 text-center">
          <details className="inline-block text-left">
            <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Debug Data
            </summary>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200 w-[500px] max-w-[90vw] mx-auto overflow-hidden">
              <pre className="text-[10px] text-gray-600 overflow-auto max-h-40">
                {JSON.stringify({
                  profile: rawProfile,
                  validationResults: {
                    hasProfile: errors.hasProfile,
                    hasIncome: errors.hasIncome,
                    hasExpenses: errors.hasExpenses,
                    hasInvestments: errors.hasInvestments
                  }
                }, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </div>
    )
  }

  function StepItem({ title, description, isComplete, missingText }) {
    return (
      <div className={`flex items-center p-5 border-b border-gray-50 last:border-0 transition-colors ${isComplete ? 'bg-white' : 'bg-gray-50/30'}`}>
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-5 flex-shrink-0 transition-all ${isComplete ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
          }`}>
          {isComplete && (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold text-lg ${isComplete ? 'text-gray-900' : 'text-gray-700'}`}>
              {title}
            </h3>
            {isComplete ? (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Completed</span>
            ) : (
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">To Do</span>
            )}
          </div>
          <p className={`text-sm mt-0.5 ${isComplete ? 'text-gray-500' : 'text-gray-600'}`}>
            {description}
          </p>
          {!isComplete && missingText && (
            <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {missingText}
            </p>
          )}
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'networth', label: 'Net Worth' },
    { id: 'forecast', label: 'FIRE' },
    { id: 'whatif', label: 'Simulation (Beta)' }
  ]

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === tab.id
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
        {activeTab === 'forecast' && <ForecastTab data={data} />}
        {activeTab === 'whatif' && <WhatIfTab data={data} />}
      </div>
    </div>
  )
}

export default Dashboard
