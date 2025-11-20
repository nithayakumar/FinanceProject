import { Routes, Route } from 'react-router-dom'
import Navigation from './shared/components/Navigation'
import Home from './features/Home'
import Dashboard from './features/dashboard/Dashboard'
import PersonalDetails from './features/personal-details/PersonalDetails'
import Income from './features/income/Income'
import Expenses from './features/expenses/Expenses'
import Taxes from './features/taxes/Taxes'
import TaxBracketManager from './features/taxes/TaxBracketManager'
import CustomLadderEditor from './features/taxes/CustomLadderEditor'
import InvestmentsDebt from './features/investments-debt/InvestmentsDebt'
import Gap from './features/gap/Gap'
import Scenarios from './features/scenarios/Scenarios'
import ScenarioEditor from './features/scenarios/ScenarioEditor'
import ScenarioCompare from './features/scenarios/ScenarioCompare'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/personal-details" element={<PersonalDetails />} />
          <Route path="/income" element={<Income />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/taxes" element={<Taxes />} />
          <Route path="/tax-brackets" element={<TaxBracketManager />} />
          <Route path="/custom-ladder" element={<CustomLadderEditor />} />
          <Route path="/investments-debt" element={<InvestmentsDebt />} />
          <Route path="/gap" element={<Gap />} />
          <Route path="/scenarios/compare" element={<ScenarioCompare />} />
          <Route path="/scenarios/:id/edit" element={<ScenarioEditor />} />
          <Route path="/scenarios" element={<Scenarios />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
