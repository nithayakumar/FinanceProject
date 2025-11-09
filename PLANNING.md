# FinanceProject - Project Planning

## Project Overview

An application to help users make **smart, data-backed financial decisions** through scenario analysis and comparison tools.

### Purpose
Enable users to evaluate major life and financial decisions by modeling different scenarios with real data, helping them understand the long-term financial implications of their choices.

### Target User
Single user application (no authentication for now). Focus on individual financial decision-making.

## Use Cases

### 1. Job Comparison
Compare multiple job offers considering salary, benefits, location, growth potential, and total compensation packages.

### 2. Retirement Planning
Answer "When can I retire?" by modeling retirement scenarios based on current savings, expenses, expected returns, and lifestyle goals.

### 3. Life Event Impact Analysis
Understand how major life changes impact finances:
- Taking a sabbatical
- Career breaks
- Going back to school
- Starting a family

### 4. State/Location Relocation
Compare living in different states/cities by analyzing:
- Salary differences
- Tax implications (state, local, property)
- Cost of living (housing, utilities, food)
- Net financial impact

## Data Collection Tiers

Users will provide information through a tiered, progressive disclosure approach to make data entry manageable and non-overwhelming.

### Tier 1: Basic Profile
- Current income
- Current location
- Age
- Basic monthly expenses

### Tier 2: Financial Details
- Savings & investments
- Debt obligations
- Retirement accounts (401k, IRA, etc.)
- Monthly budget breakdown

### Tier 3: Scenario-Specific Data
Collected based on the decision being analyzed:
- **Job comparison**: Multiple job offers with full details
- **Retirement**: Target retirement age, expected expenses, Social Security estimates
- **Life events**: Duration, income changes, expense changes
- **Relocation**: Target locations, expected salary changes

### Tier 4: Advanced Modeling (Future)
- Investment return assumptions
- Inflation rates
- Tax bracket optimization
- Healthcare costs

## Core Features

### Phase 1: Foundation (MVP)
- [ ] Basic user data input (Tier 1 & 2)
- [ ] Job comparison calculator
- [ ] Simple data persistence (local storage or simple DB)
- [ ] Basic results visualization

### Phase 2: Enhanced Scenarios
- [ ] Retirement planning calculator
- [ ] Life event impact analyzer
- [ ] Historical data tracking
- [ ] Export results (PDF/CSV)

### Phase 3: Location Analysis
- [ ] State relocation calculator
- [ ] Tax comparison engine
- [ ] Cost of living integration (API or static data)
- [ ] Side-by-side scenario comparison

### Phase 4: Advanced Features
- [ ] Multiple scenario comparison
- [ ] What-if analysis tools
- [ ] Sensitivity analysis
- [ ] Recommendation engine

## Technical Architecture

### Design Principles
- **Feature-based organization**: Code separated by features, not layers
- **Small, flexible modules**: Maintainable folders/files (max 200 lines)
- **Pure calculations**: Business logic separated from UI components
- **Iterative development**: Each feature should be independently demoable
- **Simple data flow**: No API layer, direct function calls, localStorage only
- **AI-friendly**: Small files that fit in context windows, clear structure

### Recommended Stack

#### Frontend
- **Vite + React** (fast, simple, no server/client confusion)
- **Tailwind CSS** (rapid styling)
- **Recharts** (chart library for visualizations)
- **React Router** (explicit routing)

#### Data Storage
- **localStorage** (no database setup needed)
- **JSON files** (portable scenarios, easy export/import)
- **No backend** (direct function calls, no API layer)

#### State Management
- **React useState/useEffect** (simple, built-in)
- **No external state library needed** (single-user app)

#### Why This Stack?
- ✅ **Fast to start**: `npm create vite` and code immediately
- ✅ **No setup friction**: No database, no backend server
- ✅ **Easy debugging**: localStorage visible in DevTools
- ✅ **Beginner-friendly**: Simple React patterns, no magic
- ✅ **AI-friendly**: Clear data flow, small files
- ✅ **Portable**: Export/import scenarios as JSON

### Project Structure

**Philosophy**: Small files (100-200 lines), feature-based organization, no backend complexity.

