# Taxes Module Reference

## Overview

The Taxes module is a pure calculation module (no UI component) that computes federal, state, and FICA taxes based on income, filing status, and income type. It includes built-in 2025 tax brackets for California state taxes, federal income taxes, and federal capital gains taxes. **Critically**, all tax brackets automatically inflate each year based on the profile inflation rate, preventing bracket creep. The module also supports custom tax ladders for advanced users who want to model different tax jurisdictions or scenarios.

## Module Architecture

Unlike other modules, Taxes does not have a dedicated UI page (`Taxes.jsx`). Instead, it's a pure calculation service consumed by the Gap/Net Worth module:

**Gap.calc.js calls Taxes.calc.js:**
```javascript
const taxableIncome = annualIncome - totalIndividual401k
const taxCalc = calculateTaxes(taxableIncome, 'salary', filingType, 'california', 'usa', year, inflationRate)
const annualTaxes = taxCalc.totalTax
```

## Function Reference

### calculateTaxes()

The primary export function that calculates all taxes.

#### Parameters

1. **income** (number)
   - Taxable income amount
   - Already adjusted for pre-tax deductions (401k contributions)
   - Must be ≥ 0

2. **incomeType** (string)
   - `'salary'`: W-2 wages, subject to FICA and ordinary income tax
   - `'investment'`: Capital gains, subject to capital gains tax rates, no FICA

3. **filingType** (string)
   - `'single'`: Single filer
   - `'married'`: Married Filing Jointly
   - `'head'`: Head of Household
   - `'separate'`: Married Filing Separately

4. **state** (string, default: 'california')
   - Currently only `'california'` implemented
   - Determines which state tax brackets to use
   - Custom tax ladders can override

5. **country** (string, default: 'usa')
   - Currently only `'usa'` implemented
   - Determines which federal tax brackets to use
   - Custom tax ladders can override

6. **year** (number, default: 1)
   - Relative year of projection (1 = current year, 2 = next year, etc.)
   - Used to calculate inflation multiplier
   - **Critical for bracket inflation**: tax brackets inflate by this factor

7. **inflationRate** (number, default: 0)
   - Annual inflation rate as percentage (e.g., 2.7 for 2.7%)
   - Used to inflate tax brackets
   - **Critical feature**: prevents bracket creep over time

#### Return Value

Returns an object with comprehensive tax breakdown:

```javascript
{
  income: 150000,                    // Input income
  incomeType: 'salary',               // Input income type
  filingType: 'married',              // Requested filing type
  actualStateFilingType: 'married',   // Actually used for state (after fallback logic)
  actualFederalFilingType: 'married', // Actually used for federal (after fallback logic)
  state: 'california',
  country: 'usa',

  // State tax
  stateTax: 7234,                     // Total state tax (rounded)
  stateTaxBreakdown: [                // Per-bracket breakdown
    {
      min: 0,
      max: 21500,
      rate: 0.01,
      taxableAmount: 21500,
      taxAmount: 215
    },
    // ... more brackets
  ],

  // Federal tax
  federalTax: 18648,                  // Total federal tax (rounded)
  federalTaxBreakdown: [              // Per-bracket breakdown
    // ... similar structure
  ],

  // FICA (only for salary income)
  fica: {
    socialSecurity: 9300,             // 6.2% up to wage base
    medicare: 2175,                    // 1.45% on all wages
    additionalMedicare: 0,             // 0.9% over threshold
    total: 11475
  },

  // Totals
  totalTax: 37357,                    // Sum of all taxes
  effectiveRate: 0.2490               // Effective tax rate (24.90%)
}
```

## Built-in Tax Brackets (2025)

### California State Income Tax

**Married Filing Jointly:**
| Min | Max | Rate |
|-----|-----|------|
| $0 | $21,500 | 1.0% |
| $21,500 | $51,000 | 2.0% |
| $51,000 | $80,500 | 4.0% |
| $80,500 | $111,700 | 6.0% |
| $111,700 | $141,200 | 8.0% |
| $141,200 | $721,300 | 9.3% |
| $721,300 | $865,600 | 10.3% |
| $865,600 | $1,400,000 | 11.3% |
| $1,400,000+ | ∞ | 12.3% |

