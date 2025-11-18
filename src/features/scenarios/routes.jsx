import Scenarios from './Scenarios'
import ScenarioEditor from './ScenarioEditor'
import ScenarioCompare from './ScenarioCompare'

export const scenariosRoutes = [
  { path: '/scenarios', element: <Scenarios /> },
  { path: '/scenarios/:id/edit', element: <ScenarioEditor /> },
  { path: '/scenarios/compare', element: <ScenarioCompare /> }
]