```
FinanceProject/
├── src/
│   ├── features/
│   │   ├── personal-details/
│   │   │   ├── PersonalDetails.jsx          # Input + Output (~150 lines)
│   │   │   └── PersonalDetails.calc.js      # Pure calculations (~40 lines)
│   │   ├── income/
│   │   │   ├── Income.jsx                   # Input + Output (~180 lines)
│   │   │   └── Income.calc.js               # Pure calculations (~50 lines)
│   │   ├── expenses/
│   │   │   ├── Expenses.jsx                 # Input + Output (~200 lines)
│   │   │   └── Expenses.calc.js             # Pure calculations (~60 lines)
│   │   ├── taxes/
│   │   │   ├── Taxes.jsx                    # Output only (~150 lines)
│   │   │   ├── Taxes.calc.js                # Tax calculations (~80 lines)
│   │   │   └── data/
│   │   │       ├── federal.json             # Federal tax brackets
│   │   │       ├── california.json          # CA state tax data
│   │   │       ├── texas.json               # TX state tax data
│   │   │       └── index.js                 # Tax data loader (~30 lines)
│   │   ├── investments-debt/
│   │   │   ├── InvestmentsDebt.jsx          # Input + Output (~200 lines)
│   │   │   └── InvestmentsDebt.calc.js      # Net worth calcs (~70 lines)
│   │   ├── gap/
│   │   │   ├── Gap.jsx                      # Output only (~180 lines)
│   │   │   └── Gap.calc.js                  # Integration layer (~100 lines)
│   │   └── scenarios/
│   │       ├── ScenarioList.jsx             # List + create (~150 lines)
│   │       ├── ScenarioCompare.jsx          # Comparison view (~200 lines)
│   │       └── Scenario.calc.js             # Scenario engine (~120 lines)
│   ├── shared/
│   │   ├── components/                      # Reusable UI (each <50 lines)
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Chart.jsx
│   │   │   └── Navigation.jsx
│   │   ├── storage.js                       # localStorage wrapper (~80 lines)
│   │   └── utils.js                         # Helper functions (~60 lines)
│   ├── App.jsx                              # Routes + navigation (~100 lines)
│   ├── main.jsx                             # Entry point (~20 lines)
│   └── index.css                            # Tailwind imports
├── data/                                    # Portable scenario files
│   ├── scenarios/
│   │   ├── example-california.json
│   │   └── example-texas.json
│   └── README.md                            # Scenario format docs
├── package.json
├── vite.config.js
├── tailwind.config.js
├── PLANNING.md
└── README.md
```

**File Size Guidelines**:
- ✅ **Components**: 100-200 lines max (Input + Output in one file)
- ✅ **Calculation files**: 30-100 lines (pure functions, no UI)
- ✅ **Shared components**: <50 lines each (single purpose)
- ✅ **Data files (JSON)**: Any size (easy for AI to read)

**Why This Structure Works**:
- **Small context windows**: Each file fits in AI's context
- **Easy debugging**: Clear file boundaries, no magic
- **Portable features**: Copy a feature folder = copy the feature
- **No backend**: Everything in one place, simple data flow

## Data Architecture

### Core Concepts

The data model must support three critical requirements:
1. **Iterative Calculations**: Dependencies between financial components (pre-tax → taxable income → taxes → post-tax)
2. **Dynamic Scenarios**: Multiple variations for comparison (State A vs State B, Job 1 vs Job 2)
3. **Life Milestones**: Temporal events that modify finances over time (child birth, sabbatical)

### Data Model Structure

**Storage**: localStorage + JSON files (no database)

```
localStorage keys:
├── 'profile'              # Personal details
├── 'income'               # Income data
├── 'expenses'             # Expense data
├── 'investments-debt'     # Investments & debt data
└── 'scenarios'            # Array of scenario objects

Each scenario is a JSON object:
{
  id: "scenario-1",
  name: "Texas Remote Job",
  overrides: {
    personalDetails: { state: "TX", location: "Austin" },
    income: { salary: 145000 },
    expenses: { housing: 1800 }
  }
}
```

**Data Flow**:
1. User inputs data → Saved to localStorage
2. Navigate to output page → Load from localStorage → Calculate → Display
3. Create scenario → Store overrides only → Calculate merged data
4. Export → Download all localStorage as JSON file
5. Import → Load JSON file → Populate localStorage

### Calculation Pipeline (Iterative Dependencies)

**Challenge**: Pre-tax contributions affect taxable income, which affects taxes, which affects post-tax income. Users need to see these interdependencies and refine inputs.

**Proposed Solution**: Calculation Engine with Dependency Graph

```
Calculation Order:
1. Gross Income (base input)
2. Pre-tax Deductions (401k, HSA, etc.)
   → Reduces taxable income
3. Taxable Income = Gross - Pre-tax Deductions
4. Taxes (calculated from taxable income, location, filing status)
   → Federal, State, Local, FICA
5. Post-tax Deductions (Roth IRA, after-tax savings)
6. Net Income = Gross - All Taxes - Post-tax Deductions
7. Available for Expenses = Net Income
8. Savings/Gap = Available - Expenses
```

**Implementation Approach**:
- Each calculation step stores intermediate results
- Frontend shows breakdown at each step on output pages
- Users modify inputs on input pages, then navigate to output pages to see results
- Backend provides a `/calculate` endpoint that returns full breakdown
- Calculations are triggered when navigating to output pages, not on every input change