**Single:**
| Min | Max | Rate |
|-----|-----|------|
| $0 | $10,800 | 1.0% |
| $10,800 | $25,500 | 2.0% |
| $25,500 | $40,200 | 4.0% |
| $40,200 | $55,900 | 6.0% |
| $55,900 | $70,600 | 8.0% |
| $70,600 | $360,700 | 9.3% |
| $360,700 | $432,800 | 10.3% |
| $432,800 | $721,300 | 11.3% |
| $721,300+ | ∞ | 12.3% |

*Head of Household brackets also included (see code)*

### Federal Income Tax (Ordinary Income)

**Married Filing Jointly:**
| Min | Max | Rate |
|-----|-----|------|
| $0 | $23,900 | 10% |
| $23,900 | $97,000 | 12% |
| $97,000 | $206,700 | 22% |
| $206,700 | $394,600 | 24% |
| $394,600 | $501,100 | 32% |
| $501,100 | $751,600 | 35% |
| $751,600+ | ∞ | 37% |

**Single:**
| Min | Max | Rate |
|-----|-----|------|
| $0 | $11,900 | 10% |
| $11,900 | $48,500 | 12% |
| $48,500 | $103,400 | 22% |
| $103,400 | $197,300 | 24% |
| $197,300 | $250,500 | 32% |
| $250,500 | $626,400 | 35% |
| $626,400+ | ∞ | 37% |

*Head of Household and Married Filing Separately brackets also included*

### Federal Capital Gains Tax

**Married Filing Jointly:**
| Min | Max | Rate |
|-----|-----|------|
| $0 | $94,100 | 0% |
| $94,100 | $583,800 | 15% |
| $583,800+ | ∞ | 20% |

**Single:**
| Min | Max | Rate |
|-----|-----|------|
| $0 | $47,000 | 0% |
| $47,000 | $518,900 | 15% |
| $518,900+ | ∞ | 20% |

*Head of Household and Married Filing Separately brackets also included*

### FICA Taxes (2025)

**Social Security:**
- Rate: 6.2%
- Wage Base: $168,600
- Only applies to first $168,600 of salary income
- Inflates with wage base each year

**Medicare:**
- Rate: 1.45%
- No wage cap
- Applies to all salary income

**Additional Medicare:**
- Rate: 0.9%
- Applies to income above threshold:
  - Single: $200,000
  - Married Filing Jointly: $250,000
  - Head of Household: $200,000
  - Married Filing Separately: $125,000
- Thresholds inflate each year

## Calculations

### Bracket Tax Calculation

For each bracket that applies to the income:

```javascript
// 1. Determine taxable amount in this bracket
const taxableInBracket = Math.min(income, bracket.max) - bracket.min

// 2. Calculate tax for this bracket
const taxInBracket = taxableInBracket * bracket.rate

// 3. Add to cumulative step tax
const totalTax = bracket.stepTax + taxInBracket
```

**Step Tax** is the cumulative tax from all previous brackets, allowing efficient calculation.

### Example: Bracket Tax Calculation

**Given:**
- Income: $150,000
- Filing: Married Filing Jointly
- State: California
- Type: Salary

**California State Tax (2025 brackets, Year 1):**

```
Bracket 1: $0 - $21,500 @ 1.0%
  Taxable: $21,500
  Tax: $21,500 * 0.01 = $215

Bracket 2: $21,500 - $51,000 @ 2.0%
  Taxable: $29,500
  Tax: $29,500 * 0.02 = $590
  Step Tax: $215

Bracket 3: $51,000 - $80,500 @ 4.0%
  Taxable: $29,500
  Tax: $29,500 * 0.04 = $1,180
  Step Tax: $805

Bracket 4: $80,500 - $111,700 @ 6.0%
  Taxable: $31,200
  Tax: $31,200 * 0.06 = $1,872
  Step Tax: $1,985

Bracket 5: $111,700 - $141,200 @ 8.0%
  Taxable: $29,500
  Tax: $29,500 * 0.08 = $2,360
  Step Tax: $3,857

Bracket 6: $141,200 - $721,300 @ 9.3%
  Taxable: $8,800 (only up to $150,000)
  Tax: $8,800 * 0.093 = $818
  Step Tax: $6,217

Total California Tax = $6,217 + $818 = $7,035
```

