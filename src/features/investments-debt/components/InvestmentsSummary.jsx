import React from 'react'
import { Card } from '../../../shared/ui/Card'

function SummaryCard({ title, value, subtitle, highlight }) {
    return (
        <div className={`p-4 rounded-lg border ${highlight ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'}`}>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</h3>
            <div className={`text-2xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>
                {value}
            </div>
            {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
        </div>
    )
}

export function InvestmentsSummary({ summary, yearsToRetirement, chartData, investments, viewMode, setViewMode }) {
    const isReal = viewMode === 'real'

    // Helper to format large numbers compactly
    const formatCompact = (val) => {
        if (!val) return '$0'
        if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`
        if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`
        return `$${Math.round(val).toLocaleString()}`
    }

    // Get correct values based on view mode
    const currentNetWorth = isReal ? summary.currentNetWorthPV : summary.currentNetWorth
    const year10NetWorth = isReal ? summary.year10NetWorthPV : summary.year10NetWorth
    const retirementNetWorth = isReal ? summary.retirementNetWorthPV : summary.retirementNetWorth

    const growthAmount = retirementNetWorth - currentNetWorth

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Savings & Investments Summary</h2>

                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('nominal')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!isReal ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Future Dollars
                    </button>
                    <button
                        onClick={() => setViewMode('real')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${isReal ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Today's Dollars
                    </button>
                </div>
            </div>

            {/* Primary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Current Total Savings"
                    value={formatCompact(currentNetWorth)}
                    subtitle="Cash + 401k + Investments"
                    highlight
                />
                <SummaryCard
                    title="Year 10 Projected"
                    value={formatCompact(year10NetWorth)}
                    subtitle={`+${formatCompact(year10NetWorth - currentNetWorth)} growth`}
                />
                <SummaryCard
                    title="Retirement Total"
                    value={formatCompact(retirementNetWorth)}
                    subtitle={`Year ${yearsToRetirement}`}
                    highlight
                />
                <SummaryCard
                    title="Total Growth"
                    value={`+${summary.netWorthGrowthPercent.toFixed(0)}%`}
                    subtitle={`${formatCompact(growthAmount)} gains`}
                />
            </div>

            {/* Milestones Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700">Projected Values at Key Milestones</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left py-3 px-6 font-semibold text-gray-600">Milestone</th>
                                <th className="text-right py-3 px-6 font-semibold text-gray-600">Cash</th>
                                <th className="text-right py-3 px-6 font-semibold text-gray-600">401(k)</th>
                                <th className="text-right py-3 px-6 font-semibold text-gray-600">Investments</th>
                                <th className="text-right py-3 px-6 font-semibold text-gray-600">Total Net Worth</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {[
                                { label: 'Today', data: chartData[0] },
                                { label: 'Year 5', data: chartData[4] },
                                { label: 'Year 10', data: chartData[9] },
                                { label: 'Year 20', data: chartData[19] },
                                { label: `Retirement (Yr ${yearsToRetirement})`, data: chartData[yearsToRetirement - 1] }
                            ].map((milestone, index) => {
                                if (!milestone.data) return null

                                // Get correct values based on view mode
                                const cash = isReal ? milestone.data.cashPV : milestone.data.cash
                                const retirement401k = isReal ? milestone.data.retirement401kValuePV : milestone.data.retirement401kValue

                                // Sum investments
                                const investmentsTotal = milestone.data.investments.reduce((sum, inv) => {
                                    return sum + (isReal ? (inv.marketValuePV || 0) : (inv.marketValue || 0))
                                }, 0)

                                const total = cash + retirement401k + investmentsTotal

                                return (
                                    <tr key={index} className={`hover:bg-gray-50 ${index === 0 || index === 4 ? 'bg-blue-50/50' : ''}`}>
                                        <td className="py-3 px-6 font-medium text-gray-900">{milestone.label}</td>
                                        <td className="text-right py-3 px-6 text-gray-600">{formatCompact(cash)}</td>
                                        <td className="text-right py-3 px-6 text-gray-600">{formatCompact(retirement401k)}</td>
                                        <td className="text-right py-3 px-6 text-gray-600">{formatCompact(investmentsTotal)}</td>
                                        <td className="text-right py-3 px-6 font-bold text-gray-900">{formatCompact(total)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
