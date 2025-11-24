import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SplitLayout from '../../shared/components/SplitLayout'
import { Button } from '../../shared/ui/Button'
import { useInvestmentsData } from './hooks/useInvestmentsData'
import { CashCard } from './components/CashCard'
import { Retirement401kCard } from './components/Retirement401kCard'
import { InvestmentCard } from './components/InvestmentCard'
import { InvestmentsChart } from './components/InvestmentsChart'
import { InvestmentsSummary } from './components/InvestmentsSummary'

function InvestmentsDebt() {
  const navigate = useNavigate()
  const {
    data,
    projections,
    errors,
    isCalculating,
    actions
  } = useInvestmentsData()

  const [viewMode, setViewMode] = useState('nominal') // 'nominal' or 'real'

  const handleNextFeature = () => {
    navigate('/taxes')
  }

  const InputSection = (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cash & Investments 🏦</h1>
        <Button onClick={actions.addInvestment}>
          <span className="mr-1">+</span> Add Investment
        </Button>
      </div>

      <div className="space-y-6">
        <CashCard
          data={data}
          onUpdate={actions.updateField}
          errors={errors}
        />

        <Retirement401kCard
          data={data.retirement401k}
          onUpdate={actions.update401k}
          errors={errors}
        />

        {data.investments.map((investment, index) => (
          <InvestmentCard
            key={investment.id}
            index={index}
            investment={investment}
            onUpdate={actions.updateInvestment}
            onRemove={actions.removeInvestment}
            canRemove={data.investments.length > 0}
          />
        ))}
      </div>
    </div>
  )

  const OutputSection = (
    <div className="h-full flex flex-col">
      {isCalculating ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Calculating projections...
        </div>
      ) : projections ? (
        <>
          <InvestmentsSummary
            summary={projections.summary}
            yearsToRetirement={projections.projections.length}
            chartData={projections.projections}
            investments={data.investments}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          <div className="mt-6">
            <InvestmentsChart
              data={projections.projections}
              investments={data.investments}
              viewMode={viewMode}
            />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Please complete Income and Expenses sections to see projections.
        </div>
      )}

      <div className="mt-8 pt-2">
        <button
          onClick={handleNextFeature}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition shadow-sm"
        >
          Continue to Taxes →
        </button>
      </div>
    </div>
  )

  return <SplitLayout inputSection={InputSection} outputSection={OutputSection} />
}

export default InvestmentsDebt