### Bracket Inflation Logic

**Critical Feature:** All tax brackets inflate each year to prevent bracket creep.

```javascript
// 1. Calculate inflation multiplier
const yearsOfInflation = year - 1  // Year 1 has no inflation
const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsOfInflation)

// 2. Inflate all bracket boundaries
const inflatedBrackets = brackets.map(bracket => ({
  rate: bracket.rate,  // Rate stays the same
  min: Math.round(bracket.min * inflationMultiplier),
  max: bracket.max === Infinity ? Infinity : Math.round(bracket.max * inflationMultiplier),
  stepTax: bracket.stepTax * inflationMultiplier  // Step tax also scales
}))

// 3. Apply inflated brackets to calculation
const taxResult = calculateBracketTax(income, inflatedBrackets)
```

### Example: Bracket Inflation

**Given:**
- Base bracket: $10,800 - $25,500 @ 2.0%
- Inflation Rate: 2.7%
- Year: 10

**Year 1 (no inflation):**
```
Bracket: $10,800 - $25,500 @ 2.0%
```

**Year 10 (9 years of inflation):**
```
Inflation Multiplier = 1.027^9 = 1.2723

Inflated Bracket: $13,741 - $32,443 @ 2.0%
  (min: $10,800 * 1.2723 = $13,741)
  (max: $25,500 * 1.2723 = $32,443)
```

This ensures that if your income grows with inflation, you don't drift into higher tax brackets unfairly.

### FICA Calculation with Inflation

```javascript
// Inflate thresholds
const inflatedWageBase = $168,600 * inflationMultiplier
const inflatedAdditionalMedicareThreshold = $250,000 * inflationMultiplier

// Social Security (capped)
const socialSecurity = Math.min(salary, inflatedWageBase) * 0.062

// Medicare (no cap)
const medicare = salary * 0.0145

// Additional Medicare (over threshold)
const additionalMedicare = salary > inflatedAdditionalMedicareThreshold
  ? (salary - inflatedAdditionalMedicareThreshold) * 0.009
  : 0

const ficaTotal = socialSecurity + medicare + additionalMedicare
```

### Example: Complete Tax Calculation

**Given:**
- Income: $200,000
- Filing: Married Filing Jointly
- State: California
- Type: Salary
- Year: 5 (4 years of inflation)
- Inflation Rate: 2.7%

**Step 1: Calculate inflation multiplier**
```
Inflation Multiplier = 1.027^4 = 1.1125
```

**Step 2: Inflate all brackets**
```
California Bracket 1: $0 - $23,919 @ 1.0% (was $0 - $21,500)
California Bracket 2: $23,919 - $56,738 @ 2.0% (was $21,500 - $51,000)
... (all brackets inflated)

Federal Bracket 1: $0 - $26,589 @ 10% (was $0 - $23,900)
... (all brackets inflated)

FICA SS Wage Base: $187,568 (was $168,600)
FICA Additional Medicare Threshold: $278,125 (was $250,000)
```

**Step 3: Calculate taxes**
```
California State Tax: ~$8,350 (on inflated brackets)
Federal Income Tax: ~$22,150 (on inflated brackets)
Social Security: $12,400 ($200,000 * 6.2%)
Medicare: $2,900 ($200,000 * 1.45%)
Additional Medicare: $0 ($200,000 < $278,125 threshold)

Total Tax: $45,800
Effective Rate: 22.9%
```

## Data Flow

### Inputs
- **Direct calls** from Gap.calc.js during yearly projection calculation
- No user-facing UI or localStorage
- Parameters passed from:
  - Income module: taxable income amount
  - Personal Details: filing status, inflation rate
  - Year counter from projection loop

### Storage
- Optional: Custom tax ladders can be stored in localStorage as 'taxLadders'
- Otherwise, uses built-in 2025 brackets

### Outputs
- Tax calculation object returned to Gap.calc.js
- `totalTax` field used in Gap formula: `Gap = Income - 401k - Taxes - Expenses`

### Dependencies

**Requires:**
- Personal Details module: `filingStatus`, `inflationRate`
- Income module: taxable income (after 401k deductions)

