import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function ExpensesChart({ data, activeTab, expenseCategories, viewMode }) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-4 text-gray-700">
                Expense Projection ({viewMode === 'PV' ? 'Present Value' : 'Nominal'})
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
                        expenseCategories.map((category, index) => {
                            const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef']
                            return (
                                <Bar
                                    key={category.id}
                                    dataKey={category.category}
                                    stackId="a"
                                    fill={colors[index % colors.length]}
                                />
                            )
                        })
                    ) : (
                        <Bar
                            dataKey={expenseCategories.find(c => c.id === activeTab)?.category}
                            fill="#ef4444"
                        />
                    )}
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
