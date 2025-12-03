import React from 'react'
import { getFilingStatusLabel } from '../hooks/useTaxData'

export function TaxSettings({
    data,
    filingStatusRemap,
    handleRemapChange,
    remapOptions,
    missingFilingStatus,
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
}) {
    return (
        <div className="space-y-6">
            {/* Missing Status Warning */}
            {missingFilingStatus && !filingStatusRemap && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                    <div className="flex items-start">
                        <span className="text-amber-600 text-xl mr-3">⚠️</span>
                        <div className="flex-1">
                            <p className="text-amber-900 font-medium mb-2">
                                "{missingFilingStatus.status}" isn't available for {missingFilingStatus.location}.
                            </p>
                            <p className="text-amber-800 text-sm mb-3">
                                We'll temporarily use {missingFilingStatus.suggestedLabel || 'the closest available'} brackets.
                            </p>
                            {missingFilingStatus.suggestedStatus && (
                                <button
                                    onClick={() => handleRemapChange(missingFilingStatus.suggestedStatus)}
                                    className="w-full px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition"
                                >
                                    Accept & use {missingFilingStatus.suggestedLabel} brackets
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Filing Status Remapping */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-3">Filing Status Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Override the tax brackets used for {getFilingStatusLabel(data.filingStatus)} in {data.state}.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                            Your Filing Status
                        </label>
                        <div className="px-3 py-2 bg-gray-50 rounded text-sm text-gray-700 border border-gray-200">
                            {getFilingStatusLabel(data.filingStatus)}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                            Use Brackets For
                        </label>
                        <select
                            value={filingStatusRemap}
                            onChange={(e) => handleRemapChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Default ({getFilingStatusLabel(data.filingStatus)})</option>
                            {remapOptions.map(status => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {filingStatusRemap && (
                    <p className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100">
                        ℹ️ Calculations will use <strong>{getFilingStatusLabel(filingStatusRemap)}</strong> brackets.
                    </p>
                )}
            </div>

            {/* Standard Deductions */}
            {standardDeductions && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Standard Deductions</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Deductions are applied to reduce taxable income. Values are automatically set based on your location and filing status, but can be customized.
                    </p>

                    <div className="space-y-4">
                        {/* Federal Standard Deduction */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                Federal Standard Deduction ({data.country})
                            </label>
                            <div className="flex items-center space-x-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={standardDeductions.federal ?? getDefaultStandardDeduction('federal')}
                                        onChange={(e) => handleStandardDeductionChange('federal', e.target.value)}
                                        onBlur={(e) => handleStandardDeductionChange('federal', e.target.value, true)}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={getDefaultStandardDeduction('federal')?.toString()}
                                    />
                                </div>
                                {hasCustomStandardDeductions?.federal && (
                                    <button
                                        onClick={() => handleResetStandardDeduction('federal')}
                                        className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                                        title="Reset to default"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            {hasCustomStandardDeductions?.federal && (
                                <p className="mt-1 text-xs text-blue-600">
                                    Custom value (default: ${getDefaultStandardDeduction('federal')?.toLocaleString()})
                                </p>
                            )}
                        </div>

                        {/* State Standard Deduction */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                {data.country === 'Canada' ? 'Provincial' : 'State'} Standard Deduction ({data.state})
                            </label>
                            <div className="flex items-center space-x-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={standardDeductions.state ?? getDefaultStandardDeduction('state')}
                                        onChange={(e) => handleStandardDeductionChange('state', e.target.value)}
                                        onBlur={(e) => handleStandardDeductionChange('state', e.target.value, true)}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={getDefaultStandardDeduction('state')?.toString()}
                                    />
                                </div>
                                {hasCustomStandardDeductions?.state && (
                                    <button
                                        onClick={() => handleResetStandardDeduction('state')}
                                        className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                                        title="Reset to default"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            {hasCustomStandardDeductions?.state && (
                                <p className="mt-1 text-xs text-blue-600">
                                    Custom value (default: ${getDefaultStandardDeduction('state')?.toLocaleString()})
                                </p>
                            )}
                        </div>
                    </div>

                    <p className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                        💡 Standard deductions are inflation-adjusted over time in long-term projections.
                    </p>
                </div>
            )}

            {/* Tax Credits (Editable) */}
            {taxCredits && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Tax Credits</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Tax credits directly reduce your tax liability after calculating your taxes. Values are automatically set based on your location and filing status, but can be customized.
                    </p>

                    <div className="space-y-4">
                        {/* Federal Tax Credit */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                Federal Tax Credit ({data.country})
                            </label>
                            <div className="flex items-center space-x-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={taxCredits.federal ?? getDefaultTaxCredit('federal')?.amount ?? 0}
                                        onChange={(e) => handleTaxCreditChange('federal', e.target.value)}
                                        onBlur={(e) => handleTaxCreditChange('federal', e.target.value, true)}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={(getDefaultTaxCredit('federal')?.amount ?? 0).toString()}
                                    />
                                </div>
                                {hasCustomTaxCredits?.federal && (
                                    <button
                                        onClick={() => handleResetTaxCredit('federal')}
                                        className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                                        title="Reset to default"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            {hasCustomTaxCredits?.federal && (
                                <p className="mt-1 text-xs text-blue-600">
                                    Custom value (default: ${(getDefaultTaxCredit('federal')?.amount ?? 0).toLocaleString()})
                                </p>
                            )}
                        </div>

                        {/* State/Provincial Tax Credit */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                {data.country === 'Canada' ? 'Provincial' : 'State'} Tax Credit ({data.state})
                            </label>
                            <div className="flex items-center space-x-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={taxCredits.state ?? getDefaultTaxCredit('state')?.amount ?? 0}
                                        onChange={(e) => handleTaxCreditChange('state', e.target.value)}
                                        onBlur={(e) => handleTaxCreditChange('state', e.target.value, true)}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={(getDefaultTaxCredit('state')?.amount ?? 0).toString()}
                                    />
                                </div>
                                {hasCustomTaxCredits?.state && (
                                    <button
                                        onClick={() => handleResetTaxCredit('state')}
                                        className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                                        title="Reset to default"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            {hasCustomTaxCredits?.state && (
                                <p className="mt-1 text-xs text-blue-600">
                                    Custom value (default: ${(getDefaultTaxCredit('state')?.amount ?? 0).toLocaleString()})
                                </p>
                            )}
                        </div>
                    </div>

                    <p className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                        💡 Tax credits are inflation-adjusted over time in long-term projections.
                    </p>
                </div>
            )}
        </div>
    )
}