**Consumed by:**
- Gap/Net Worth module (primary consumer)

## Custom Tax Ladders

Advanced users can override default tax brackets by storing custom ladders in localStorage:

```javascript
storage.save('taxLadders', {
  states: {
    california: {
      salaryTax: {
        filingTypes: {
          married: {
            enabled: true,
            brackets: [
              { min: 0, max: 20000, rate: 1.0 },  // Rate as 1.0, not 0.01
              { min: 20000, max: 50000, rate: 2.0 },
              // ... more brackets
            ]
          },
          single: { ... }
        }
      },
      investmentTax: { ... }
    }
  },
  countries: {
    usa: {
      salaryTax: { ... },
      investmentTax: { ... }
    }
  }
})
```

**Notes on Custom Ladders:**
- Rates stored as 1.0-100.0, converted to 0.01-1.00 for calculation
- Can disable filing types and specify fallback (e.g., `useInstead: 'single'`)
- Step taxes calculated automatically
- Still subject to bracket inflation based on year and inflation rate

## Implementation Notes

### Recent Implementation: Bracket Inflation

As described in the conversation summary, bracket inflation was recently added (see Gap.calc.js:82):

**Before:**
- Brackets were static (2025 values)
- Over time, users would experience bracket creep
- Approximate deflation was attempted in Gap.calc.js (removed)

**After:**
- All brackets inflate annually by inflation rate
- FICA wage base and thresholds also inflate
- Accurate bracket application across all years
- No approximations needed

### Precision and Rounding

- Individual bracket calculations use full precision
- Final tax amounts rounded with `Math.round()`
- Effective rate calculated as decimal (not percentage)
- Rounding only at the end ensures accurate totals

### Filing Type Fallback Logic

Custom tax ladders can disable certain filing types:

```javascript
{
  married: {
    enabled: false,
    useInstead: 'single'  // Use 'single' brackets when 'married' is selected
  }
}
```

This allows modeling jurisdictions where certain filing statuses don't exist or are treated identically.

### Income Type Routing

- `incomeType === 'salary'`:
  - Uses ordinary income tax brackets
  - Calculates FICA taxes
  - Subject to all three tax types (state, federal, FICA)

- `incomeType === 'investment'`:
  - Uses capital gains tax brackets
  - No FICA taxes
  - Subject to only state and federal taxes

Currently, the Finance Project only uses 'salary' type (all income is W-2 style).

## Performance Considerations

- Bracket inflation calculation is lightweight (simple multiplication)
- Bracket tax calculation is O(n) where n = number of brackets (typically 7-9)
- Step tax optimization allows single-pass calculation
- All calculations synchronous and immediate (no async)
- Typical performance: <5ms per tax calculation

## Common Use Cases

### Standard W-2 Employee
```javascript
// Year 1, $150k salary, married filing jointly
calculateTaxes(150000, 'salary', 'married', 'california', 'usa', 1, 2.7)

// Returns:
// - California tax on 2025 brackets
// - Federal tax on 2025 brackets
// - FICA with 2025 thresholds
// Total: ~$37,000
```

### Same Employee, Year 10
```javascript
// Year 10, $150k salary (in Year 1 dollars), married filing jointly
// Income has grown to ~$197k nominal due to raises/inflation
calculateTaxes(197000, 'salary', 'married', 'california', 'usa', 10, 2.7)

// Returns:
// - California tax on INFLATED brackets (1.3x larger)
// - Federal tax on INFLATED brackets (1.3x larger)
// - FICA with INFLATED thresholds
// Effective rate similar to Year 1 (~23%) despite higher nominal income
```

### Investment Income (Capital Gains)
```javascript
// $100k long-term capital gains, single filer
calculateTaxes(100000, 'investment', 'single', 'california', 'usa', 1, 2.7)

// Returns:
// - California tax (same rates as ordinary income)
// - Federal capital gains tax (preferential rates: 0%, 15%, 20%)
// - No FICA
// Lower total tax than equivalent salary income
```

