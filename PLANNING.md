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
- **Small, flexible modules**: Maintainable folders/files
- **Frontend/Backend separation**: Clear API boundaries
- **Iterative development**: Each feature should be independently demoable

### Recommended Stack

#### Frontend
- React or Next.js (for easy component management)
- Tailwind CSS (rapid styling)
- Chart library (Chart.js or Recharts for visualizations)
- Form management (React Hook Form)

#### Backend
- Node.js + Express (or Next.js API routes)
- RESTful API design
- Feature-based route organization

#### Database
- SQLite or PostgreSQL (start simple, can scale)
- Prisma ORM (type-safe, easy migrations)

#### State Management
- React Context or Zustand (lightweight)

### Project Structure

```
FinanceProject/
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── personal-details/
│   │   │   │   ├── PersonalDetailsInput.jsx
│   │   │   │   ├── PersonalDetailsOutput.jsx
│   │   │   │   ├── components/
│   │   │   │   └── utils/
│   │   │   ├── income/
│   │   │   │   ├── IncomeInput.jsx
│   │   │   │   ├── IncomeOutput.jsx
│   │   │   │   ├── components/
│   │   │   │   └── calculations.js
│   │   │   ├── expenses/
│   │   │   │   ├── ExpensesInput.jsx
│   │   │   │   ├── ExpensesOutput.jsx
│   │   │   │   └── components/
│   │   │   ├── taxes/
│   │   │   │   ├── TaxesOutput.jsx
│   │   │   │   └── components/
│   │   │   ├── investments-debt/
│   │   │   │   ├── InvestmentsDebtInput.jsx
│   │   │   │   ├── InvestmentsDebtOutput.jsx
│   │   │   │   └── components/
│   │   │   ├── gap-calculations/
│   │   │   │   ├── GapCalculationsOutput.jsx
│   │   │   │   └── components/
│   │   │   ├── scenarios/
│   │   │   │   ├── ScenarioManagement.jsx
│   │   │   │   ├── ScenarioComparison.jsx
│   │   │   │   └── components/
│   │   │   └── life-milestones/
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   ├── utils/
│   │   │   └── api/
│   │   ├── App.jsx
│   │   └── index.jsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── personal-details/
│   │   │   │   ├── routes.js
│   │   │   │   ├── service.js
│   │   │   │   └── model.js
│   │   │   ├── income/
│   │   │   │   ├── routes.js
│   │   │   │   ├── service.js
│   │   │   │   ├── calculations.js
│   │   │   │   └── model.js
│   │   │   ├── expenses/
│   │   │   ├── taxes/
│   │   │   │   ├── calculations.js
│   │   │   │   ├── taxBrackets.js
│   │   │   │   └── service.js
│   │   │   ├── investments-debt/
│   │   │   ├── gap-calculations/
│   │   │   ├── scenarios/
│   │   │   └── life-milestones/
│   │   ├── shared/
│   │   │   ├── db/
│   │   │   │   ├── schema.prisma
│   │   │   │   └── client.js
│   │   │   └── utils/
│   │   └── server.js
│   └── package.json
├── PLANNING.md
└── README.md
```

## Data Architecture

### Core Concepts

The data model must support three critical requirements:
1. **Iterative Calculations**: Dependencies between financial components (pre-tax → taxable income → taxes → post-tax)
2. **Dynamic Scenarios**: Multiple variations for comparison (State A vs State B, Job 1 vs Job 2)
3. **Life Milestones**: Temporal events that modify finances over time (child birth, sabbatical)

### Data Model Structure

```
UserProfile (Base/Baseline)
├── PersonalDetails
├── BaseScenario (the "current state" or "baseline")
│   ├── Income
│   ├── Expenses
│   ├── Taxes
│   ├── Investments & Debt
│   └── CalculatedResults (derived from above)
└── LifeMilestones[] (timeline events)

Scenario (Variations for comparison)
├── scenarioId
├── name (e.g., "California Tech Job", "Texas Remote Job")
├── baseProfileId (reference)
├── overrides (fields that differ from base)
│   ├── Income
│   ├── Expenses
│   ├── Taxes
│   └── Investments & Debt
├── lifeMilestoneOverrides[] (scenario-specific events)
└── CalculatedResults (derived)
```

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

### Database Schema Considerations

**Tables/Collections**:
1. `user_profile` - Personal details, base financial info
2. `scenarios` - Scenario instances with overrides
3. `life_milestones` - Timeline events
4. `scenario_milestones` - Links milestones to scenarios
5. `calculated_results` - Cached calculation outputs (optional, for performance)

