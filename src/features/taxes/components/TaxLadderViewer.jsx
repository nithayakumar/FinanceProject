import React, { useState, useMemo } from 'react'
import { Card } from '../../../shared/ui/Card'
import {
    getAvailableStates,
    getAvailableCountries,
    getAvailableTaxTypes,
    getFilingStatusesForTaxType,
    getTaxLadder
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

    // Get available filing statuses for current selection
    const filingStatuses = useMemo(() => {
        const statuses = getFilingStatusesForTaxType(region, jurisdiction, taxType)
        // Filter to only allow Single and Married (if they exist in the data)
        // Also allow 'All' for flat tax states
        return statuses.filter(s => ['Single', 'Married', 'All'].includes(s))
    }, [region, jurisdiction, taxType])

    // Auto-select valid filing status if current one is not available
    React.useEffect(() => {
        if (filingStatuses.length > 0 && !filingStatuses.includes(filingStatus)) {
            setFilingStatus(filingStatuses[0])
        }
    }, [filingStatuses, filingStatus])

    // Get current ladder
    const ladder = useMemo(() => {
        return getTaxLadder(region, jurisdiction, taxType, filingStatus)
    }, [region, jurisdiction, taxType, filingStatus])

    return (
        <Card>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Tax Bracket Viewer</h3>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-400 hover:text-gray-600 text-sm font-medium"
                >
                    {isExpanded ? 'Hide' : 'Show'}
                </button>
            </div>

            {isExpanded && (
                <div className="mt-6 animate-fadeIn">
                    <div className="space-y-4 mb-6">
                        {/* Region Selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Region Type</label>
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
                            <label className="block text-xs font-medium text-gray-500 mb-2">
                                {region === 'Federal' ? 'Country' : 'State/Province'}
                            </label>
                            <select
                                value={jurisdiction}
                                onChange={(e) => setJurisdiction(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                {(region === 'Federal' ? countries : states).map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tax Type Selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Tax Type</label>
                            <select
                                value={taxType}
                                onChange={(e) => setTaxType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                {taxTypes.map(opt => (
                                    <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filing Status Selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Filing Status</label>
                            <select
                                value={filingStatus}
                                onChange={(e) => setFilingStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                {filingStatuses.map(opt => (
                                    <option key={opt} value={opt}>
                                        {opt === 'Married' ? 'Couple' : opt.replace(/_/g, ' ')}
                                    </option>
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
            )}
        </Card>
    )
}
