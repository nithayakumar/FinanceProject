import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
    projections,
    actions
  } = useExpensesData()

  const handleNextFeature = () => {
    navigate('/investments-debt')
  }

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const InputSection = (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expenses 💸</h1>
      </div>

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

      <div className="space-y-6">
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
        expenseCategories={data.expenseCategories}
      />

      <div className="mt-6">
        <ExpensesChart
          data={viewMode === 'PV' ? projections.chartData.chartDataPV : projections.chartData.chartDataNominal}
          activeTab={activeTab}
          expenseCategories={data.expenseCategories}
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
