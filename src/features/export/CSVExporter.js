/**
 * CSV Export Orchestrator
 * Coordinates all transformers and generates final CSV export
 */

import Papa from 'papaparse'
import { transformIncomeData } from './transformers/IncomeTransformer'
import { transformExpensesData } from './transformers/ExpensesTransformer'
import { transformTaxesData } from './transformers/TaxesTransformer'
import { transformInvestmentsData } from './transformers/InvestmentsTransformer'
import { transformNetWorthData } from './transformers/NetWorthTransformer'

/**
 * Generate complete CSV export from all modules
 * @param {Object} appData - All application data
 * @returns {string} - CSV string ready for download
 */
export function generateCSVExport(appData) {
  console.group('📊 CSV Export Generation')

  const {
    incomeData,
    expensesData,
    incomeProjections,
    expenseProjections,
    gapProjections,
    investmentsData,
    profile
  } = appData

  // Validate required data
  if (!incomeData || !expensesData || !gapProjections || !investmentsData || !profile) {
    console.error('Missing required data for export:', {
      hasIncome: !!incomeData,
      hasExpenses: !!expensesData,
      hasGap: !!gapProjections,
      hasInvestments: !!investmentsData,
      hasProfile: !!profile
    })
    throw new Error('Missing required data for export. Please ensure all modules are filled out.')
  }

  // Merge raw data with projections (like Dashboard does for Gap calculations)
  const incomeWithProjections = {
    ...incomeData,
    projections: incomeProjections.projections
  }

  const expensesWithProjections = {
    ...expensesData,
    projections: expenseProjections.projections
  }

  // Extract parameters
  const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7
  const yearsToRetirement = profile.yearsToRetirement || 30

  console.log('Export Parameters:', {
    inflationRate: `${inflationRate}%`,
    yearsToRetirement,
    incomeStreams: incomeWithProjections.incomeStreams?.length || 0,
    incomeProjections: incomeWithProjections.projections?.length || 0,
    expenseCategories: expensesWithProjections.expenseCategories?.length || 0,
    expenseProjections: expensesWithProjections.projections?.length || 0,
    investments: investmentsData.investments?.length || 0
  })

  const startTime = performance.now()

  // Transform each module
  try {
    const incomeRows = transformIncomeData(incomeWithProjections, yearsToRetirement, inflationRate)
    const expensesRows = transformExpensesData(expensesWithProjections, yearsToRetirement, inflationRate)
    const taxesRows = transformTaxesData(gapProjections, inflationRate, profile)
    const investmentsRows = transformInvestmentsData(gapProjections, investmentsData, inflationRate, incomeWithProjections)
    const netWorthRows = transformNetWorthData(gapProjections, inflationRate)

    console.log('Row Counts:', {
      Income: incomeRows.length,
      Expenses: expensesRows.length,
      Taxes: taxesRows.length,
      Investments: investmentsRows.length,
      NetWorth: netWorthRows.length,
      Total: incomeRows.length + expensesRows.length + taxesRows.length + investmentsRows.length + netWorthRows.length
    })

    // Combine all rows
    const allRows = [
      ...incomeRows,
      ...expensesRows,
      ...taxesRows,
      ...investmentsRows,
      ...netWorthRows
    ]

    // Sort by Year, Month, Module for better organization
    allRows.sort((a, b) => {
      if (a.Year !== b.Year) return a.Year - b.Year
      if (a.Month !== b.Month) return a.Month - b.Month
      return a.Module.localeCompare(b.Module)
    })

    // Generate CSV using PapaParse
    const csv = Papa.unparse(allRows, {
      quotes: true,
      header: true,
      skipEmptyLines: false
    })

    const endTime = performance.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log(`✅ CSV generation completed in ${duration}s`)
    console.log(`Total rows: ${allRows.length}`)
    console.log(`CSV size: ${(csv.length / 1024).toFixed(2)} KB`)
    console.groupEnd()

    return csv
  } catch (error) {
    console.error('Error during CSV generation:', error)
    console.groupEnd()
    throw error
  }
}

/**
 * Download CSV file to user's computer
 * @param {string} csv - CSV content
 * @param {string} filename - Desired filename
 */
export function downloadCSV(csv, filename) {
  console.log(`📥 Downloading CSV as: ${filename}`)

  try {
    // Create blob
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })

    // Create download link
    const link = document.createElement('a')

    if (link.download !== undefined) {
      // Feature detection for download attribute
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100)

      console.log('✅ Download initiated successfully')
    } else {
      // Fallback for browsers without download attribute support
      console.warn('Download attribute not supported, using fallback')
      window.open(URL.createObjectURL(blob))
    }
  } catch (error) {
    console.error('Error during download:', error)
    throw new Error('Failed to download CSV file')
  }
}

/**
 * Generate filename for export
 * @param {Object} profile - User profile data
 * @returns {string} - Formatted filename
 */
export function generateFilename(profile) {
  const currentYear = new Date().getFullYear()
  const endYear = currentYear + (profile.yearsToRetirement || 30)
  const today = new Date().toISOString().split('T')[0]

  return `Financial_Projections_${currentYear}_to_${endYear}_${today}.csv`
}
