import React from 'react'
import { Card } from '../../../shared/ui/Card'

function SummaryCard({ title, value, subtitle, subtext, highlight }) {
    return (
        <div className={`p-4 rounded-lg border ${highlight ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'}`}>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</h3>
            <div className={`text-2xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>
                {value}
            </div>
            {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
            {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
        </div>
    )
}

export function IncomeSummary({
    summary,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    incomeStreams
}) {
    const currentSummary = activeTab === 'all'
        ? summary
        : summary.perStreamSummaries?.find(s => s.streamId === activeTab) || summary

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Income Summary</h2>
                <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-medium">
                    <button
                        onClick={() => setViewMode('PV')}
                        className={`px-3 py-1.5 rounded-md transition ${viewMode === 'PV' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Today's Dollars
                    </button>
                    <button
                        onClick={() => setViewMode('Nominal')}
                        className={`px-3 py-1.5 rounded-md transition ${viewMode === 'Nominal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Future Dollars
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition whitespace-nowrap ${activeTab === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    All Streams
                </button>
                {incomeStreams.map(stream => (
                    <button
                        key={stream.id}
                        onClick={() => setActiveTab(stream.id)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition whitespace-nowrap ${activeTab === stream.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {stream.name || 'Unnamed'}
                    </button>
                ))}
            </div>

            {/* Primary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SummaryCard
                    title="Lifetime Earnings"
                    value={viewMode === 'PV'
                        ? `$${(currentSummary.lifetimeEarningsPV / 1000000).toFixed(2)}M`
                        : `$${(currentSummary.lifetimeEarningsNominal / 1000000).toFixed(2)}M`
                    }
                    subtitle={viewMode === 'PV'
                        ? `Future Value: $${(currentSummary.lifetimeEarningsNominal / 1000000).toFixed(2)}M`
                        : `Present Value: $${(currentSummary.lifetimeEarningsPV / 1000000).toFixed(2)}M`
                    }
                    highlight
                />
                <SummaryCard
                    title="Avg Annual Growth"
                    value={`${summary.averageAnnualGrowth.toFixed(1)}%`}
                />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Salary</div>
                    <div className="font-semibold text-sm">
                        ${((viewMode === 'PV' ? currentSummary.totalSalaryPV : currentSummary.totalSalaryNominal) / 1000000).toFixed(2)}M
                    </div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Equity</div>
                    <div className="font-semibold text-sm">
                        ${((viewMode === 'PV' ? currentSummary.totalEquityPV : currentSummary.totalEquityNominal) / 1000000).toFixed(2)}M
                    </div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">401k</div>
                    <div className="font-semibold text-sm">
                        ${((viewMode === 'PV' ? currentSummary.total401kPV : currentSummary.total401kNominal) / 1000000).toFixed(2)}M
                    </div>
                </div>
            </div>
        </div>
    )
}
