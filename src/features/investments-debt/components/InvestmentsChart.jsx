import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function InvestmentsChart({ data, investments, viewMode }) {
    const isReal = viewMode === 'real'

    // Transform gap projections to chart data format
    const chartData = data.map(p => {
        const chartPoint = {
            year: p.year,
            cash: isReal ? p.cashPV : p.cash,
            retirement401k: isReal ? p.retirement401kValuePV : p.retirement401kValue
        }

        // Add individual investments
        p.investments.forEach((inv, idx) => {
            chartPoint[`investment${idx + 1}`] = isReal
                ? (inv.marketValuePV || 0)
                : inv.marketValue
        })

        return chartPoint
    })

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Portfolio Growth Over Time</h2>
            <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="year"
                        label={{ value: 'Year', position: 'insideBottom', offset: -5, fontSize: 12 }}
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12 }}
                        width={60}
                    />
                    <Tooltip
                        formatter={(value) => `$${Math.round(value).toLocaleString()}`}
                        labelFormatter={(label) => `Year ${label}`}
                    />
                    <Legend />
                    <Area
                        type="monotone"
                        dataKey="cash"
                        stackId="1"
                        stroke="#10b981"
                        fill="#10b981"
                        name="Cash"
                    />
                    <Area
                        type="monotone"
                        dataKey="retirement401k"
                        stackId="1"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        name="401(k)"
                    />
                    {investments.map((_, index) => (
                        <Area
                            key={`inv-${index}`}
                            type="monotone"
                            dataKey={`investment${index + 1}`}
                            stackId="1"
                            stroke={['#8b5cf6', '#f59e0b', '#ef4444'][index % 3]}
                            fill={['#8b5cf6', '#f59e0b', '#ef4444'][index % 3]}
                            name={`Investment ${index + 1}`}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
