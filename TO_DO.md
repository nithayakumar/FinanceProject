# Future Enhancements

## Income
- [ ] Validate that individual 401k contributions don't exceed annual limit (considering couples may have 2x the limit)
  - Consider adding a "number of earners" field to Personal Details
  - Check individual401k against (limit * number of earners)
  - Show warning if exceeded

## Investments & Debt
- [ ] Add debt tracking and payoff calculations
- [ ] Model loan payments and interest

## Taxes
- [ ] Add state tax support beyond California
- [ ] Allow custom tax years beyond 2025

## Gap
- [ ] Add notifications when cash goes negative
- [ ] Model borrowing/credit when cash is negative
- [ ] Add emergency fund targets and warnings

## General
- [ ] Add data export (CSV, PDF)
- [ ] Add scenarios comparison (side-by-side)
- [ ] Multi-currency support

## Calculation Methodology
- [ ] **Move all growth calculations from annual to monthly**
  - Currently all growth rates (income, investments, 401k, inflation) are compounded annually
  - Target: Compound growth on a monthly basis for more accurate projections
  - Affects: Income.calc.js, Gap.calc.js, Expenses.calc.js
  - Formula change: `Math.pow(1 + rate/100, years)` → `Math.pow(1 + rate/1200, months)`
  - Note: This will provide more accurate month-to-month projections
