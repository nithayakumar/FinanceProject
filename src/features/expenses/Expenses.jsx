import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import SplitLayout from '../../shared/components/SplitLayout'
import { useExpensesData } from './hooks/useExpensesData'
import { CurrentExpensesCard } from './components/CurrentExpensesCard'
import { ExpenseTimelineCard } from './components/ExpenseTimelineCard'
import { OneTimeExpensesCard } from './components/OneTimeExpensesCard'
import { ExpensesChart } from './components/ExpensesChart'
import { ExpensesSummary } from './components/ExpensesSummary'

function Expenses() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState('PV')

  // Refs for scrolling
  const currentExpensesRef = useRef(null)
  const expenseTimelineRef = useRef(null)
  const oneTimeExpensesRef = useRef(null)

  const {
    data,
    incomeData,
    projections,
    actions
  } = useExpensesData()

  // Calculate default simple expense (50% of monthly gross)
  const defaultSimpleExpense = useMemo(() => {
    if (!incomeData || !incomeData.incomeStreams) return 0
    const totalAnnual = incomeData.incomeStreams.reduce((sum, s) => sum + (Number(s.annualIncome) || 0), 0)
    return Math.round((totalAnnual / 12) * 0.5)
  }, [incomeData])

  // Initialize simple expense if empty
  useEffect(() => {
    if (data.simpleMode && !data.totalMonthlyExpense && defaultSimpleExpense > 0) {
      actions.updateSimpleMode(true, defaultSimpleExpense)
    }
  }, [data.simpleMode, data.totalMonthlyExpense, defaultSimpleExpense])

  const handleNextFeature = () => {
    navigate('/investments')
  }

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const InputSection = (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expenses 💸</h1>
      </div>

      {/* Mode Toggle */}
      <div className="bg-gray-100 p-1 rounded-lg inline-flex">
        <button
          onClick={() => actions.updateSimpleMode(true)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${data.simpleMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Simple Expenses
        </button>
        <button
          onClick={() => actions.updateSimpleMode(false)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${!data.simpleMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Spend Categories
        </button>
      </div>

      {data.simpleMode ? (
        <div className="space-y-6">
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Total Monthly Expenses</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <Input
                label="Monthly Amount 💵"
                prefix="$"
                value={data.totalMonthlyExpense}
                onChange={(val) => actions.updateSimpleMode(true, val ? Number(val) : '')}
                placeholder={defaultSimpleExpense.toString()}
                type="number"
              />
              <Input
                label="Growth Rate 📈"
                suffix="%"
                value={data.simpleGrowthRate !== undefined ? data.simpleGrowthRate : 3}
                onChange={(val) => actions.updateSimpleMode(true, undefined, val ? Number(val) : '')}
                placeholder="3"
                type="number"
              />
            </div>
          </Card>

          <div ref={oneTimeExpensesRef}>
            <OneTimeExpensesCard
              oneTimeExpenses={data.oneTimeExpenses}
              onAdd={actions.addOneTimeExpense}
              onUpdate={actions.updateOneTimeExpense}
              onRemove={actions.removeOneTimeExpense}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Navigation Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => scrollToSection(currentExpensesRef)}
              className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Current Expenses
            </button>
            <button
              onClick={() => scrollToSection(expenseTimelineRef)}
              className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Change in Expenses
            </button>
            <button
              onClick={() => scrollToSection(oneTimeExpensesRef)}
              className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              One-Time Expenses
            </button>
          </div>

          <div ref={currentExpensesRef}>
            <CurrentExpensesCard
              categories={data.expenseCategories}
              onUpdate={actions.updateCategory}
            />
          </div>

          <div ref={expenseTimelineRef}>
            <ExpenseTimelineCard
              categories={data.expenseCategories}
              onAddJump={actions.addJump}
              onUpdateJump={actions.updateJump}
              onRemoveJump={actions.removeJump}
              onMoveJump={actions.moveJump}
            />
          </div>

          <div ref={oneTimeExpensesRef}>
            <OneTimeExpensesCard
              oneTimeExpenses={data.oneTimeExpenses}
              onAdd={actions.addOneTimeExpense}
              onUpdate={actions.updateOneTimeExpense}
              onRemove={actions.removeOneTimeExpense}
            />
          </div>
        </div>
      )}
    </div>
  )

  const OutputSection = (
    <div className="h-full flex flex-col">
      <ExpensesSummary
        summary={projections.summary}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        viewMode={viewMode}
        setViewMode={setViewMode}
        expenseCategories={data.simpleMode ? [{ id: 'simple-total', category: 'Total Expenses' }] : data.expenseCategories}
      />

      <div className="mt-6">
        <ExpensesChart
          data={viewMode === 'PV' ? projections.chartData.chartDataPV : projections.chartData.chartDataNominal}
          activeTab={activeTab}
          expenseCategories={data.simpleMode ? [{ id: 'simple-total', category: 'Total Expenses' }] : data.expenseCategories}
          viewMode={viewMode}
        />
      </div>

      <div className="mt-8 pt-2">
        <button
          onClick={handleNextFeature}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition shadow-sm"
        >
          Continue to Investments →
        </button>
      </div>
    </div>
  )

  return <SplitLayout inputSection={InputSection} outputSection={OutputSection} />
}

export default Expenses