**Example Data Flow**:
```javascript
Input: {
  grossIncome: 150000,
  preTax401k: 22500,
  location: "California",
  filingStatus: "single"
}

Calculated: {
  grossIncome: 150000,
  preTaxDeductions: {
    "401k": 22500,
    total: 22500
  },
  taxableIncome: 127500,
  taxes: {
    federal: 22000,
    state: 8500,
    fica: 11475,
    total: 41975
  },
  postTaxIncome: 85525,
  postTaxDeductions: {},
  netIncome: 85525
}
```

### Scenario System (Dynamic Comparisons)

**Challenge**: Users need to compare multiple scenarios side-by-side (e.g., State 1 vs State 2, Job A vs Job B).

**Proposed Solution**: Scenario Instances with Overrides

```javascript
// Base Profile (current situation)
baseProfile = {
  personalDetails: { age: 30, location: "California" },
  income: { salary: 150000, bonus: 15000 },
  expenses: { housing: 2500, food: 800, ... }
}

// Scenario 1: Move to Texas
scenario1 = {
  id: "scenario-1",
  name: "Texas Remote Job",
  baseProfileId: "base-profile-1",
  overrides: {
    location: "Texas",
    income: { salary: 145000 }, // slight pay cut
    expenses: { housing: 1800 } // lower rent
  }
}

// Scenario 2: New job in California
scenario2 = {
  id: "scenario-2",
  name: "California Tech Company",
  baseProfileId: "base-profile-1",
  overrides: {
    income: { salary: 180000, bonus: 30000, equity: 50000 }
  }
}
```

**Comparison View**: Shows all scenarios side-by-side with calculated results, highlighting differences.

### Life Milestones (Temporal Events)

**Challenge**: Events like having a child affect finances for extended periods (18+ years). Sabbaticals temporarily reduce income. Retirement changes income/expense structure.

**Proposed Solution**: Timeline-Based Event System

```javascript
lifeMilestone = {
  id: "milestone-1",
  name: "Birth of first child",
  type: "childBirth",
  startDate: "2026-06-01",
  duration: { years: 18 },
  impacts: {
    income: [
      {
        type: "reduction",
        amount: 30000, // reduced income (parental leave, part-time)
        startOffset: 0, // immediate
        duration: { months: 6 }
      }
    ],
    expenses: [
      {
        category: "childcare",
        amount: 1500, // monthly
        startOffset: { months: 6 },
        duration: { years: 5 }
      },
      {
        category: "general",
        amount: 500, // monthly (diapers, food, clothes)
        startOffset: 0,
        duration: { years: 18 }
      }
    ],
    taxes: {
      deductions: [
        {
          type: "childTaxCredit",
          amount: 2000, // annual
          duration: { years: 17 }
        }
      ]
    }
  }
}
```

**Projection Engine**:
- Takes base scenario + life milestones
- Projects year-by-year finances
- Applies milestone impacts at appropriate times
- Returns timeline array with annual snapshots

```javascript
projection = [
  { year: 2025, income: 150000, expenses: 60000, savings: 40000 },
  { year: 2026, income: 135000, expenses: 75000, savings: 20000 }, // child impact
  { year: 2027, income: 150000, expenses: 84000, savings: 26000 },
  // ... continues for planning horizon
]
```

### Storage Implementation

**localStorage Structure**:

```javascript
// shared/storage.js - Simple wrapper
export const storage = {
  save(key, data) {
    localStorage.setItem(key, JSON.stringify(data))
    console.log(`✅ Saved ${key}:`, data)
  },

  load(key) {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  },

  exportAll() {
    return {
      profile: this.load('profile'),
      income: this.load('income'),
      expenses: this.load('expenses'),
      investmentsDebt: this.load('investments-debt'),
      scenarios: this.load('scenarios') || []
    }
  },

  importAll(data) {
    Object.entries(data).forEach(([key, value]) => {
      if (value) this.save(key, value)
    })
  }
}
```

**Benefits**:
- ✅ No database setup or migrations
- ✅ Visible in Chrome DevTools (Application > Local Storage)
- ✅ Easy export/import via JSON files
- ✅ Portable scenarios
- ✅ Simple debugging with console.log

## Implementation Phases (Feature-Based)

### Phase 0: Setup & Foundation
- [x] Create repository
- [x] Define project requirements and data architecture
- [x] Choose and document final tech stack (Vite + React + localStorage)
- [ ] Initialize Vite project
- [ ] Install dependencies (React Router, Tailwind, Recharts)
- [ ] Configure Tailwind CSS
- [ ] Create storage.js utility
- [ ] Build App.jsx with routes
- [ ] Create Navigation component
- [ ] Build basic UI shell (layout, navigation)

**Setup Commands**:
```bash
npm create vite@latest . -- --template react
npm install react-router-dom recharts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm run dev
```

**Demo Goal**: Empty application with navigation working, routes defined, storage utility ready

---

