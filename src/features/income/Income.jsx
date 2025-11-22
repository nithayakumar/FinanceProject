import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { INCOME_CONFIG } from '../../core'
import SplitLayout from '../../shared/components/SplitLayout'
import { Button } from '../../shared/ui/Button'
import { useIncomeData } from './hooks/useIncomeData'
import { IncomeStreamCard } from './components/IncomeStreamCard'
import { IncomeChart } from './components/IncomeChart'
import { IncomeSummary } from './components/IncomeSummary'

function Income() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState('PV')

  const {
    data,
    projections,
    expandedStreams,
    yearsToRetirement,
    actions
  } = useIncomeData()

  const handleNextFeature = () => {
    navigate('/expenses')
  }

  const InputSection = (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Income 💰</h1>
        {data.incomeStreams.length < INCOME_CONFIG.MAX_STREAMS && (
          <Button onClick={actions.addIncomeStream}>
            <span className="mr-1">+</span> Add Income Source
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {data.incomeStreams.map((stream) => (
          <IncomeStreamCard
            key={stream.id}
            stream={stream}
            isExpanded={expandedStreams[stream.id]}
            onToggleExpand={actions.toggleAdvanced}
            onUpdate={actions.updateStream}
            onRemove={actions.removeIncomeStream}
            canRemove={data.incomeStreams.length > 1}
            onAddJump={actions.addJump}
            onUpdateJump={actions.updateJump}
            onRemoveJump={actions.removeJump}
            onAddBreak={actions.addBreak}
            onUpdateBreak={actions.updateBreak}
            onRemoveBreak={actions.removeBreak}
            yearsToRetirement={yearsToRetirement}
          />
        ))}
      </div>
    </div>
  )

  const OutputSection = (
    <div className="h-full flex flex-col">
      <IncomeSummary
        summary={projections.summary}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        viewMode={viewMode}
        setViewMode={setViewMode}
        incomeStreams={data.incomeStreams}
      />

      <div className="mt-6">
        <IncomeChart
          data={viewMode === 'PV' ? projections.chartData.chartDataPV : projections.chartData.chartDataNominal}
          activeTab={activeTab}
          incomeStreams={data.incomeStreams}
          viewMode={viewMode}
        />
      </div>

      <div className="mt-8 pt-2">
        <button
          onClick={handleNextFeature}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition shadow-sm"
        >
          Continue to Expenses →
        </button>
      </div>
    </div>
  )

  return <SplitLayout inputSection={InputSection} outputSection={OutputSection} />
}

export default Income
