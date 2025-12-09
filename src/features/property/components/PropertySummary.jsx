import { Card } from '../../../shared/ui/Card'

export function PropertySummary({ data, viewMode, mode }) {
    if (!data || data.length === 0) return null

    // Key metrics
    const lastPoint = data[data.length - 1]

    // Calculate totals based on viewMode (Nominal vs PV)
    // Logic to find "Mortgage End" year
    // Find the first year where debt becomes 0 after having been positive
    let mortgageEndIndex = -1
    let hasHadDebt = false

    for (let i = 0; i < data.length; i++) {
        if (data[i].debt > 1) { // Threshold for "positive" debt
            hasHadDebt = true
        } else if (hasHadDebt && data[i].debt <= 1) {
            mortgageEndIndex = i
            break
        }
    }
    // If never found (never paid off or never had debt), default to last point or handle gracefully
    // If no debt ever, use end of projection? Users logic implies there IS a mortgage.
    // If never paid off, use last point.
    const mortgageEndPoint = mortgageEndIndex !== -1 ? data[mortgageEndIndex] : lastPoint
    const isMortgageFree = mortgageEndIndex !== -1

    // Calculate metrics for Mortgage End point
    let mortgageEndEquity = 0
    let mortgageEndInterest = 0
    let mortgageEndNet = 0 // Equity - Interest

    // Calculate metrics for Retirement (Last Point)
    // "Equity at Retirement" likely refers to the end of the projection period (retirement age)
    let totalInterest = 0 // This will be total interest over the entire projection
    let finalEquity = 0
    let finalValue = 0
    let finalNet = 0

    if (viewMode === 'PV') {
        const calcCumulativeInterest = (idx) => data.slice(0, idx + 1).reduce((sum, d) => sum + (d.interestPaidPV || d.interestPaid || 0), 0)

        mortgageEndInterest = calcCumulativeInterest(mortgageEndIndex !== -1 ? mortgageEndIndex : data.length - 1)
        mortgageEndEquity = mortgageEndPoint.equityPV || mortgageEndPoint.equity
        mortgageEndNet = mortgageEndEquity - mortgageEndInterest

        totalInterest = data.reduce((sum, d) => sum + (d.interestPaidPV || d.interestPaid || 0), 0)
        finalEquity = lastPoint.equityPV || lastPoint.equity
        finalValue = lastPoint.homeValuePV || lastPoint.homeValue
        finalNet = finalEquity - totalInterest

    } else {
        const calcCumulativeInterest = (idx) => data.slice(0, idx + 1).reduce((sum, d) => sum + (d.interestPaid || 0), 0)

        mortgageEndInterest = calcCumulativeInterest(mortgageEndIndex !== -1 ? mortgageEndIndex : data.length - 1)
        mortgageEndEquity = mortgageEndPoint.equity
        mortgageEndNet = mortgageEndEquity - mortgageEndInterest

        totalInterest = data.reduce((sum, d) => sum + (d.interestPaid || 0), 0)
        finalEquity = lastPoint.equity
        finalValue = lastPoint.homeValue
        finalNet = finalEquity - totalInterest
    }

    // Calculate "Growth" (Appreciation) & Break-even Year
    // Buy Mode: Final Value - Purchase Price
    // Own Mode: Final Value - Current Value

    // 1. Nominal Initial Value (for stable break-even year calc)
    const firstActivePoint = data.find(d => d.homeValue > 0)
    const initialHomeValueNominal = firstActivePoint?.homeValue || 0

    // 2. View-Model Initial Value (for displayed metrics)
    const initialHomeValueView = firstActivePoint ? (viewMode === 'PV' ? firstActivePoint.homeValuePV : firstActivePoint.homeValue) : 0

    // Find break-even year (First year where (Value - Initial) - Cumulative Interest > 0)
    // We use NOMINAL values for this calculation so the timeline characteristic (Break-even Year) remains constant
    // regardless of the view unit (Today's vs Future $). This answers "When do I make money?" in absolute terms.
    let breakEvenYear = null
    let runningInterestNominal = 0

    for (let i = 0; i < data.length; i++) {
        const point = data[i]

        runningInterestNominal += (point.interestPaid || 0)

        const growthNominal = point.homeValue - initialHomeValueNominal
        const netNominal = growthNominal - runningInterestNominal

        if (netNominal >= 0 && breakEvenYear === null) {
            breakEvenYear = point.year // Relative year
        }
    }

    // Actually, "Growth" usually means the pure gain in value.
    // Displayed metrics follow the ViewMode
    const valueGrowth = finalValue - initialHomeValueView
    const growthMinusInterest = valueGrowth - totalInterest

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* 1. Equity at Retirement (Blue) */}
            <Card className="bg-blue-50 border-blue-100 p-6 flex flex-col justify-center">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Equity at Retirement</div>
                <div className="text-3xl font-bold text-blue-700">
                    ${Math.round(finalEquity).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                    Projected Year {data.length}
                </div>
            </Card>

            {/* 2. Equity at Payoff (White) */}
            <Card className="bg-white border-gray-200 p-6 flex flex-col justify-center">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Equity at Payoff</div>
                <div className="text-3xl font-bold text-gray-900">
                    ${Math.round(mortgageEndEquity).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                    {isMortgageFree ? `Year ${mortgageEndPoint.year}` : 'Not paid off in period'}
                </div>
            </Card>

            {/* Cards 3 & 4 (Only for BUY mode) */}
            {mode === 'buy' && (
                <>
                    {/* 3. Total Interest Cost (Blue) */}
                    <Card className="bg-blue-50 border-blue-100 p-6 flex flex-col justify-center">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Interest Cost</div>
                        <div className="text-3xl font-bold text-blue-700">
                            ${Math.round(totalInterest).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                            Over Entire Mortgage Period
                        </div>
                    </Card>

                    {/* 4. Net Appreciation Profit (White) */}
                    <Card className="bg-white border-gray-200 p-6 flex flex-col justify-center">
                        <div className="mb-2">
                            <span
                                className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-dotted border-gray-400 cursor-help"
                                title="Growth (Appreciation) - Total Interest Cost"
                            >
                                Net Appreciation Profit
                            </span>
                        </div>
                        <div className={`text-3xl font-bold ${growthMinusInterest >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                            ${Math.round(growthMinusInterest).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                            {breakEvenYear !== null ? (
                                breakEvenYear <= 0
                                    ? `Profitable as of ${Math.abs(breakEvenYear)} Years Ago`
                                    : `Profitable In Year ${breakEvenYear}`
                            ) : 'Growth minus interest cost'}
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}
