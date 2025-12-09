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
    filingStatusRemap,
    missingFilingStatus,
    remapOptions,
    handleRemapChange,
    standardDeductions,
    handleStandardDeductionChange,
    handleResetStandardDeduction,
    getDefaultStandardDeduction,
    hasCustomStandardDeductions,
    taxCredits,
    handleTaxCreditChange,
    handleResetTaxCredit,
    getDefaultTaxCredit,
    hasCustomTaxCredits
  } = useTaxData()

  const handleNextFeature = () => {
    navigate('/dashboard')
  }

  // Left Panel Content (Settings & Configuration)
  const InputSection = (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Taxes 💸</h1>
      </div>

      <TaxMappingNotification
        filingStatus={data.filingStatus}
        state={data.state}
        country={data.country}
        filingStatusRemap={filingStatusRemap}
        missingFilingStatus={missingFilingStatus}
      />

      <TaxSettings
        data={data}
        filingStatusRemap={filingStatusRemap}
        handleRemapChange={handleRemapChange}
        remapOptions={remapOptions}
        missingFilingStatus={missingFilingStatus}
        standardDeductions={standardDeductions}
        handleStandardDeductionChange={handleStandardDeductionChange}
        handleResetStandardDeduction={handleResetStandardDeduction}
        getDefaultStandardDeduction={getDefaultStandardDeduction}
        hasCustomStandardDeductions={hasCustomStandardDeductions}
        taxCredits={taxCredits}
        handleTaxCreditChange={handleTaxCreditChange}
        handleResetTaxCredit={handleResetTaxCredit}
        getDefaultTaxCredit={getDefaultTaxCredit}
        hasCustomTaxCredits={hasCustomTaxCredits}
      />

      <TaxLadderViewer
        defaultState={data.state}
        defaultCountry={data.country}
      />
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

  return <SplitLayout inputSection={InputSection} outputSection={OutputSection} />
}

export default Taxes
