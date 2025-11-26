import React from 'react'
import { useNavigate } from 'react-router-dom'
import SplitLayout from '../../shared/components/SplitLayout'
import { useTaxData } from './hooks/useTaxData'
import { TaxSummary } from './components/TaxSummary'
import { TaxBreakdownChart } from './components/TaxBreakdownChart'
import { TaxSettings } from './components/TaxSettings'
import { TaxLadderViewer } from './components/TaxLadderViewer'
import { TaxMappingNotification } from './components/TaxMappingNotification'

function Taxes() {
  const navigate = useNavigate()
  const {
    data,
    calculations,
    isSaved,
    filingStatusRemap,
    missingFilingStatus,
    remapOptions,
    handleRemapChange
  } = useTaxData()

  const handleNextFeature = () => {
    navigate('/dashboard')
  }

  // Left Panel Content (Settings & Configuration)
  const InputSection = (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Taxes 💸</h1>
        {isSaved && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Saved
          </span>
        )}
      </div>

      <TaxMappingNotification
        filingStatus={data.filingStatus}
        state={data.state}
        country={data.country}
        filingStatusRemap={filingStatusRemap}
        missingFilingStatus={missingFilingStatus}
      />

      <section>
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Configuration</h2>
        <TaxSettings
          data={data}
          filingStatusRemap={filingStatusRemap}
          handleRemapChange={handleRemapChange}
          remapOptions={remapOptions}
          missingFilingStatus={missingFilingStatus}
        />
      </section>

      <section>
        <TaxLadderViewer
          defaultState={data.state}
          defaultCountry={data.country}
        />
      </section>

      {calculations && (
        <section>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Total Tax Breakdown</h3>
            {calculations.individual.map((calc, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Total Income</h4>
                    <p className="text-sm text-gray-500">${Math.round(calc.income).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">Tax: ${Math.round(calc.totalTax).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{(calc.effectiveRate * 100).toFixed(1)}% effective</p>
                  </div>
                </div>

                {/* Mini Breakdown */}
                <div className="grid grid-cols-3 gap-4 text-xs text-gray-600 mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <span className="block text-gray-400 mb-0.5">State</span>
                    <span className="font-medium">${Math.round(calc.stateTax).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 mb-0.5">Federal</span>
                    <span className="font-medium">${Math.round(calc.federalTax).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 mb-0.5">FICA</span>
                    <span className="font-medium">${Math.round(calc.fica.total).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )

  // Right Panel Content (Results & Visualization)
  const OutputSection = (
    <div className="h-full flex flex-col">
      {!calculations ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <p className="mb-4">No income data found.</p>
            <button
              onClick={() => navigate('/income')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Add Income →
            </button>
          </div>
        </div>
      ) : (
        <>
          <TaxSummary calculations={calculations} data={data} />

          <div className="mt-8 space-y-8">
            <TaxBreakdownChart calculations={calculations} country={data.country} />
          </div>

          <div className="mt-8 pt-4 pb-8">
            <button
              onClick={handleNextFeature}
              className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition shadow-sm"
            >
              Check out results →
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <SplitLayout
      inputSection={InputSection}
      outputSection={OutputSection}
    />
  )
}

export default Taxes