### Phase 1: Personal Detail Collection
**What**: Collect basic user information that applies across all scenarios

**Data to Collect**:
- Name (optional, for display)
- Age / Date of Birth
- Current location (State, City)
- Filing status (Single, Married Filing Jointly, etc.)
- Number of dependents

**Tasks**:
- [ ] Create PersonalDetails.jsx component
  - [ ] Build input view (form with fields)
  - [ ] Build output view (summary display)
  - [ ] Add view state toggle (input ↔ output)
- [ ] Create PersonalDetails.calc.js (validation logic)
- [ ] Implement form validation (age > 0, state required, etc.)
- [ ] Save to localStorage on "Continue" click
- [ ] Load from localStorage on component mount
- [ ] Add navigation to next feature (Income)

**Code Structure**:
```javascript
// PersonalDetails.jsx (~150 lines)
- useState for form data
- useState for view ('input' or 'output')
- useEffect to load saved data
- handleSave → storage.save('profile', data)
- Toggle between input/output views
```

**Demo Goal**: User can enter personal details, click Continue (auto-saves to localStorage), see summary, click Edit to go back

---

### Phase 2: Income
**What**: Collect all income sources with support for pre-tax vs post-tax

**Data to Collect**:
- Primary salary (annual)
- Bonus (annual, quarterly, or one-time)
- Stock/Equity compensation
- Rental income
- Other income sources
- Pre-tax contributions (401k, HSA, FSA)

**Calculation Requirements**:
- Calculate gross income
- Apply pre-tax deductions
- Determine taxable income
- Show income breakdown

**Tasks**:
- [ ] Create Income.jsx component
  - [ ] Build input view (salary, bonus, equity, pre-tax contributions)
  - [ ] Build output view (calculated breakdown + chart)
  - [ ] Add view state toggle
- [ ] Create Income.calc.js
  - [ ] calculateIncome() function (~40 lines)
  - [ ] Returns: gross, preTaxTotal, taxable, breakdown
- [ ] Implement real-time validation (positive numbers)
- [ ] Save to localStorage on "Continue"
- [ ] Calculate results when switching to output view
- [ ] Add simple bar chart (Recharts) for income breakdown
- [ ] Add navigation to Expenses

**Code Structure**:
```javascript
// Income.calc.js (~50 lines)
export function calculateIncome(data) {
  const gross = data.salary + data.bonus + data.equity
  const preTaxTotal = data.contribution401k + data.contributionHSA
  const taxable = gross - preTaxTotal

  return { gross, preTaxTotal, taxable, breakdown: {...} }
}
```

**Demo Goal**: User inputs income sources, clicks Continue, sees calculated breakdown showing how pre-tax contributions reduce taxable income (with chart)

---

### Phase 3: Expenses
**What**: Track monthly/annual expenses across categories

**Data to Collect**:
- Fixed expenses (rent/mortgage, insurance, utilities)
- Variable expenses (food, transportation, entertainment)
- Periodic expenses (annual subscriptions, quarterly payments)
- Debt payments (separate from Investments & Debt feature)

**Calculation Requirements**:
- Monthly total expenses
- Annual total expenses
- Categorized breakdown
- Essential vs discretionary

**Tasks**:
- [ ] Create Expenses.jsx component
  - [ ] Build input view (categorized expense form)
  - [ ] Build output view (breakdown + pie chart)
  - [ ] Add view state toggle
- [ ] Create Expenses.calc.js
  - [ ] calculateExpenses() function (~60 lines)
  - [ ] Category totals, monthly/annual calculations
- [ ] Implement expense categories (housing, food, transport, etc.)
- [ ] Save to localStorage on "Continue"
- [ ] Add pie chart for expense breakdown by category
- [ ] Show essential vs discretionary split
- [ ] Add navigation to Taxes

**Code Structure**:
```javascript
// Expenses.calc.js (~60 lines)
export function calculateExpenses(data) {
  const categories = {
    housing: data.housing,
    food: data.food,
    transportation: data.transportation,
    // ...
  }

  const monthlyTotal = Object.values(categories).reduce((a, b) => a + b, 0)
  const annualTotal = monthlyTotal * 12

  return { categories, monthlyTotal, annualTotal }
}
```

**Demo Goal**: User inputs expenses by category, clicks Continue, sees monthly/annual breakdown with pie chart showing spending distribution

---

### Phase 4: Taxes
**What**: Calculate federal, state, and local taxes based on income and location

**Note**: This is an **output-only** feature. No input page needed - all data comes from Personal Details (location, filing status) and Income (taxable income).

**Calculation Requirements**:
- Federal income tax (brackets, standard deduction)
- State income tax (varies by state)
- FICA (Social Security + Medicare)
- Local/city taxes (if applicable)
- Tax deductions and credits
- Effective vs marginal tax rates

