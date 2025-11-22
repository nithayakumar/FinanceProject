import React from 'react'
import { Card } from '../../../shared/ui/Card'

function SummaryCard({ title, value, subtitle, subtext, highlight }) {
    return (
        <div className={`p-4 rounded-lg border ${highlight ? 'bg-red-50 border-red-100' : 'bg-white border-gray-200'}`}>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</h3>
            <div className={`text-2xl font-bold ${highlight ? 'text-red-700' : 'text-gray-900'}`}>
                {value}
            </div>
            {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
            {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
        </div>
    )
}

export function ExpensesSummary({
    summary,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    expenseCategories
}) {
    // Calculate current summary based on active tab
    // Note: The summary object passed in is global. We might need per-category summaries if we want to filter metrics.
    // For now, we'll show global metrics but filter the chart.

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Expenses Summary</h2>
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
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    All Categories
                </button>
                {expenseCategories.map(category => (
                    <button
                        key={category.id}
                        onClick={() => setActiveTab(category.id)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition whitespace-nowrap ${activeTab === category.id
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {category.category}
                    </button>
                ))}
            </div>

            {/* Primary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SummaryCard
                    title="Lifetime Expenses"
                    value={viewMode === 'PV'
                        ? `$${(summary.lifetimeExpensesPV / 1000000).toFixed(2)}M`
                        : `$${(summary.lifetimeExpensesNominal / 1000000).toFixed(2)}M`
                    }
                    subtitle={viewMode === 'PV'
                        ? `Future Value: $${(summary.lifetimeExpensesNominal / 1000000).toFixed(2)}M`
                        : `Present Value: $${(summary.lifetimeExpensesPV / 1000000).toFixed(2)}M`
                    }
                    highlight
                />
                <SummaryCard
                    title="Avg Monthly Spend (This Year)"
                    value={viewMode === 'PV'
                        ? `$${Math.round(summary.currentYearExpensesPV / 12).toLocaleString()}`
                        : `$${Math.round(summary.currentYearExpensesNominal / 12).toLocaleString()}`
                    }
                />
            </div>
        </div>
    )
}
