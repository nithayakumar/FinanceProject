# Scenario Editor Constraints (MUST match main modules)

## Income Module
- **Max streams**: 3
- **Min streams**: 1
- **Jumps per stream**: Unlimited
- **Fields**: id, name, annualIncome, company401k, individual401k, equity, growthRate, endWorkYear, jumps[]

## Expenses Module
- **Categories**: FIXED 9 categories (cannot add/delete)
  - Housing
  - Utilities
  - Transportation
  - Medical
  - Childcare
  - Education
  - Food
  - Entertainment
  - Other
- **One-time expenses**: Unlimited add/delete
- **Jumps per category**: Unlimited
- **Fields per category**: id, category, annualAmount, growthRate, jumps[]
- **Fields per one-time**: id, year, amount, description

## Investments Module
- **Max investment accounts**: 3
- **Min investment accounts**: 0
- **Fields**: id, currentValue, costBasis, growthRate, portfolioPercent
- **Note**: portfolioPercent must be included!
