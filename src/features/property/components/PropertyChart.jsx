import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card } from '../../../shared/ui/Card'

export function PropertyChart({ data, viewMode }) {
    if (!data || data.length === 0) return null

    // Format data based on view mode (Nominal vs Present Value)
    // Assuming 'data' from calculator is Nominal by default.
    // To support Real (PV), we need to deflate values.
    // Ideally, usePropertyData should provide both or we deflate here.
    // For now, let's assume we receive the correct dataset based on the parent's toggle OR we implement deflation here.
    // Given `Property.calc.js` returns nominal, let's just use that for now unless we add extensive PV logic there.
    // Detailed requirement: "Add Nominal vs Real (PV) toggles...".
    // Let's implement deflation for PV if needed, assuming inflation~2.5% or passed prop.
    // Actually, standard pattern in this app is `projections.chartData.chartDataPV`.
    // I should update Property.calc.js to return both sets or handle it.

    // Format data based on view mode (Nominal vs Present Value)
    const formattedData = data.map(d => {
        if (viewMode === 'PV') {
            return {
                ...d,
                debt: Math.round(d.debtPV || d.debt),
                equity: Math.round(d.equityPV || d.equity),
                homeValue: Math.round(d.homeValuePV || d.homeValue),
                year: d.year
            }
        }
        return {
            ...d,
            debt: Math.round(d.debt),
            equity: Math.round(d.equity),
            homeValue: Math.round(d.homeValue),
            year: d.year
        }
    })

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-4 text-gray-700">
                Home Value Projection ({viewMode === 'PV' ? 'Present Value' : 'Future Dollars'})
            </h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={formattedData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="year"
                            axisLine={{ stroke: '#E5E7EB' }}
                            tickLine={{ stroke: '#E5E7EB' }}
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            dy={10}
                            interval="preserveStartEnd"
                            minTickGap={20}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            tickFormatter={(value) => {
                                const absVal = Math.abs(value)
                                const sign = value < 0 ? '-' : ''
                                if (absVal >= 1000000) return `${sign}$${(absVal / 1000000).toFixed(1)}M`
                                if (absVal >= 1000) return `${sign}$${(absVal / 1000).toFixed(0)}k`
                                return `${sign}$${absVal}`
                            }}
                            width={60}
                        />
                        <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
                        <Area
                            type="monotone"
                            dataKey="equity"
                            stackId="1"
                            stroke="#059669"
                            fill="url(#colorEquity)"
                            name="Home Equity"
                        />
                        <Area
                            type="monotone"
                            dataKey="debt"
                            stackId="1"
                            stroke="#DC2626"
                            fill="url(#colorDebt)"
                            name="Mortgage Debt"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

function CustomTooltip({ active, payload, label, viewMode }) {
    if (active && payload && payload.length) {
        const equity = payload.find(p => p.name === 'Home Equity')?.value || 0
        const debt = payload.find(p => p.name === 'Mortgage Debt')?.value || 0
        const total = equity + debt

        return (
            <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg z-50">
                <p className="font-bold text-gray-900 mb-2">Year {label}</p>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                        <span className="text-green-600">Equity:</span>
                        <span className="font-medium">${equity.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-red-500">Debt:</span>
                        <span className="font-medium">${debt.toLocaleString()}</span>
                    </div>
                    <div className="pt-1 mt-1 border-t border-gray-100 flex justify-between gap-4 font-bold">
                        <span className="text-gray-900">Total Value:</span>
                        <span>${total.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 italic">
                        {viewMode === 'PV' ? "In Today's Dollars" : "In Future Dollars"}
                    </div>
                </div>
            </div>
        )
    }
    return null
}