**Tasks**:
- [ ] Create tax data files (JSON)
  - [ ] data/federal.json (2025 brackets + deductions)
  - [ ] data/california.json
  - [ ] data/texas.json (no state income tax)
  - [ ] data/index.js (loader utility)
- [ ] Create Taxes.jsx component (output only, no input)
- [ ] Create Taxes.calc.js
  - [ ] calculateFederalTax() (~40 lines)
  - [ ] calculateStateTax() (~30 lines)
  - [ ] calculateFICA() (~20 lines)
  - [ ] calculateTaxes() (main function, ~30 lines)
- [ ] Load profile + income from localStorage
- [ ] Calculate taxes on component mount
- [ ] Build tax breakdown UI (federal, state, FICA, total)
- [ ] Add pie chart showing tax distribution
- [ ] Show effective vs marginal rate
- [ ] Add navigation to Investments & Debt

**Code Structure**:
```javascript
// Taxes.calc.js (~80 lines total)
export function calculateTaxes(taxableIncome, state, filingStatus) {
  const federal = calculateFederalTax(taxableIncome, filingStatus)
  const stateTax = calculateStateTax(taxableIncome, state, filingStatus)
  const fica = calculateFICA(taxableIncome)

  return {
    federal,
    state: stateTax,
    fica,
    total: federal + stateTax + fica,
    effectiveRate: (federal + stateTax + fica) / taxableIncome
  }
}
```

**Demo Goal**: User navigates to Taxes page, sees complete tax breakdown (federal, state, FICA) calculated from saved income and profile data, with pie chart

---

### Phase 5: Investments & Debt
**What**: Track investment accounts, retirement savings, and debt obligations

**Data to Collect**:
- Retirement accounts (401k, IRA, Roth IRA) - balances
- Taxable investment accounts (brokerage)
- Savings accounts
- Debt (student loans, auto, mortgage, credit cards)
  - Principal balance
  - Interest rate
  - Monthly payment
  - Payoff timeline

**Calculation Requirements**:
- Net worth calculation
- Debt-to-income ratio
- Investment growth projections (with assumed returns)
- Debt payoff timeline
- Interest paid over time

**Tasks**:
- [ ] Create InvestmentsDebt.jsx component
  - [ ] Build input view (accounts + debts form)
  - [ ] Build output view (net worth + debt timeline)
  - [ ] Add view state toggle
- [ ] Create InvestmentsDebt.calc.js
  - [ ] calculateNetWorth() (~30 lines)
  - [ ] calculateDebtPayoff() (~40 lines)
- [ ] Support multiple debt entries (array)
- [ ] Save to localStorage on "Continue"
- [ ] Show net worth calculation (assets - liabilities)
- [ ] Add debt payoff timeline visualization
- [ ] Add navigation to Gap Calculations

**Code Structure**:
```javascript
// InvestmentsDebt.calc.js (~70 lines)
export function calculateNetWorth(data) {
  const totalAssets = data.retirement401k + data.retirementIRA +
                      data.brokerage + data.savings

  const totalDebt = data.debts.reduce((sum, debt) => sum + debt.principal, 0)

  return {
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt
  }
}

export function calculateDebtPayoff(debts) {
  // Calculate payoff timeline for each debt
  return debts.map(debt => ({
    name: debt.name,
    monthsToPayoff: calculateMonths(debt),
    totalInterest: calculateInterest(debt)
  }))
}
```

**Demo Goal**: User inputs investment accounts and debts, clicks Continue, sees net worth and debt payoff timeline for each debt

---

### Phase 6: Gap Calculations
**What**: Calculate the difference between income and expenses, show savings rate

**Note**: This is an **output-only** feature. It integrates all previous features into a comprehensive dashboard.

**Calculation Requirements**:
- Monthly cash flow = Net Income - Expenses
- Annual savings
- Savings rate (% of gross income)
- Runway (months of expenses covered by savings)
- Financial health indicators

**Tasks**:
- [ ] Create Gap.jsx component (output only)
- [ ] Create Gap.calc.js (integration layer)
  - [ ] calculateGap() - integrates all features (~100 lines)
  - [ ] Loads profile, income, expenses, taxes from localStorage
  - [ ] Calls all calculation functions
  - [ ] Returns comprehensive summary
- [ ] Build financial dashboard UI
  - [ ] Income summary card
  - [ ] Tax summary card
  - [ ] Expense summary card
  - [ ] Savings/gap card (highlight)
- [ ] Add waterfall chart (income → taxes → expenses → savings)
- [ ] Calculate and show key metrics:
  - [ ] Monthly cash flow
  - [ ] Annual savings
  - [ ] Savings rate (%)
  - [ ] Emergency fund runway (months)
- [ ] Add navigation to Scenarios

