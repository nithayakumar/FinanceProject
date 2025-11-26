import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

export function TaxBreakdownChart({ calculations, country }) {
    if (!calculations) return null

    const { totals } = calculations
    const takeHome = totals.totalIncome - totals.totalTax

    const stateLabel = country === 'Canada' ? 'Provincial Income Tax' : 'State Income Tax'

    const data = [
        { name: stateLabel, value: totals.totalStateTax, color: '#F87171' }, // red-400
        { name: 'Federal Income Tax', value: totals.totalFederalTax, color: '#60A5FA' }, // blue-400
        { name: 'Federal (Other)', value: totals.totalFICA, color: '#FBBF24' }, // amber-400
        { name: 'Take Home', value: takeHome, color: '#34D399' } // emerald-400
    ].filter(item => item.value > 0)

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            const percent = ((data.value / totals.totalIncome) * 100).toFixed(1)
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
                    <p className="font-medium text-gray-900">{data.name}</p>
                    <p className="text-gray-600">
                        ${Math.round(data.value).toLocaleString()} ({percent}%)
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Breakdown</h3>
            <div style={{ width: '100%', height: 256 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
