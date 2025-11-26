import React from 'react'
import { formatCompactNumber, formatPercentage } from '../../../shared/utils/format'

export function TaxSummary({ calculations, data }) {
    if (!calculations) return null

    const { totals } = calculations

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SummaryCard
                title="Total Income"
                value={formatCompactNumber(totals.totalIncome)}
            />
            <SummaryCard
                title="Effective Tax Rate"
                value={formatPercentage(totals.effectiveRate)}
                highlight
            />
            <SummaryCard
                title="Marginal Tax Rate"
                value={formatPercentage(totals.marginalRate || 0)}
                subtitle="Top Bracket Rate"
            />

            <SummaryCard
                title="Federal Income Tax"
                subtitle={data.country}
                value={formatCompactNumber(totals.totalFederalTax)}
            />
            <SummaryCard
                title={data.country === 'Canada' ? 'Provincial Income Tax' : 'State Income Tax'}
                subtitle={data.state}
                value={formatCompactNumber(totals.totalStateTax)}
            />
            <SummaryCard
                title="Federal (Other)"
                subtitle={data.country === 'Canada' ? 'CPP + EI' : 'FICA (Soc Sec + Medicare)'}
                value={formatCompactNumber(totals.totalFICA)}
            />
        </div>
    )
}

function SummaryCard({ title, subtitle, value, highlight }) {
    return (
        <div className={`p-4 rounded-lg border ${highlight ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'}`}>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</h3>
            <div className={`text-2xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>
                {value}
            </div>
            {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
        </div>
    )
}