**Code Structure**:
```javascript
// Gap.calc.js (~100 lines)
import { calculateIncome } from '../income/Income.calc'
import { calculateTaxes } from '../taxes/Taxes.calc'
import { calculateExpenses } from '../expenses/Expenses.calc'
import { calculateNetWorth } from '../investments-debt/InvestmentsDebt.calc'

export function calculateGap(allData) {
  const income = calculateIncome(allData.income)
  const taxes = calculateTaxes(income.taxable, allData.profile.state, allData.profile.filingStatus)
  const expenses = calculateExpenses(allData.expenses)
  const netWorth = calculateNetWorth(allData.investmentsDebt)

  const netIncome = income.gross - taxes.total
  const annualSavings = netIncome - expenses.annualTotal
  const monthlySavings = annualSavings / 12
  const savingsRate = (annualSavings / income.gross) * 100

  return {
    income,
    taxes,
    expenses,
    netWorth,
    netIncome,
    annualSavings,
    monthlySavings,
    savingsRate,
    runway: netWorth.totalAssets / expenses.monthlyTotal
  }
}
```

**Demo Goal**: User navigates to Gap Calculations, sees complete financial dashboard with waterfall chart showing money flow, savings rate, and financial health metrics

---

### Phase 7: Scenarios
**What**: Create and compare multiple financial scenarios

**Note**: This feature has a unique flow - users create/edit scenarios on one page, then view comparisons on another.

**Scenario Types**:
- State relocation comparison (different taxes, COL)
- Job offer comparison
- Lifestyle change (FIRE, part-time, career change)
- Life event impact (child, sabbatical)

**Calculation Requirements**:
- Clone base profile into scenario
- Override specific values (location, income, expenses)
- Recalculate everything for scenario
- Side-by-side comparison view
- Difference highlighting (absolute and percentage)

**Page Structure**:
- **Scenario Management Page**: List scenarios, create new, edit existing, set overrides
- **Scenario Comparison Page**: Side-by-side comparison of 2+ scenarios with visualizations

**Tasks**:
- [ ] Create ScenarioList.jsx component
  - [ ] List all saved scenarios
  - [ ] "Create New Scenario" button
  - [ ] Edit/delete existing scenarios
  - [ ] Scenario form (name + overrides)
- [ ] Create ScenarioCompare.jsx component
  - [ ] Select 2+ scenarios to compare
  - [ ] Side-by-side comparison table
  - [ ] Highlight differences (color coding)
- [ ] Create Scenario.calc.js
  - [ ] mergeScenario() - merge base + overrides (~30 lines)
  - [ ] calculateScenario() - reuse Gap.calc.js (~40 lines)
  - [ ] compareScenarios() - diff analysis (~50 lines)
- [ ] Save scenarios array to localStorage
- [ ] Export/import scenario JSON files
- [ ] Add "Clone Current Profile" feature (creates scenario from current data)

**Code Structure**:
```javascript
// Scenario.calc.js (~120 lines)
import { calculateGap } from '../gap/Gap.calc'

export function calculateScenario(scenario, baseData) {
  // Merge base data with scenario overrides
  const merged = {
    profile: { ...baseData.profile, ...scenario.overrides.profile },
    income: { ...baseData.income, ...scenario.overrides.income },
    expenses: { ...baseData.expenses, ...scenario.overrides.expenses },
    investmentsDebt: { ...baseData.investmentsDebt, ...scenario.overrides.investmentsDebt }
  }

  // Reuse gap calculation (which calls all other calcs)
  return calculateGap(merged)
}

export function compareScenarios(scenarios, baseData) {
  const results = scenarios.map(s => ({
    name: s.name,
    results: calculateScenario(s, baseData)
  }))

  // Calculate differences
  return {
    scenarios: results,
    differences: calculateDifferences(results)
  }
}
```

**Demo Goal**: User creates 2 scenarios (e.g., "CA Job" vs "TX Job"), navigates to comparison page, sees side-by-side breakdown with highlighted differences (savings, taxes, net income)

**Example Scenarios**:
1. **State Comparison**: Current CA job vs equivalent TX job
2. **Job Offers**: Company A vs Company B with different comp packages
3. **Sabbatical Impact**: 6-month break and its effect on finances

---

### Phase 8: Life Milestones (Future)
**What**: Add temporal events that affect finances over time

**Milestone Types**:
- Child birth (reduced income, increased expenses, tax credits)
- Home purchase (down payment, mortgage, property taxes)
- Sabbatical (temporary income loss)
- Career change (income adjustment)
- Retirement (income/expense structure change)

**Tasks**:
- [ ] Design milestone creation UI
- [ ] Create milestone data model with time-based impacts
- [ ] Build timeline projection engine
- [ ] Calculate year-by-year impact
- [ ] Visualize financial timeline (10-30 year projection)
- [ ] Show milestone effects on timeline
- [ ] Allow milestone editing and removal

**Demo Goal**: User adds "birth of child in 2026" and sees 18-year financial impact projected