### High Earner with Additional Medicare Tax
```javascript
// $400k salary, married filing jointly, year 1
calculateTaxes(400000, 'salary', 'married', 'california', 'usa', 1, 2.7)

// Returns:
// - California: ~$38,000
// - Federal: ~$72,000
// - Social Security: $10,453 (capped at wage base)
// - Medicare: $5,800
// - Additional Medicare: $1,350 ($150k over $250k threshold * 0.9%)
// Total: ~$127,600 (31.9% effective rate)
```

## Edge Cases

### Zero Income
```javascript
calculateTaxes(0, 'salary', 'married', 'california', 'usa', 1, 2.7)
// Returns all zeros, effectiveRate: 0
```

### Negative Income (Invalid)
- Function doesn't validate input
- Would return incorrect results
- Gap.calc.js should ensure taxableIncome ≥ 0

### Missing Filing Type in Custom Ladders
- Falls back to default brackets
- Uses fallback filing type if specified
- Otherwise, defaults to 'single'

### Infinity in Max Bracket
- Highest bracket has `max: Infinity`
- Handled correctly in calculations
- Not inflated (Infinity remains Infinity)

## Future Enhancements

Potential improvements for the Taxes module:

1. **State Deduction for Federal Taxes**: Itemized deductions for state tax paid
2. **Standard Deduction**: Currently not modeled
3. **Multiple States**: Support for multi-state taxation
4. **Payroll Tax**: Employer-side FICA (currently only employee side)
5. **Net Investment Income Tax**: 3.8% surcharge on investment income for high earners
6. **Alternative Minimum Tax (AMT)**: Parallel tax calculation
7. **State Capital Gains**: Some states have preferential capital gains rates
8. **Tax Credits**: Child tax credit, earned income credit, etc.

---

## Filing Status Override

The Taxes module allows manual override of filing status for tax calculations:

### Purpose
- User's actual filing status may not match available tax brackets in their state
- Allows choosing alternate brackets when both options are available
- Example: Single user can calculate using Married brackets to model future marriage

### Mechanism
**filingStatusRemapping Storage:**
```javascript
{
  "California": {
    "Single": "Married"  // User is Single, but using Married brackets
  }
}
```

### Behavior
- **Default**: Use filing status from Profile (Single or Married)
- **Override**: Select different status in "Use Brackets For" dropdown
- **Validation**: Can only override if target status brackets exist
- **Persistence**: Stored per state and original filing status

### UI Indication
- Blue notification: "Using Override - Filing status is Single, but using Married brackets for calculations"
- Reset option: Dropdown includes "Default (Single)" option to clear override

---

## Net Worth Impact

Taxes reduce take-home income and directly impact the gap available for investments:

### Direct Impact on Gap
```
Monthly Gap = Gross Income
            - Pre-tax 401k Contributions  ← Reduces taxable income
            - Total Taxes                 ← Reduces available cash
            - Expenses
            - Mortgage Payment (if applicable)
```

### Tax Calculation Formula
```
Taxable Income = Gross Income - Pre-tax 401k Contributions - Standard Deduction

Total Tax = Federal Tax + State Tax + FICA
          = f(Taxable Income, brackets) + g(Taxable Income, state brackets) + FICA(Gross Income)

After-Tax Income = Taxable Income - Total Tax
```

### Key Components

**1. Federal Tax:**
- Progressive brackets (10%, 12%, 22%, 24%, 32%, 35%, 37% for 2025)
- Each bracket taxes only income within that range
- Standard deduction reduces taxable income

**2. State Tax:**
- Varies by state (0% to ~13%)
- Some states have flat rates, others progressive
- Fallback to "All" for flat-tax states (e.g., Arizona)

**3. FICA (Payroll Taxes):**
- Social Security: 6.2% on first $176,100 (2025)
- Medicare: 1.45% on all income
- Additional Medicare: 0.9% on income > $200K (Single) or $250K (Married)
- Canada: CPP + EI instead of FICA

### Tax-Advantaged Strategy Impact

**Pre-Tax 401k Example:**
```
Gross Income: $150,000
401k Contribution: $23,000

Without 401k:
  Taxable Income: $150,000
  Federal Tax (25% effective): $37,500
  Take-Home: $112,500

With 401k:
  Taxable Income: $127,000 ($150K - $23K)
  Federal Tax (22% effective): $27,940
  Take-Home: $99,060
  401k Balance: +$23,000

Tax Savings: $37,500 - $27,940 = $9,560
Net Worth Impact: +$23,000 (401k) + $9,560 (reduced taxes) = +$32,560 vs. $23,000
```

