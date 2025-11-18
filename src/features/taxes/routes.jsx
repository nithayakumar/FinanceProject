import Taxes from './Taxes'
import TaxBracketManager from './TaxBracketManager'

export const taxesRoutes = [
  { path: '/taxes', element: <Taxes /> },
  { path: '/tax-brackets', element: <TaxBracketManager /> }
]