## Development Approach

### Iterative & Demoable
Each feature should be:
1. Independently functional
2. Demoable to users/stakeholders
3. Valuable on its own
4. Built with future features in mind (extensible)

### Feature Development Cycle
1. Plan feature requirements
2. Design data model
3. Build backend calculations/API
4. Build frontend input page UI
5. Build frontend output page UI
6. Implement navigation and auto-save
7. Connect & test
8. Demo & gather feedback
9. Refine before moving to next feature

### Two-Page Pattern for Each Feature
Every feature (except output-only features) follows the same pattern:
- **Input Page**: User enters data, clicks "Continue", data is saved
- **Output Page**: User sees calculated results and visualizations
- **Edit Flow**: From output page, user can click "Edit" to return to input page
- **Navigation**: Output page has "Continue to [Next Feature]" button

## Notes & Decisions

### Architecture Decisions
- **No authentication**: Simplifies MVP, single-user focus
- **No backend/database**: localStorage only, faster development, easier debugging
- **Feature-based structure**: Better scalability and maintainability
- **Small files**: Max 200 lines per file for AI context windows
- **Pure calculation functions**: Separated from UI, easily testable and portable
- **JSON data files**: Tax brackets and reference data in JSON, not code
- **Direct function calls**: No API layer, simpler data flow

### Data Strategy
- **localStorage as database**: Single-user local data, visible in DevTools
- **JSON export/import**: Scenarios are portable files
- **Calculations on-demand**: Triggered by user navigation, not real-time
- **Pure functions**: All calculations are pure functions that can be copied between features

### UI/UX Strategy
- Tiered data collection reduces cognitive load
- Progressive disclosure: only ask for what's needed
- Visual feedback and results (charts, graphs)
- Save scenarios for comparison

## UI/UX Principles

### Two-Page Feature Pattern

Every feature follows a consistent **Input → Output** pattern with dedicated pages:

**Input Page**:
- Clean form for data collection
- Field validation and error messages
- Clear labels and helper text
- "Continue" or "Next" button to proceed
- Auto-saves when navigating away

**Output Page**:
- Visual representation of results
- Charts, graphs, and breakdowns
- Summary cards with key metrics
- "Edit" button to return to input page
- Navigation to next feature

### Navigation Flow

```
Personal Details (Input) → Personal Details (Output) →
Income (Input) → Income (Output) →
Expenses (Input) → Expenses (Output) →
Taxes (Output only - calculated) →
Investments & Debt (Input) → Investments & Debt (Output) →
Gap Calculations (Output only - summary) →
Scenarios (Input/Output combined)
```

### Save Behavior

**When saving occurs**:
- Automatically when navigating away from an input page
- Manually via "Save" or "Continue" button
- On form field blur (individual field auto-save, optional)

**What gets saved**:
- All form inputs from current feature
- Validation must pass before allowing navigation
- Incomplete data can be saved as draft

### Calculation Timing

**Important**: Calculations are NOT done immediately on input change.

**When calculations occur**:
- When user navigates from Input page to Output page
- When user explicitly clicks "Calculate" or "Recalculate"
- When loading an Output page (uses saved input data)

**Benefits of deferred calculations**:
- Users can input all data without distraction
- Reduces server load (batch calculations)
- Clear separation between input and analysis
- Users understand when they're reviewing vs editing

### Page Structure Examples

**Example: Income Input Page**
```
┌─────────────────────────────────┐
│ Income                           │
│                                  │
│ Annual Salary: [_______]         │
│ Annual Bonus:  [_______]         │
│ Equity/RSUs:   [_______]         │
│                                  │
│ Pre-tax Contributions:           │
│   401(k):      [_______]         │
│   HSA:         [_______]         │
│                                  │
│            [Continue →]          │
└─────────────────────────────────┘
```

**Example: Income Output Page**
```
┌─────────────────────────────────┐
│ Income Summary        [Edit]     │
│                                  │
│ Gross Income:     $150,000       │
│ Pre-tax:          -$22,500       │
│ Taxable Income:   $127,500       │
│                                  │
│ [Chart: Income Breakdown]        │
│                                  │
│           [Continue to Expenses →]│
└─────────────────────────────────┘
```

### Design Principles

1. **Clarity Over Cleverness**
   - Simple, straightforward forms
   - Clear labels and instructions
   - No hidden functionality

2. **Progressive Disclosure**
   - Show advanced options only when needed
   - Collapsible sections for optional data
   - Tooltips for complex terms

3. **Visual Hierarchy**
   - Most important information prominent
   - Use whitespace effectively
   - Consistent typography and spacing

4. **Feedback & Validation**
   - Immediate feedback on invalid inputs
   - Success messages after saves
   - Error messages that explain how to fix

5. **Consistency**
   - Same layout pattern for all input pages
   - Same layout pattern for all output pages
   - Consistent button placement and styling
   - Predictable navigation flow