### Custom Deductions/Credits Impact
- **Standard Deductions**: Reduce taxable income (custom override available)
- **Tax Credits**: Direct reduction of tax owed (custom override available)
- Both are inflation-adjusted in long-term projections

---

## Cross-Page Dependencies

### Provides Data To:

1. **Gap/Net Worth Module**:
   - **Purpose**: Calculate after-tax available income
   - **Data**: Total tax amount (Federal + State + FICA)
   - **Formula**: `Gap = Income - Pre-tax 401k - Taxes - Expenses`
   - **Impact**: Taxes reduce available cash for investments

### Depends On:

1. **Income Module**:
   - **Purpose**: Calculate taxes on earned income
   - **Data**:
     - Gross Income (`annualIncome + equity`)
     - Individual 401k contributions (pre-tax deduction)
   - **Taxable Income**: `Gross Income - Individual 401k`
   - **Impact**: Higher income → higher tax bracket

2. **Profile Module**:
   - **Purpose**: Tax jurisdiction and filing status
   - **Data**:
     - `state`: Determines state tax brackets
     - `country`: Determines federal tax system (USA vs Canada)
     - `filingStatus`: Single or Married
     - `inflationRate`: Inflates deductions/credits over time
   - **Impact**: Location determines applicable tax rates

3. **Investments Module** (indirect):
   - **Purpose**: Pre-tax 401k contributions reduce taxable income
   - **Data**: Individual 401k contribution amount
   - **Formula**: `Taxable Income = Gross - 401k`
   - **Impact**: $23K contribution saves ~$5K-$8K in taxes (depending on bracket)

### Automatic Calculations

**Taxable Income Calculation:**
```
Income (Gross) - Investments (Individual 401k) → Taxes (Taxable Income)
```
- 401k contributions are pre-tax
- Automatically reduces tax base
- Tax savings compounded over time

**Bracket Selection:**
```
Profile (state, country, filingStatus) → Taxes (applicable brackets)
```
- CSV tax ladders loaded based on jurisdiction
- Filing status determines bracket thresholds
- 2025 brackets with inflation adjustments for future years

---

## Validation Rules Summary

### Filing Status Validation

| Field | Options | Required | Notes |
|-------|---------|----------|-------|
| **filingStatus** | Single, Married | Yes (from Profile) | Cannot be manually changed; set in Profile |
| **filingStatusRemapping** | Single, Married, "" (default) | No | Optional override if brackets available |

### Custom Override Validation

| Field | Min | Max | Required | Type | Notes |
|-------|-----|-----|----------|------|-------|
| **customStandardDeductions.federal** | ≥ 0 | No limit | No | Currency | Overrides default deduction |
| **customStandardDeductions.state** | ≥ 0 | No limit | No | Currency | Overrides default deduction |
| **customTaxCredits.federal** | ≥ 0 | No limit | No | Currency | Overrides default credit |
| **customTaxCredits.state** | ≥ 0 | No limit | No | Currency | Overrides default credit |

### Jurisdiction Constraints

- **Filing Status Override**: Can only remap if target brackets exist
  - Example: Can't use Married brackets in state that only has "All"
  - Arizona (only "All") → No override needed, works for all statuses
- **Storage Key**: Stored per `jurisdiction = country_state_filingStatus`
- **Reset**: Deletes custom value, returns to CSV default

### Error Messages

| Validation Failure | Error Message |
|-------------------|---------------|
| Filing status brackets not available | "Tax brackets for [status] are not available in [state]" (shown as warning, not error) |
| Custom deduction < 0 | "Standard deduction must be a positive number or 0" |
| Custom credit < 0 | "Tax credit must be a positive number or 0" |

### Calculation Rules

- **Progressive Brackets**: Tax calculated cumulatively across brackets
- **Inflation Adjustment**: Deductions and credits inflated in future year projections
- **Precision**: No rounding in tax calculations; preserve full floating-point precision
- **FICA Caps**: Social Security has wage cap ($176,100 in 2025); Medicare does not
