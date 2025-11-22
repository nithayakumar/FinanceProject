import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function IncomeChart({ data, activeTab, incomeStreams, viewMode }) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-4 text-gray-700">
                Income Projection ({viewMode === 'PV' ? 'Present Value' : 'Nominal'})
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="year"
                        tick={{ fontSize: 12 }}
                        interval={Math.floor(data.length / 5)}
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
                    {activeTab === 'all' ? (
                        incomeStreams.map((stream, index) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                            return (
                                <Bar
                                    key={stream.id}
                                    dataKey={stream.name}
                                    stackId="a"
                                    fill={colors[index % colors.length]}
                                />
                            )
                        })
                    ) : (
                        <Bar
                            dataKey={incomeStreams.find(s => s.id === activeTab)?.name}
                            fill="#3b82f6"
                        />
                    )}
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