**Key Relationships**:
- One profile can have many scenarios
- One scenario can have many life milestones
- Calculations are derived, not stored (except for caching)

## Implementation Phases (Feature-Based)

### Phase 0: Setup & Foundation
- [x] Create repository
- [x] Define project requirements and data architecture
- [ ] Choose and document final tech stack
- [ ] Set up frontend project
- [ ] Set up backend project
- [ ] Create database schema
- [ ] Build basic UI shell with navigation

**Demo Goal**: Empty application with navigation ready

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
- [ ] Design personal details input page UI
- [ ] Design personal details output page UI (summary view)
- [ ] Create personal details data model
- [ ] Build API endpoints (POST /profile, GET /profile, PUT /profile)
- [ ] Implement form validation
- [ ] Store in database
- [ ] Implement navigation with auto-save

**Demo Goal**: User can enter personal details on input page, navigate to output page (auto-saves), and see summary

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
- [ ] Design income input form with multiple sources
- [ ] Create income data model (support multiple income types)
- [ ] Build income calculation service
- [ ] Create API endpoints (POST /income/input, GET /income/output, POST /income/calculate)
- [ ] Build income input page UI
- [ ] Build income output page UI with calculations
- [ ] Visualize income breakdown (gross → taxable)

**Demo Goal**: User can input various income sources, navigate to output page, and see how pre-tax contributions affect taxable income

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
- [ ] Design expense input page with categories
- [ ] Design expense output page with visualizations
- [ ] Create expense data model
- [ ] Build expense calculation service
- [ ] Create API endpoints (POST /expenses/input, GET /expenses/output)
- [ ] Implement expense summary visualization
- [ ] Add budget vs actual tracking (optional)

**Demo Goal**: User can input all expenses on input page, navigate to output page, and see monthly/annual breakdown by category

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
- [ ] Research and document tax calculation rules (2025 tax brackets)
- [ ] Create tax calculation engine (federal)
- [ ] Add state tax calculations (start with CA, TX, NY, WA, FL)
- [ ] Build FICA calculator
- [ ] Create tax summary API endpoint (GET /taxes/output)
- [ ] Build tax output page UI
- [ ] Visualize tax breakdown (pie chart, waterfall chart)
- [ ] Show effective vs marginal tax rate
- [ ] Handle standard vs itemized deductions

**Demo Goal**: User navigates to Taxes page and sees complete tax breakdown calculated from their income, location, and filing status

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
- [ ] Design investment & debt input page
- [ ] Design investment & debt output page
- [ ] Create data models for accounts and debts
- [ ] Build net worth calculation service
- [ ] Build debt payoff calculator
- [ ] Create investment projection calculator (simple)
- [ ] Build API endpoints (POST /investments-debt/input, GET /investments-debt/output)
- [ ] Visualize net worth over time
- [ ] Show debt payoff timeline

**Demo Goal**: User can input all accounts/debts on input page, navigate to output page, and see net worth and debt payoff timeline

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
- [ ] Build gap calculation service (integrates all previous features)
- [ ] Create comprehensive financial summary
- [ ] Create API endpoint (GET /gap-calculations/output)
- [ ] Build gap calculations output page (dashboard)
- [ ] Build cash flow visualization (income vs expenses waterfall)
- [ ] Show savings rate and trajectory
- [ ] Create financial health dashboard
- [ ] Add month-by-month projection (12 months)

**Demo Goal**: User navigates to Gap Calculations page and sees complete financial picture - where money comes from, where it goes, and how much is saved

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
- [ ] Design scenario management page (list + create/edit)
- [ ] Design scenario comparison page
- [ ] Implement scenario data model with overrides
- [ ] Build scenario calculation engine (reuses all previous calculators)
- [ ] Create scenario APIs (POST /scenarios, GET /scenarios, PUT /scenarios/:id, GET /scenarios/compare)
- [ ] Build comparison view UI (side-by-side table or cards)
- [ ] Highlight key differences (color coding)
- [ ] Add "winner" recommendation logic (optional)
- [ ] Allow saving multiple scenarios

**Demo Goal**: User can create 2+ scenarios (e.g., CA vs TX), navigate to comparison page, and see side-by-side financial breakdown highlighting differences

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
- **Feature-based structure**: Better scalability and maintainability
- **Frontend/Backend separation**: Allows independent development and potential future mobile app

### Data Strategy
- Start with single-user local data
- Design schema to support multi-user in future
- Keep financial calculations in backend for consistency

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

---
*Created: 2025-11-09*
