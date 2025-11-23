import { useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

function NetWorthTab({ data }) {
  const [viewMode, setViewMode] = useState('nominal')
  const isPV = viewMode === 'pv'

  const { gapProjections, profile } = data
  const { projections, summary } = gapProjections

  // Format currency - compact format
  const fmt = (val) => formatSmart(val)

  // Prepare stacked area chart data
  const chartData = projections.map(p => ({
    year: p.year,
    Cash: isPV ? p.cashPV : p.cash,
    Investments: isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue,
    '401k': isPV ? p.retirement401kValuePV : p.retirement401kValue,
  }))

  // Calculate summary metrics
  const currentNetWorth = isPV ? projections[0].netWorthPV : projections[0].netWorth
  const retirementNetWorth = isPV ? summary.retirementNetWorthPV : summary.retirementNetWorth
  const netWorthGrowth = retirementNetWorth - currentNetWorth
  const netWorthGrowthPercent = currentNetWorth > 0 ? (netWorthGrowth / currentNetWorth * 100) : 0
  const lifetimeInvested = isPV ? summary.lifetimeInvestedPV : summary.lifetimeInvested

  return (
    <div>
      {/* Toggle */}
      <div className="flex justify-end mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('nominal')}
            className={`px-4 py-2 text-sm rounded-md transition ${
              viewMode === 'nominal'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Nominal
          </button>
          <button
            onClick={() => setViewMode('pv')}
            className={`px-4 py-2 text-sm rounded-md transition ${
              viewMode === 'pv'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Present Value
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Current Net Worth"
          value={fmt(currentNetWorth)}
          subtitle="Year 1"
        />
        <SummaryCard
          title="Retirement Net Worth"
          value={fmt(retirementNetWorth)}
          subtitle={`Year ${profile.yearsToRetirement || 30}`}
        />
        <SummaryCard
          title="Net Worth Growth"
          value={fmt(netWorthGrowth)}
          subtitle={`${netWorthGrowthPercent.toFixed(1)}% increase`}
        />
        <SummaryCard
          title="Lifetime Invested"
          value={fmt(lifetimeInvested)}
          subtitle="Total contributions"
        />
      </div>

      {/* Stacked Area Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Net Worth Growth Over Time {isPV && <span className="text-sm font-normal text-gray-500">(Present Value)</span>}
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              label={{ value: isPV ? 'Present Value' : 'Nominal Value', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(val) => fmt(val)}
              labelFormatter={(year) => `Year ${year}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="Cash"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
            />
            <Area
              type="monotone"
              dataKey="Investments"
              stackId="1"
              stroke="#8b5cf6"
              fill="#8b5cf6"
            />
            <Area
              type="monotone"
              dataKey="401k"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Year-by-Year Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">
          Detailed Year-by-Year Breakdown {isPV && <span className="text-sm font-normal text-gray-500">(Present Value)</span>}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Year</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Income</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">401k Contrib</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Taxes</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Tax %</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Expenses</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Expense %</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 bg-blue-50">Gap</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Cash</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Investments</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">401k</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 bg-green-50">Net Worth</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((p) => {
                const income = isPV ? p.grossIncomePV : p.grossIncome
                const taxes = isPV ? p.annualTaxesPV : p.annualTaxes
                const expenses = isPV ? p.annualExpensesPV : p.annualExpenses
                const taxPercent = income > 0 ? (taxes / income * 100).toFixed(2) : '0.00'
                const expensePercent = income > 0 ? (expenses / income * 100).toFixed(2) : '0.00'

                return (
                  <tr key={p.year} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 font-medium text-gray-900">{p.year}</td>
                    <td className="text-right py-2 px-2 text-gray-700">{formatSmart(income)}</td>
                    <td className="text-right py-2 px-2 text-orange-700">-{formatSmart(isPV ? p.totalIndividual401kPV : p.totalIndividual401k)}</td>
                    <td className="text-right py-2 px-2 text-red-700">-{formatSmart(taxes)}</td>
                    <td className="text-right py-2 px-2 text-red-600 font-medium">{taxPercent}%</td>
                    <td className="text-right py-2 px-2 text-red-700">-{formatSmart(expenses)}</td>
                    <td className="text-right py-2 px-2 text-red-600 font-medium">{expensePercent}%</td>
                    <td className={`text-right py-2 px-2 font-semibold bg-blue-50 ${(isPV ? p.gapPV : p.gap) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {(isPV ? p.gapPV : p.gap) >= 0 ? '+' : ''}{formatSmart(isPV ? p.gapPV : p.gap)}
                    </td>
                    <td className="text-right py-2 px-2 text-gray-700">{formatSmart(isPV ? p.cashPV : p.cash)}</td>
                    <td className="text-right py-2 px-2 text-purple-700">{formatSmart(isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue)}</td>
                    <td className="text-right py-2 px-2 text-green-700">{formatSmart(isPV ? p.retirement401kValuePV : p.retirement401kValue)}</td>
                    <td className="text-right py-2 px-2 font-bold text-gray-900 bg-green-50">{formatSmart(isPV ? p.netWorthPV : p.netWorth)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p><strong>Formula:</strong> Gap = Income - 401k Contributions - Taxes - Expenses</p>
          <p><strong>Net Worth:</strong> Cash + Investments + 401k</p>
          <p className="text-blue-600"><strong>Positive Gap:</strong> Excess funds are allocated to cash (up to target), then investments per allocation %, then remaining to cash</p>
          <p className="text-red-600"><strong>Negative Gap:</strong> Shortfall is drawn from cash (can go negative)</p>
        </div>
      </div>

      {/* Net Worth Component Breakdown Table */}
      <NetWorthBreakdownTable projections={projections} isPV={isPV} fmt={fmt} />
    </div>
  )
}

// Smart currency formatter based on magnitude
function formatSmart(val) {
  const absVal = Math.abs(val)
  const sign = val < 0 ? '-' : ''

  if (absVal < 1000) {
    return `${sign}$${Math.round(absVal)}`
  } else if (absVal < 10000) {
    return `${sign}$${(absVal / 1000).toFixed(1)}k`
  } else if (absVal < 100000) {
    return `${sign}$${Math.round(absVal / 1000)}k`
  } else if (absVal < 1000000) {
    return `${sign}$${Math.round(absVal / 1000)}k`
  } else if (absVal < 10000000) {
    return `${sign}$${(absVal / 1000000).toFixed(2)}M`
  } else {
    return `${sign}$${(absVal / 1000000).toFixed(1)}M`
  }
}

// Net Worth Breakdown Table Component
function NetWorthBreakdownTable({ projections, isPV, fmt }) {
  // Calculate year-over-year changes
  const breakdownData = projections.map((p, index) => {
    // Current year values
    const netWorth = isPV ? p.netWorthPV : p.netWorth
    const cash = isPV ? p.cashPV : p.cash
    const investments = isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue
    const ret401k = isPV ? p.retirement401kValuePV : p.retirement401kValue
    const costBasis = isPV ? p.totalCostBasisPV : p.totalCostBasis

    // Income components from Gap.calc.js
    const salary = isPV ? p.annualSalaryPV : p.annualSalary
    const equity = isPV ? p.annualEquityPV : p.annualEquity
    const company401k = isPV ? p.annualCompany401kPV : p.annualCompany401k
    const grossIncome = isPV ? p.grossIncomePV : p.grossIncome

    // Deductions and taxes
    const individual401k = isPV ? p.totalIndividual401kPV : p.totalIndividual401k
    const taxableIncome = isPV ? p.taxableIncomePV : p.taxableIncome
    const federalTax = isPV ? p.taxBreakdownPV.federal : p.taxBreakdown.federal
    const stateTax = isPV ? p.taxBreakdownPV.state : p.taxBreakdown.state
    const fica = isPV
      ? p.taxBreakdownPV.socialSecurity + p.taxBreakdownPV.medicare
      : p.taxBreakdown.socialSecurity + p.taxBreakdown.medicare
    const totalTaxes = isPV ? p.annualTaxesPV : p.annualTaxes
    const afterTaxIncome = isPV ? p.afterTaxIncomePV : p.afterTaxIncome

    // Expenses and disposable income
    const expenses = isPV ? p.annualExpensesPV : p.annualExpenses
    const disposableIncome = isPV ? p.disposableIncomePV : p.disposableIncome

    // Allocations
    const toCash = isPV ? p.cashContributionPV : p.cashContribution
    const toInvestments = isPV ? p.investedThisYearPV : p.investedThisYear

    // 401k total contribution
    const ret401kContribution = individual401k + company401k

    if (index === 0) {
      // Year 1: Calculate beginning values by working backwards
      // Beginning = Ending - changes during the year

      // Work backwards to get beginning balances
      const beginCash = cash - toCash
      const beginRet401k = ret401k - ret401kContribution
      const ret401kGrowth = ret401k - beginRet401k - ret401kContribution
      const beginInvestments = investments - toInvestments
      const beginCostBasis = costBasis - toInvestments
      const beginNetWorth = beginCash + beginRet401k + beginInvestments

      // Calculate changes
      const netWorthChange = netWorth - beginNetWorth
      const cashChange = cash - beginCash
      const ret401kChange = ret401k - beginRet401k
      const costBasisChange = costBasis - beginCostBasis
      const investmentsChange = investments - beginInvestments
      const investmentGrowth = investmentsChange - costBasisChange

      return {
        year: p.year,

        // Starting Balances
        cashBegin: beginCash,
        investmentsBegin: beginInvestments,
        ret401kBegin: beginRet401k,
        netWorthBegin: beginNetWorth,

        // Income (Inflows)
        salary,
        equity,
        company401k,
        grossIncome,

        // Pre-Tax Savings
        individual401k,
        taxableIncome,

        // Taxes
        federalTax,
        stateTax,
        fica,
        totalTaxes,
        afterTaxIncome,

        // Living Expenses
        expenses,
        disposableIncome,

        // Allocation
        toCash,
        toInvestments,
        totalAllocated: disposableIncome,

        // Growth
        investmentGrowth,
        ret401kGrowth,

        // Ending Balances
        cash,
        investmentBalance: investments,
        ret401kBalance: ret401k,
        netWorthEnd: netWorth,

        // Legacy fields for compatibility
        netWorthChange,
        cashChange,
        ret401kChange,
        investmentsChange,
        costBasisChange,
        ret401kContribution
      }
    }

    // Years 2+: Compare to previous year
    const prev = projections[index - 1]
    const prevNetWorth = isPV ? prev.netWorthPV : prev.netWorth
    const prevCash = isPV ? prev.cashPV : prev.cash
    const prevInvestments = isPV ? prev.totalInvestmentValuePV : prev.totalInvestmentValue
    const prevRet401k = isPV ? prev.retirement401kValuePV : prev.retirement401kValue
    const prevCostBasis = isPV ? prev.totalCostBasisPV : prev.totalCostBasis

    // Calculate changes
    const netWorthChange = netWorth - prevNetWorth
    const cashChange = cash - prevCash
    const ret401kChange = ret401k - prevRet401k
    const costBasisChange = costBasis - prevCostBasis
    const ret401kGrowth = ret401kChange - ret401kContribution
    const investmentsChange = investments - prevInvestments
    const investmentGrowth = investmentsChange - costBasisChange

    return {
      year: p.year,

      // Starting Balances
      cashBegin: prevCash,
      investmentsBegin: prevInvestments,
      ret401kBegin: prevRet401k,
      netWorthBegin: prevNetWorth,

      // Income (Inflows)
      salary,
      equity,
      company401k,
      grossIncome,

      // Pre-Tax Savings
      individual401k,
      taxableIncome,

      // Taxes
      federalTax,
      stateTax,
      fica,
      totalTaxes,
      afterTaxIncome,

      // Living Expenses
      expenses,
      disposableIncome,

      // Allocation
      toCash,
      toInvestments,
      totalAllocated: disposableIncome,

      // Growth
      investmentGrowth,
      ret401kGrowth,

      // Ending Balances
      cash,
      investmentBalance: investments,
      ret401kBalance: ret401k,
      netWorthEnd: netWorth,

      // Legacy fields for compatibility
      netWorthChange,
      cashChange,
      ret401kChange,
      investmentsChange,
      costBasisChange,
      ret401kContribution
    }
  })

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold">
            Net Worth Component Breakdown {isPV && <span className="text-sm font-normal text-gray-500">(Present Value)</span>}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Year-over-year changes in net worth components and asset allocation
          </p>
        </div>
        <button
          onClick={() => exportBreakdownToCSV(breakdownData, isPV)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition"
        >
          Export Table
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 px-3 font-semibold text-gray-700 sticky left-0 bg-white z-10">Metric</th>
              {breakdownData.map((row) => (
                <th key={row.year} className="text-right py-2 px-2 font-semibold text-gray-700 whitespace-nowrap">
                  Year {row.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Starting Balances Section */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td colSpan={breakdownData.length + 1} className="py-2 px-3 font-semibold text-gray-800 text-sm">
                Starting Balances
              </td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Cash Begin</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-blue-700">
                  {formatSmart(row.cashBegin)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Investments Begin</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-purple-700">
                  {formatSmart(row.investmentsBegin)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">401k Begin</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-green-700">
                  {formatSmart(row.ret401kBegin)}
                </td>
              ))}
            </tr>
            <tr className="border-b-2 border-gray-300 hover:bg-gray-50 bg-blue-50">
              <td className="py-2 px-3 text-gray-900 font-bold sticky left-0 bg-blue-50">Net Worth Begin</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-gray-900 font-bold">
                  {formatSmart(row.netWorthBegin)}
                </td>
              ))}
            </tr>

            {/* Income Section */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td colSpan={breakdownData.length + 1} className="py-2 px-3 font-semibold text-gray-800 text-sm">
                Income (Inflows)
              </td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Salary</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-gray-700">
                  {formatSmart(row.salary)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Equity Vesting</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-gray-700">
                  {formatSmart(row.equity)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Company 401k Match</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-gray-700">
                  {formatSmart(row.company401k)}
                </td>
              ))}
            </tr>
            <tr className="border-b-2 border-gray-300 hover:bg-gray-50 bg-green-50">
              <td className="py-2 px-3 text-gray-900 font-bold sticky left-0 bg-green-50">Total Gross Income</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-gray-900 font-bold">
                  {formatSmart(row.grossIncome)}
                </td>
              ))}
            </tr>

            {/* Pre-Tax Savings Section */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td colSpan={breakdownData.length + 1} className="py-2 px-3 font-semibold text-gray-800 text-sm">
                Pre-Tax Savings
              </td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Individual 401k</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-orange-700">
                  {formatSmart(row.individual401k)}
                </td>
              ))}
            </tr>
            <tr className="border-b-2 border-gray-300 hover:bg-gray-50 bg-yellow-50">
              <td className="py-2 px-3 text-gray-900 font-bold sticky left-0 bg-yellow-50">Taxable Income</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-gray-900 font-bold">
                  {formatSmart(row.taxableIncome)}
                </td>
              ))}
            </tr>

            {/* Taxes Section */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td colSpan={breakdownData.length + 1} className="py-2 px-3 font-semibold text-gray-800 text-sm">
                Taxes
              </td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Federal Tax</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-red-700">
                  {formatSmart(row.federalTax)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">State Tax</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-red-700">
                  {formatSmart(row.stateTax)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">FICA (SS + Medicare)</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-red-700">
                  {formatSmart(row.fica)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Total Taxes</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-red-700 font-medium">
                  {formatSmart(row.totalTaxes)}
                </td>
              ))}
            </tr>
            <tr className="border-b-2 border-gray-300 hover:bg-gray-50 bg-blue-50">
              <td className="py-2 px-3 text-gray-900 font-bold sticky left-0 bg-blue-50">After-Tax Income</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-gray-900 font-bold">
                  {formatSmart(row.afterTaxIncome)}
                </td>
              ))}
            </tr>

            {/* Living Expenses Section */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td colSpan={breakdownData.length + 1} className="py-2 px-3 font-semibold text-gray-800 text-sm">
                Living Expenses
              </td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Total Expenses</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-red-700">
                  {formatSmart(row.expenses)}
                </td>
              ))}
            </tr>
            <tr className="border-b-2 border-gray-300 hover:bg-gray-50 bg-purple-50">
              <td className="py-2 px-3 text-gray-900 font-bold sticky left-0 bg-purple-50">Disposable Income</td>
              {breakdownData.map((row) => (
                <td key={row.year} className={`text-right py-2 px-2 font-bold ${row.disposableIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatSmart(row.disposableIncome)}
                </td>
              ))}
            </tr>

            {/* Allocation Section */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td colSpan={breakdownData.length + 1} className="py-2 px-3 font-semibold text-gray-800 text-sm">
                Allocation of Disposable Income
              </td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">To Cash</td>
              {breakdownData.map((row) => (
                <td key={row.year} className={`text-right py-2 px-2 ${row.toCash >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {formatSmart(row.toCash)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">To Investments</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-purple-700">
                  {formatSmart(row.toInvestments)}
                </td>
              ))}
            </tr>
            <tr className="border-b-2 border-gray-300 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Total Allocated</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-gray-700 font-medium">
                  {formatSmart(row.totalAllocated)}
                </td>
              ))}
            </tr>

            {/* Growth Section */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td colSpan={breakdownData.length + 1} className="py-2 px-3 font-semibold text-gray-800 text-sm">
                Growth
              </td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Investments Growth</td>
              {breakdownData.map((row) => (
                <td key={row.year} className={`text-right py-2 px-2 ${row.investmentGrowth >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                  {formatSmart(row.investmentGrowth)}
                </td>
              ))}
            </tr>
            <tr className="border-b-2 border-gray-300 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">401k Growth</td>
              {breakdownData.map((row) => (
                <td key={row.year} className={`text-right py-2 px-2 ${row.ret401kGrowth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatSmart(row.ret401kGrowth)}
                </td>
              ))}
            </tr>

            {/* Ending Balances Section */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td colSpan={breakdownData.length + 1} className="py-2 px-3 font-semibold text-gray-800 text-sm">
                Ending Balances
              </td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Cash End</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-blue-700 font-medium">
                  {formatSmart(row.cash)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">Investments End</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-purple-700 font-medium">
                  {formatSmart(row.investmentBalance)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700 font-medium sticky left-0 bg-white">401k End</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-green-700 font-medium">
                  {formatSmart(row.ret401kBalance)}
                </td>
              ))}
            </tr>
            <tr className="border-b-2 border-gray-300 hover:bg-gray-50 bg-green-50">
              <td className="py-2 px-3 text-gray-900 font-bold sticky left-0 bg-green-50">Net Worth End</td>
              {breakdownData.map((row) => (
                <td key={row.year} className="text-right py-2 px-2 text-gray-900 font-bold">
                  {formatSmart(row.netWorthEnd)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p><strong>Cash Flow Statement Format:</strong> This table shows how money flows through your finances each year</p>
        <p><strong>Income:</strong> All sources of income (salary, equity vesting, company 401k match)</p>
        <p><strong>Pre-Tax Savings:</strong> 401k contributions reduce taxable income</p>
        <p><strong>Taxes:</strong> Federal, state, and FICA taxes calculated on taxable income</p>
        <p><strong>Disposable Income:</strong> What remains after taxes and expenses (allocated to cash & investments)</p>
        <p><strong>Growth:</strong> Investment returns on existing balances (separate from new contributions)</p>
        <p><strong>Math Check:</strong> Total Allocated should equal Disposable Income. To Cash + To Investments = Disposable Income.</p>
      </div>
    </div>
  )
}

// Export breakdown table to CSV
function exportBreakdownToCSV(breakdownData, isPV) {
  // Create headers with years
  const headers = ['Metric', ...breakdownData.map(row => `Year ${row.year}`)]

  // Define all metrics in order
  const metrics = [
    // Starting Balances
    { label: 'Cash Begin', key: 'cashBegin' },
    { label: 'Investments Begin', key: 'investmentsBegin' },
    { label: '401k Begin', key: 'ret401kBegin' },
    { label: 'Net Worth Begin', key: 'netWorthBegin' },
    { label: '', key: null }, // Blank row

    // Income (Inflows)
    { label: 'Salary', key: 'salary' },
    { label: 'Equity Vesting', key: 'equity' },
    { label: 'Company 401k Match', key: 'company401k' },
    { label: 'Total Gross Income', key: 'grossIncome' },
    { label: '', key: null }, // Blank row

    // Pre-Tax Savings
    { label: 'Individual 401k', key: 'individual401k' },
    { label: 'Taxable Income', key: 'taxableIncome' },
    { label: '', key: null }, // Blank row

    // Taxes
    { label: 'Federal Tax', key: 'federalTax' },
    { label: 'State Tax', key: 'stateTax' },
    { label: 'FICA (SS + Medicare)', key: 'fica' },
    { label: 'Total Taxes', key: 'totalTaxes' },
    { label: 'After-Tax Income', key: 'afterTaxIncome' },
    { label: '', key: null }, // Blank row

    // Living Expenses
    { label: 'Total Expenses', key: 'expenses' },
    { label: 'Disposable Income', key: 'disposableIncome' },
    { label: '', key: null }, // Blank row

    // Allocation
    { label: 'To Cash', key: 'toCash' },
    { label: 'To Investments', key: 'toInvestments' },
    { label: 'Total Allocated', key: 'totalAllocated' },
    { label: '', key: null }, // Blank row

    // Growth
    { label: 'Investments Growth', key: 'investmentGrowth' },
    { label: '401k Growth', key: 'ret401kGrowth' },
    { label: '', key: null }, // Blank row

    // Ending Balances
    { label: 'Cash End', key: 'cash' },
    { label: 'Investments End', key: 'investmentBalance' },
    { label: '401k End', key: 'ret401kBalance' },
    { label: 'Net Worth End', key: 'netWorthEnd' }
  ]

  // Create rows with metric name and values for each year
  const rows = metrics.map(metric => {
    if (!metric.key) {
      // Blank row
      return [metric.label, ...breakdownData.map(() => '')]
    }
    return [
      metric.label,
      ...breakdownData.map(row => Math.round(row[metric.key]))
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  const valueType = isPV ? 'PresentValue' : 'Nominal'
  const filename = `NetWorth_Breakdown_${valueType}_${new Date().toISOString().split('T')[0]}.csv`

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  console.log(`✅ Net Worth breakdown exported as ${filename}`)
}

// Summary Card Component
function SummaryCard({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

export default NetWorthTab
