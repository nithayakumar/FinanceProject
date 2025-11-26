import { Routes, Route } from 'react-router-dom'
import Navigation from './shared/components/Navigation'
import ShareLinkLoader from './shared/components/ShareLinkLoader'
import Home from './features/Home'

// Import feature routes
import { dashboardRoutes } from './features/dashboard'
import { personalDetailsRoutes } from './features/personal-details'
import { incomeRoutes } from './features/income'
import { expensesRoutes } from './features/expenses'
import { taxesRoutes } from './features/taxes'
import { investmentsDebtRoutes } from './features/investments-debt'
import { gapRoutes } from './features/gap'
// DISABLED: Scenarios feature
// import { scenariosRoutes } from './features/scenarios'

// Combine all feature routes
const featureRoutes = [
  ...dashboardRoutes,
  ...personalDetailsRoutes,
  ...incomeRoutes,
  ...expensesRoutes,
  ...taxesRoutes,
  ...investmentsDebtRoutes,
  ...gapRoutes,
  // DISABLED: Scenarios feature
  // ...scenariosRoutes
]

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <ShareLinkLoader />
      <main className="container mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          {featureRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </main>
    </div>
  )
}

export default App
