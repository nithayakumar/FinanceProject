/**
 * Taxes Feature Module
 */

export { default as Taxes } from './Taxes'
export { calculateTaxes, federalBrackets2025, californiaBrackets2025, STATE_TAX_BRACKETS } from './Taxes.calc'
export { default as TaxBracketManager } from './TaxBracketManager'
export { taxesRoutes } from './routes'
