import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function InvestmentsChart({ data, investments, viewMode }) {
    const isPV = viewMode === 'PV'

    // Transform gap projections to chart data format
    const chartData = data.map(p => {
        const chartPoint = {
            year: p.year,
            cash: isPV ? p.cashPV : p.cash,
            retirement401k: isPV ? p.retirement401kValuePV : p.retirement401kValue
        }

        // Add individual investments
        p.investments.forEach((inv, idx) => {
            chartPoint[`investment${idx + 1}`] = isPV
                ? (inv.marketValuePV || 0)
                : inv.marketValue
        })

        return chartPoint
    })

    // Calculate max value to determine formatting unit
    const maxValue = Math.max(...chartData.map(d => {
        let sum = (d.cash || 0) + (d.retirement401k || 0)
        investments.forEach((_, i) => {
            sum += (d[`investment${i + 1}`] || 0)
        })
        return sum
    }))

    const useMillions = maxValue >= 1000000

    const formatYAxis = (value) => {
        if (value === 0) return '$0'
        if (useMillions) return `$${(value / 1000000).toFixed(1)}M`
        return `$${(value / 1000).toFixed(0)}k`
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Portfolio Growth Over Time</h2>
            <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="year"
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis
                        tickFormatter={formatYAxis}
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
                        animationDuration={1000}
                        animationEasing="ease-out"
                    />
                    <Area
                        type="monotone"
                        dataKey="retirement401k"
                        stackId="1"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        name="401(k)"
                        animationDuration={1000}
                        animationEasing="ease-out"
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
                            animationDuration={1000}
                            animationEasing="ease-out"
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