6. **Mobile Considerations**
   - Responsive layouts
   - Touch-friendly input fields
   - Stack elements vertically on small screens

### Color & Visual System

**Suggested palette**:
- Primary: Financial blue/green (trust, stability)
- Success: Green (positive outcomes, savings)
- Warning: Amber (attention needed)
- Danger: Red (debt, deficits)
- Neutral: Grays (backgrounds, text)

**Visual elements**:
- Charts for comparisons (bar, pie, line)
- Progress indicators for multi-step flows
- Cards for grouped information
- Tables for detailed breakdowns

### Error Handling

**Validation errors**:
- Inline, next to the field
- Explain what's wrong and how to fix
- Prevent navigation until resolved

**System errors**:
- Toast notifications or alert banners
- Clear error messages (avoid technical jargon)
- Provide retry options or next steps

## Debugging on Easy Mode

### Console Logging Strategy

Add extensive logging to all calculation functions:

```javascript
// Example: Income.calc.js
export function calculateIncome(data) {
  console.group('💰 Income Calculation')
  console.log('Input data:', data)

  const gross = data.salary + data.bonus + data.equity
  console.log('Gross income:', gross)

  const preTaxTotal = data.contribution401k + data.contributionHSA
  console.log('Pre-tax deductions:', preTaxTotal)

  const taxable = gross - preTaxTotal
  console.log('Taxable income:', taxable)

  console.groupEnd()

  return { gross, preTaxTotal, taxable }
}
```

### DevTools Inspection

**View localStorage**:
1. Open Chrome DevTools (F12)
2. Go to Application tab
3. Click Local Storage → your domain
4. See all saved data in real-time

**Inspect data anytime**:
```javascript
// In browser console:
JSON.parse(localStorage.getItem('income'))
JSON.parse(localStorage.getItem('profile'))
```

### Export Debug Data

Add a debug button to export all data:

```javascript
// In App.jsx or Navigation
function handleDebugExport() {
  const allData = {
    profile: storage.load('profile'),
    income: storage.load('income'),
    expenses: storage.load('expenses'),
    investmentsDebt: storage.load('investments-debt'),
    scenarios: storage.load('scenarios')
  }

  console.log('📊 All App Data:', allData)

  // Download as JSON
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `finance-debug-${Date.now()}.json`
  a.click()
}
```

### AI-Friendly Error Messages

Write errors that tell you exactly what to check:

```javascript
function calculateTaxes(taxableIncome, state, filingStatus) {
  if (!taxableIncome || taxableIncome <= 0) {
    throw new Error(`
      ❌ Tax Calculation Error: Invalid income
      - taxableIncome: ${taxableIncome}
      - Check that Income feature saved data correctly
      - Run: JSON.parse(localStorage.getItem('income'))
    `)
  }

  if (!TAX_DATA[state]) {
    throw new Error(`
      ❌ Tax Calculation Error: Unknown state
      - Received: "${state}"
      - Available: ${Object.keys(TAX_DATA).join(', ')}
      - Check profile.state value
      - Run: JSON.parse(localStorage.getItem('profile'))
    `)
  }

  // ... rest of calculation
}
```

### Debugging Checklist

When something isn't working:

1. **Check console logs** - Look for calculation groups
2. **Inspect localStorage** - Verify data was saved
3. **Check component state** - Add `console.log(data)` in component
4. **Verify calculation function** - Copy input data, test function in console
5. **Export debug data** - Download JSON to share with AI or review
6. **Check navigation flow** - Ensure save happens before navigation

### Testing Calculations

Test any calculation function directly in console:

```javascript
// Import the function (in browser console, if module is loaded)
// Or copy the function and test directly

const testData = {
  salary: 150000,
  bonus: 15000,
  contribution401k: 22500,
  contributionHSA: 3850
}

// Copy/paste calculateIncome function
// Then run:
calculateIncome(testData)
// See output with all console.logs
```

### Common Issues & Solutions

**Issue**: Data not saving
- **Check**: Is storage.save() being called?
- **Debug**: Add `console.log('Saving:', data)` before storage.save()
- **Verify**: Check localStorage in DevTools

**Issue**: Calculations return NaN
- **Check**: Are all input values numbers?
- **Debug**: Log each value before calculation
- **Fix**: Use `Number(value)` or `parseInt(value, 10)`

**Issue**: Component not updating
- **Check**: Is state being set correctly?
- **Debug**: Add `console.log('State updated:', newState)` after setState
- **Verify**: Check React DevTools

**Issue**: Wrong data in calculations
- **Check**: Is the right data being loaded from localStorage?
- **Debug**: Log data immediately after loading
- **Verify**: Check localStorage has correct data

---
*Created: 2025-11-09*
*Updated: 2025-11-09 - Simplified architecture (Vite + React + localStorage)*
