import React, { useState, useMemo } from 'react'
import {
    getAvailableStates,
    getAvailableCountries,
    getAvailableTaxTypes,
    getAvailableFilingStatuses,
    getTaxLadder,
    mapFilingStatusToCSV
} from '../csvTaxLadders'

export function TaxLadderViewer({ defaultState, defaultCountry }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [region, setRegion] = useState('Federal') // Federal or State_Province
    const [jurisdiction, setJurisdiction] = useState(defaultCountry || 'USA')
    const [taxType, setTaxType] = useState('Income')
    const [filingStatus, setFilingStatus] = useState('Single')

    // Get available options
    const states = useMemo(() => getAvailableStates(), [])
    const countries = useMemo(() => getAvailableCountries(), [])
    const taxTypes = useMemo(() => getAvailableTaxTypes(), [])
    const filingStatuses = useMemo(() => getAvailableFilingStatuses(), [])

    // Get current ladder
    const ladder = useMemo(() => {
        return getTaxLadder(region, jurisdiction, taxType, filingStatus)
    }, [region, jurisdiction, taxType, filingStatus])

    if (!isExpanded) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mt-6">
                <button
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center justify-between w-full text-left"
                >
                    <h3 className="font-medium text-gray-900">Tax Ladder Viewer</h3>
                    <span className="text-gray-400 text-xl">+</span>
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mt-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Tax Ladder Viewer</h3>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                >
                    −
                </button>
            </div>

            <div className="space-y-4 mb-6">
                {/* Region Selector */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Region Type</label>
                    <div className="flex rounded-md shadow-sm">
                        <button
                            onClick={() => {
                                setRegion('Federal')
                                setJurisdiction(defaultCountry || 'USA')
                            }}
                            className={`flex-1 px-3 py-2 text-sm border rounded-l-md ${region === 'Federal'
                                ? 'bg-blue-50 border-blue-200 text-blue-700 z-10'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            Federal
                        </button>
                        <button
                            onClick={() => {
                                setRegion('State_Province')
                                setJurisdiction(defaultState || 'California')
                            }}
                            className={`flex-1 px-3 py-2 text-sm border-t border-b border-r rounded-r-md ${region === 'State_Province'
                                ? 'bg-blue-50 border-blue-200 text-blue-700 z-10'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            State
                        </button>
                    </div>
                </div>

                {/* Jurisdiction Selector */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        {region === 'Federal' ? 'Country' : 'State/Province'}
                    </label>
                    <select
                        value={jurisdiction}
                        onChange={(e) => setJurisdiction(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                        {(region === 'Federal' ? countries : states).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>

                {/* Tax Type Selector */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tax Type</label>
                    <select
                        value={taxType}
                        onChange={(e) => setTaxType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                        {taxTypes.map(opt => (
                            <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                </div>

                {/* Filing Status Selector */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Filing Status</label>
                    <select
                        value={filingStatus}
                        onChange={(e) => setFilingStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                        {filingStatuses.map(opt => (
                            <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Ladder Display */}
            {ladder ? (
                <div className="overflow-hidden border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Range</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {ladder.brackets.map((bracket, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-sm text-gray-900">
                                        ${bracket.min.toLocaleString()} - {bracket.max > 9999999 ? '∞' : `$${bracket.max.toLocaleString()}`}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                                        {(bracket.rate * 100).toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-8 bg-gray-50 rounded-md border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500">No tax ladder found for this combination.</p>
                </div>
            )}
        </div>
    )
}
