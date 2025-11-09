# Finance Project

A React application to help users make smart, data-backed financial decisions through scenario analysis and comparison tools.

## Tech Stack

- **Vite + React** - Fast development with hot module replacement
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization (ready to use)
- **localStorage** - Data persistence (no backend needed)

## Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production
```bash
npm run build
```

## Project Structure

```
src/
├── features/                  # Feature-based organization
│   ├── personal-details/     # Personal info & filing status
│   ├── income/               # Income sources & calculations
│   ├── expenses/             # Expense tracking
│   ├── taxes/                # Tax calculations
│   ├── investments-debt/     # Assets & liabilities
│   ├── gap/                  # Financial summary & savings
│   └── scenarios/            # Scenario comparison
├── shared/
│   ├── components/           # Reusable UI components
│   │   └── Navigation.jsx
│   └── storage.js            # localStorage wrapper
├── App.jsx                   # Main app with routes
└── main.jsx                  # Entry point

data/
└── scenarios/                # Portable scenario JSON files
```

## Features (Planned)

- [x] Phase 0: Setup & Foundation ✅
- [ ] Phase 1: Personal Detail Collection
- [ ] Phase 2: Income
- [ ] Phase 3: Expenses
- [ ] Phase 4: Taxes
- [ ] Phase 5: Investments & Debt
- [ ] Phase 6: Gap Calculations
- [ ] Phase 7: Scenarios
- [ ] Phase 8: Life Milestones

## Development Guidelines

### File Size Limits
- Components: 100-200 lines max (Input + Output combined)
- Calculation files: 30-100 lines (pure functions)
- Shared components: <50 lines (single purpose)

### Two-Page Pattern
Each feature follows Input → Output pattern:
1. **Input Page**: User enters data, clicks "Continue", data saves to localStorage
2. **Output Page**: Displays calculated results and visualizations

### Debugging
- Check localStorage in DevTools: Application → Local Storage
- All calculations include console.log() for easy debugging
- Export all data: Use storage.exportAll() in console

## Storage Keys

Data is stored in localStorage with these keys:
- `profile` - Personal details
- `income` - Income data
- `expenses` - Expense data
- `investments-debt` - Assets & debts
- `scenarios` - Array of scenarios

## Next Steps

See [PLANNING.md](./PLANNING.md) for detailed architecture, data models, and implementation phases.
