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

    // Calculate CAGR
    // (Ending / Beginning)^(1/n) - 1
    const cagr = yearsToRetirement > 0 && currentNetWorth > 0
        ? (Math.pow(retirementNetWorth / currentNetWorth, 1 / yearsToRetirement) - 1) * 100
        : 0

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
                    title="Savings & Investments"
                    value={formatCompact(currentNetWorth)}
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
                    title="CAGR"
                    value={`${cagr.toFixed(1)}%`}
                    subtitle="Annual Growth"
                />
            </div>
        </div>
    )
}
