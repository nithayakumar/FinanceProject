import React, { useState, useEffect } from 'react'
import { Card } from '../../../shared/ui/Card'
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
    // Load expanded state from localStorage, default to false
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = sessionStorage.getItem('taxAdvancedOptionsExpanded')
        return saved === 'true'
    })

    // Save expanded state to localStorage whenever it changes
    useEffect(() => {
        sessionStorage.setItem('taxAdvancedOptionsExpanded', isExpanded.toString())
    }, [isExpanded])

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

            {/* Tax Configuration Card */}
            <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Configuration</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                            Your Filing Status
                        </label>
                        <div className="px-3 py-2 bg-gray-50 rounded text-sm text-gray-700 border border-gray-200">
                            {getFilingStatusLabel(data.filingStatus)}
                        </div>
                    </div>

                    {remapOptions && remapOptions.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
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
                            {filingStatusRemap && (
                                <p className="mt-2 text-xs text-blue-600">
                                    Using <strong>{getFilingStatusLabel(filingStatusRemap)}</strong> brackets
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Expandable Advanced Options */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center text-sm text-gray-600 hover:text-gray-900 font-medium group"
                    >
                        <div className={`mr-2 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-200 transition ${isExpanded ? 'rotate-90' : ''}`}>
                            ▶
                        </div>
                        Advanced Options (Deductions & Credits)
                    </button>

                    {isExpanded && (
                        <div className="mt-4 space-y-6 animate-fadeIn">
                            {/* Standard Deductions */}
                            {standardDeductions && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Standard Deductions</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-2">
                                                Federal ({data.country})
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        value={standardDeductions.federal ?? getDefaultStandardDeduction('federal')}
                                                        onChange={(e) => handleStandardDeductionChange('federal', e.target.value)}
                                                        onBlur={(e) => handleStandardDeductionChange('federal', e.target.value, true)}
                                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                {hasCustomStandardDeductions?.federal && (
                                                    <button
                                                        onClick={() => handleResetStandardDeduction('federal')}
                                                        className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md whitespace-nowrap"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-500 mb-2">
                                                {data.country === 'Canada' ? 'Provincial' : 'State'} ({data.state})
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        value={standardDeductions.state ?? getDefaultStandardDeduction('state')}
                                                        onChange={(e) => handleStandardDeductionChange('state', e.target.value)}
                                                        onBlur={(e) => handleStandardDeductionChange('state', e.target.value, true)}
                                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                {hasCustomStandardDeductions?.state && (
                                                    <button
                                                        onClick={() => handleResetStandardDeduction('state')}
                                                        className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md whitespace-nowrap"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tax Credits */}
                            {taxCredits && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Tax Credits</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-2">
                                                Federal ({data.country})
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        value={taxCredits.federal ?? getDefaultTaxCredit('federal')?.amount ?? 0}
                                                        onChange={(e) => handleTaxCreditChange('federal', e.target.value)}
                                                        onBlur={(e) => handleTaxCreditChange('federal', e.target.value, true)}
                                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                {hasCustomTaxCredits?.federal && (
                                                    <button
                                                        onClick={() => handleResetTaxCredit('federal')}
                                                        className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md whitespace-nowrap"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-500 mb-2">
                                                {data.country === 'Canada' ? 'Provincial' : 'State'} ({data.state})
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        value={taxCredits.state ?? getDefaultTaxCredit('state')?.amount ?? 0}
                                                        onChange={(e) => handleTaxCreditChange('state', e.target.value)}
                                                        onBlur={(e) => handleTaxCreditChange('state', e.target.value, true)}
                                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                {hasCustomTaxCredits?.state && (
                                                    <button
                                                        onClick={() => handleResetTaxCredit('state')}
                                                        className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md whitespace-nowrap"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                💡 Deductions & credits are inflation-adjusted in long-term projections
                            </p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
