# Finance Project: Master Data Flow Reference

**Last Updated**: 2025-12-10

## Purpose

This document provides a comprehensive overview of how all pages (Income, Expenses, Investments, Taxes, Property) contribute data to the net worth calculation model. Use this as a quick reference to understand:

- What inputs each page accepts
- What outputs/calculations each page generates
- Under what conditions each mode/feature applies
- How each page's data flows into the net worth model

For detailed implementation of each module, see the individual reference guides in `/docs/modules/`.

---

## Master Reference Table

| Page | Mode | Inputs | Outputs | Conditions | Net Worth Impact |
|------|------|--------|---------|------------|------------------|
| **Income** | Single (1-3 streams) | • annualIncome<br>• company401k<br>• individual401k<br>• equity<br>• growthRate (default: 5%)<br>• startYear<br>• endWorkYear<br>• jumps: [{year, jumpPercent, description}]<br>• careerBreaks: [{startYear, durationMonths, reductionPercent}] | • 1,200 monthly projections (Nominal + PV)<br>• Lifetime earnings<br>• Year 10 total comp<br>• Per-stream breakdowns<br>• Salary jump milestones<br>• Career break impacts | • Links endWorkYear to retirement age from profile<br>• Supports 1-3 income streams (MAX_STREAMS: 3)<br>• Career breaks temporarily reduce income by reductionPercent<br>• Jumps apply percentage increases at specific years | **Primary income source for Gap calculation**<br>• Gross income feeds Gap.calc.js<br>• Pre-tax 401k contributions reduce taxable income<br>• Post-tax income used for expenses/investments<br>• Equity/bonuses included in gross comp |
| **Expenses** | **Simple** | • totalMonthlyExpense<br>• simpleGrowthRate (default: 3%)<br>• oneTimeExpenses: [{year, description, amount}] | • 1,200 monthly total expense projections (Nominal + PV)<br>• Summary: lifetime expenses, current year, Year 10<br>• One-time expense impacts by year | • One total expense line in projections<br>• Default simple expense = 50% of monthly gross income<br>• One-time expenses available in BOTH modes<br>• Use when: Quick modeling, consistent spending | **Reduces available gap**<br>• Gap = Income - Expenses - Taxes<br>• One-time expenses reduce cash in specific years<br>• Grows with simpleGrowthRate annually |
| | **Detailed (Spend Categories)** | • 9 fixed categories (Housing, Utilities, Transportation, Medical, Food, Entertainment, Childcare, Education, Other)<br>• Per category:<br>&nbsp;&nbsp;- amountType: "percent" \| "fixed"<br>&nbsp;&nbsp;- percentOfIncome (if percent)<br>&nbsp;&nbsp;- annualAmount (if fixed)<br>&nbsp;&nbsp;- growthRate (default: 2.7%)<br>&nbsp;&nbsp;- jumps: [{year, type, value, description}]<br>• oneTimeExpenses (shared with Simple) | • 1,200 monthly projections per category (Nominal + PV)<br>• Category-level breakdowns<br>• Total expenses aggregated<br>• Jump impacts tracked | • 9 categories (cannot add/remove)<br>• Percent mode requires Income projections<br>• 4 jump types: New Amount, Add/Subtract, Change %, New % of Income<br>• Use when: Detailed planning, variable category growth | **Reduces available gap with category detail**<br>• Percent of Income mode dynamically adjusts with income changes<br>• Housing category syncs with Property page (if detailed mode)<br>• Provides expense breakdown for dashboard |
| **Investments-Debt** | **Cash** | • currentCash<br>• targetCash (inflation-adjusted goal) | • Cash balance over 1,200 months<br>• Target cash (inflated annually)<br>• Surplus/deficit tracking | • Starting liquid asset<br>• Buffer for negative gaps<br>• Inflates to target over time | **Liquidity buffer and investment source**<br>• Starting asset in net worth<br>• Receives positive gap surplus (after 401k, investments)<br>• Provides funds for negative gaps<br>• Down payment for property draws from cash |
| | **Retirement 401k** | • currentValue<br>• growthRate (default: 7%)<br>• individualLimit (default: $23,500, 2025)<br>• limitGrowth (default: 3%)<br>• companyContribution (auto from Income) | • 401k value projection (1,200 months)<br>• Annual contribution tracking<br>• Limit enforcement (grows with limitGrowth) | • Individual limit grows annually<br>• Company contribution auto-populated from Income streams<br>• Pre-tax contributions reduce taxable income | **Tax-advantaged retirement asset**<br>• Value compounds at growthRate<br>• Receives pre-tax contributions from income<br>• Contributions reduce tax base<br>• Tracked separately in net worth |
| | **Investments (1-3 accounts)** | • Per investment:<br>&nbsp;&nbsp;- currentValue<br>&nbsp;&nbsp;- costBasis (for future tax calcs)<br>&nbsp;&nbsp;- growthRate (default: 7%)<br>&nbsp;&nbsp;- portfolioPercent (allocation %) | • Investment value projections (1,200 months)<br>• Portfolio allocation by percent<br>• Total investment value | • MAX_INVESTMENTS: 3<br>• Portfolio allocation sum must ≤ 100%<br>• costBasis tracked but not yet used for taxes | **Post-tax investment growth**<br>• Values compound at individual growthRates<br>• Surplus gap allocated by portfolioPercent<br>• Each investment tracked separately<br>• Sum contributes to net worth |
| **Taxes** | Single (with overrides) | • filingStatus: "Single" \| "Married"<br>• state (e.g., "California")<br>• country (e.g., "USA")<br>• customStandardDeductions: {federal, state} (optional)<br>• customTaxCredits: {federal, state} (optional)<br>• filingStatusRemapping (optional override) | • Federal tax amount<br>• State tax amount<br>• Total tax (Federal + State + FICA)<br>• Effective tax rate<br>• Marginal tax rate | • Uses 2025 CSV tax brackets<br>• Fallback to "All" for flat-tax states (e.g., Arizona)<br>• Can override filing status if both brackets available<br>• Custom deductions/credits persist by jurisdiction | **Reduces take-home pay**<br>• Gap = Income - Pre-tax 401k - Taxes - Expenses<br>• Tax calculated on: Income - Pre-tax 401k contributions<br>• FICA: Social Security + Medicare<br>• Affects available cash for investments |
| **Property** | **None** | (no inputs) | (no outputs) | No property ownership or plans | No impact on net worth |
| | **Own** | • homeValue<br>• growthRate (annual % appreciation)<br>• mortgageRemaining<br>• monthlyPayment | • Home value projection (30+ years)<br>• Equity buildup (homeValue - mortgage)<br>• Mortgage amortization schedule<br>• Remaining term calculation | • Currently own a home<br>• Tracking equity growth<br>• Syncs with Expenses housing category (detailed mode) | **Adds home equity to net worth**<br>• Equity = homeValue - mortgageRemaining<br>• Home value appreciates at growthRate<br>• Mortgage payment reduces monthly gap<br>• Mortgage principal paydown increases equity |
| | **Buy** | • homePrice (in today's dollars)<br>• downPayment ($ or %)<br>• downPaymentType: "dollar" \| "percent"<br>• purchaseYear (relative to year 1)<br>• mortgageRate (%)<br>• term (10-30 years) | • Home value projection from purchase year<br>• Down payment cash withdrawal<br>• New mortgage creation<br>• Equity buildup over term | • Future home purchase<br>• Purchase year must be within working years<br>• Down payment calculation based on type | **Creates new asset and liability**<br>• Down payment withdraws from cash in purchaseYear<br>• Creates mortgage liability<br>• Home value starts at homePrice, appreciates<br>• Mortgage payment reduces gap from purchaseYear onward |

---

## Key Formulas

### Gap Calculation
The "gap" represents available cash after all obligations:

```
Monthly Gap = Gross Income
            - Pre-tax 401k Contributions
            - Taxes (Federal + State + FICA)
            - Expenses
            - Mortgage Payment (if applicable)
```

### Gap Allocation Logic
Positive gap is allocated in this priority order:
1. **Fill Cash** to inflated target
2. **401k Contributions** (up to individual limit)
3. **Investment Allocations** by portfolioPercent
4. **Excess** stays in cash

Negative gap draws from cash reserves.

### Net Worth Calculation
```
Net Worth = Cash Balance
          + 401k Value
          + Sum(Investment Values)
          + Home Equity
          - Mortgage Remaining
```

Where:
- **Home Equity** = homeValue - mortgageRemaining
- All values compound at their respective growth rates

### Present Value (Inflation Adjustment)
```
PV (Present Value) = Nominal Value / (1 + inflation_rate)^years_from_now
```

This converts future dollars to "today's dollars" for fair comparison.

### Tax Calculations
```
Taxable Income = Gross Income - Pre-tax 401k Contributions - Standard Deduction

Total Tax = Federal Tax + State Tax + FICA

Effective Tax Rate = Total Tax / Gross Income × 100%

Marginal Tax Rate = Highest bracket rate that applies to income
```

### Property Formulas

**Monthly Mortgage Payment**:
```
Payment = P × [r(1+r)^n] / [(1+r)^n - 1]

where:
  P = principal (loan amount)
  r = monthly interest rate (annual rate / 12)
  n = number of payments (term in years × 12)
```

**Remaining Term Calculation** (for Own mode):
```
Remaining Months = ln(Payment / (Payment - principal × monthly_rate)) / ln(1 + monthly_rate)
```

**Home Equity Growth**:
```
Year N Equity = Home Value × (1 + growth_rate)^N - Mortgage Remaining at Year N
```

---

## Cross-Page Dependencies

### Data Flow Diagram

```
┌─────────────┐
│   Profile   │ (age, retirement age, inflation, location, filing status)
└──────┬──────┘
       │
       ├──────────────────────────────────┬───────────────────┬────────────────┐
       ↓                                  ↓                   ↓                ↓
┌────────────┐                    ┌─────────────┐    ┌──────────────┐  ┌──────────┐
│   Income   │                    │   Expenses  │    │  Investments │  │Property  │
│            │                    │             │    │              │  │          │
│ • Streams  │                    │ Simple or   │    │ • Cash       │  │None/Own/ │
│ • 401k     │───────────────────→│ Detailed    │    │ • 401k       │  │Buy       │
│ • Equity   │  (% of Income)     │             │    │ • Investments│  │          │
│ • Jumps    │                    │ • Categories│    │              │  │          │
│ • Breaks   │                    │ • Jumps     │    │              │  │          │
└─────┬──────┘                    │ • One-time  │    └───────┬──────┘  └────┬─────┘
      │                           └──────┬──────┘            │              │
      │                                  │                   │              │
      │    ┌─────────────────────────────┘                   │              │
      │    │                                                 │              │
      │    │                 ┌───────────────────────────────┘              │
      │    │                 │                                              │
      │    │                 │              ┌───────────────────────────────┘
      │    │                 │              │ (Housing sync in detailed mode)
      │    │                 │              │
      ↓    ↓                 ↓              ↓
┌──────────────────────────────────────────────┐
│              Taxes.calc.js                   │
│                                              │
│  Calculates taxes on:                        │
│  Income - Pre-tax 401k                       │
└────────────────┬─────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────┐
│              Gap.calc.js                     │
│                                              │
│  Gap = Income - 401k - Taxes - Expenses      │
│                                              │
│  Allocation Logic:                           │
│  1. Fill cash to target                      │
│  2. Contribute to 401k (up to limit)         │
│  3. Invest by portfolioPercent               │
│  4. Excess → cash                            │
│  5. Negative gap ← cash                      │
└────────────────┬─────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────┐
│          Net Worth Projection                │
│                                              │
│  Components:                                 │
│  • Cash (growing to target, buffer)          │
│  • 401k (compounding + contributions)        │
│  • Investments (compounding + allocations)   │
│  • Home Equity (appreciation + paydown)      │
│  • Mortgage (liability, amortizing)          │
│                                              │
│  Output: 1,200 months, Nominal + PV          │
└──────────────────────────────────────────────┘
```

### Dependency Details

**Income Dependencies**:
- **Requires**: Profile (retirement age for endWorkYear linking)
- **Provides to**:
  - Expenses (for % of Income calculations)
  - Investments (company401k → 401k companyContribution)
  - Taxes (gross income for tax calculation)
  - Gap (primary income source)

**Expenses Dependencies**:
- **Requires**:
  - Income (for % of Income mode in detailed expenses)
  - Profile (inflation rate for growth adjustments)
- **Provides to**:
  - Gap (total expenses reduce available cash)
  - Property (housing category syncs with mortgage payment in detailed mode)

**Investments Dependencies**:
- **Requires**:
  - Income (company401k auto-populated)
  - Profile (401k limit, inflation for target cash)
  - Gap (receives surplus for allocation)
- **Provides to**:
  - Net Worth (cash, 401k, investment values)
  - Property (cash provides down payment)

**Taxes Dependencies**:
- **Requires**:
  - Income (gross income to calculate taxes)
  - Profile (location, filing status)
  - Income (pre-tax 401k contributions reduce tax base)
- **Provides to**:
  - Gap (total tax reduces available cash)

**Property Dependencies**:
- **Requires**:
  - Investments (cash for down payment in Buy mode)
  - Expenses (housing category syncs in detailed mode)
  - Profile (inflation, working years for purchase year validation)
- **Provides to**:
  - Net Worth (home equity asset, mortgage liability)
  - Gap (mortgage payment reduces available cash)
  - Expenses (mortgage payment flows to housing category in detailed mode)

---

## Calculation Precision & Timing

- **Time Horizon**: 1,200 months (100 years)
- **Precision**: All calculations preserve full floating-point precision; rounding only at display
- **Inflation**: Applied annually using compound formula: `value / (1 + rate)^years`
- **Debouncing**: 300ms debounce on projection recalculations to optimize performance
- **Scenario Support**: All data supports multiple scenarios via `activeScenarioId` in storage

---

## Storage Keys

Each page persists data to localStorage with these keys:

| Page | Storage Key | Hook |
|------|-------------|------|
| Income | `income` | `useIncomeData.js` |
| Expenses | `expenses` | `useExpensesData.js` |
| Investments | `investmentsDebt` | `useInvestmentsData.js` |
| Taxes | `taxes` | `useTaxData.js` |
| Property | `property` | `usePropertyData.js` |
| Profile | `profile` | `useProfileData.js` |
| Gap/Net Worth | `gap` | (calculated, not user input) |

---

## Next Steps

For detailed documentation on each module:
- [Income Module](./modules/income.md)
- [Expenses Module](./modules/expenses.md)
- [Investments-Debt Module](./modules/investments-debt.md)
- [Taxes Module](./modules/taxes.md)
- [Property Module](./modules/property.md)
- [Gap & Net Worth Module](./modules/gap-networth.md)

For implementation details, see [DASHBOARD-DATA-FLOW.md](./DASHBOARD-DATA-FLOW.md).
