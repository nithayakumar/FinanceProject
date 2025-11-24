import React from 'react'
import { getFilingStatusLabel } from '../hooks/useTaxData'

export function TaxSettings({
    data,
    filingStatusRemap,
    handleRemapChange,
    remapOptions,
    missingFilingStatus
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
                    Override the tax brackets used for {data.filingStatus} in {data.state}.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                            Your Profile Status
                        </label>
                        <div className="px-3 py-2 bg-gray-50 rounded text-sm text-gray-700 border border-gray-200">
                            {data.filingStatus}
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
                            <option value="">Default ({data.filingStatus})</option>
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
        </div>
    )
}
