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

export function InvestmentsSummary({ summary, yearsToRetirement, chartData, investments }) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">Savings & Investments Summary</h2>

            {/* Primary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Current Total Savings"
                    value={`$${(summary.currentNetWorth / 1000).toFixed(0)}k`}
                    subtitle="Cash + 401k + Investments"
                    highlight
                />
                <SummaryCard
                    title="Year 10 Projected"
                    value={`$${(summary.year10NetWorth / 1000).toFixed(0)}k`}
                    subtitle={`+$${((summary.year10NetWorth - summary.currentNetWorth) / 1000).toFixed(0)}k growth`}
                />
                <SummaryCard
                    title="Retirement Total"
                    value={`$${(summary.retirementNetWorth / 1000000).toFixed(2)}M`}
                    subtitle={`Year ${yearsToRetirement}`}
                    highlight
                />
                <SummaryCard
                    title="Total Growth"
                    value={`+${summary.netWorthGrowthPercent.toFixed(1)}%`}
                    subtitle={`$${((summary.retirementNetWorth - summary.currentNetWorth) / 1000).toFixed(0)}k gains`}
                />
            </div>

            {/* Milestones Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Projected Values at Key Milestones</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Milestone</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Cash</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700">401(k)</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Investments</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { year: 'Today', data: chartData[0] },
                                { year: 'Year 5', data: chartData[4] },
                                { year: 'Year 10', data: chartData[9] },
                                { year: 'Year 20', data: chartData[19] },
                                { year: `Year ${yearsToRetirement} (Retirement)`, data: chartData[yearsToRetirement - 1] }
                            ].map((milestone, index) => {
                                if (!milestone.data) return null
                                const investmentsTotal = investments.reduce((sum, _, i) => {
                                    return sum + (milestone.data[`investment${i + 1}`] || 0)
                                }, 0)
                                const total = (milestone.data.cash || 0) + (milestone.data.retirement401k || 0) + investmentsTotal
                                return (
                                    <tr key={index} className={`border-b border-gray-100 ${index === 0 || index === 4 ? 'bg-blue-50' : ''}`}>
                                        <td className="py-3 px-4 font-medium text-gray-900">{milestone.year}</td>
                                        <td className="text-right py-3 px-4">${Math.round(milestone.data.cash || 0).toLocaleString()}</td>
                                        <td className="text-right py-3 px-4">${Math.round(milestone.data.retirement401k || 0).toLocaleString()}</td>
                                        <td className="text-right py-3 px-4">${Math.round(investmentsTotal).toLocaleString()}</td>
                                        <td className="text-right py-3 px-4 font-bold">${Math.round(total).toLocaleString()}</td>
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
