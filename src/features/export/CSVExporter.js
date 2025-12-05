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

/**
 * Export Net Worth Breakdown Table to CSV (Detailed View)
 * @param {Object} gapProjections - Gap projections data
 * @param {Object} investmentsData - Investment data for getting investment names
 * @param {Object} profile - User profile
 * @param {boolean} isPV - Whether to use present value or nominal
 */
export function exportNetWorthTable(gapProjections, investmentsData, profile, isPV = true) {
  console.log('📊 Exporting Detailed Net Worth Table...')

  const projections = gapProjections.projections || []
  if (projections.length === 0) {
    throw new Error('No projection data available to export')
  }

  const valueMode = isPV ? 'PV' : 'Nominal'
  const today = new Date().toISOString().split('T')[0]
  const filename = `Net_Worth_Breakdown_Detailed_${valueMode}_${today}.csv`

  // Get investment names
  const investmentNames = investmentsData?.investments?.map((inv, index) => `Investment ${index + 1}`) || []

  // Get income stream names from first projection
  const incomeStreamNames = projections[0]?.incomeByStream?.map(s => s.name).filter(Boolean) || []

  // Get expense category names from first projection
  const expenseCategoryNames = projections[0]?.expensesByCategory?.map(c => c.category).filter(Boolean) || []

  // Build transposed table (metrics as rows, years as columns)
  const rows = []

  // Header row
  const headers = ['Metric', ...projections.map(p => `Year ${p.year}`)]
  rows.push(headers)

  // Helper function to add a section header
  const addSectionHeader = (title) => {
    rows.push([title, ...projections.map(() => '')])
  }

  // Helper function to add a data row
  const addDataRow = (label, getValue) => {
    const values = projections.map((p, idx) => getValue(p, idx))
    rows.push([label, ...values])
  }

  // STARTING BALANCES
  addSectionHeader('STARTING BALANCES')

  // Calculate cash begin for each year
  addDataRow('Cash Begin', (p, idx) => {
    if (idx === 0) return isPV ? p.cashPV : p.cash
    const prevP = projections[idx - 1]
    return isPV ? prevP.cashPV : prevP.cash
  })

  // Investment begins
  investmentNames.forEach((name, invIndex) => {
    addDataRow(`${name} Begin`, (p, idx) => {
      const inv = p.investments?.[invIndex]
      if (!inv) return 0
      if (idx === 0) {
        // Year 1: beginning = ending - allocation - growth
        const marketValue = isPV ? inv.marketValuePV : inv.marketValue
        const allocation = isPV ? inv.allocationPV : inv.allocation
        const growth = isPV ? inv.growthPV : inv.growth
        return marketValue - allocation - growth
      }
      // Other years: beginning = previous year's ending
      const prevInv = projections[idx - 1].investments?.[invIndex]
      return prevInv ? (isPV ? prevInv.marketValuePV : prevInv.marketValue) : 0
    })
  })

  addDataRow('401k Begin', (p, idx) => {
    if (idx === 0) {
      // Year 1: beginning = ending - individual - company - growth
      const ending = isPV ? p.retirement401kValuePV : p.retirement401kValue
      const individual = isPV ? p.totalIndividual401kPV : p.totalIndividual401k
      const company = isPV ? p.annualCompany401kPV : p.annualCompany401k
      // Calculate 401k growth
      const prevValue = idx === 0 ? ending - individual - company : 0
      const growthRate = investmentsData?.retirement401k?.growthRate || 0
      const growth = prevValue * (growthRate / 100)
      return ending - individual - company - growth
    }
    const prevP = projections[idx - 1]
    return isPV ? prevP.retirement401kValuePV : prevP.retirement401kValue
  })

  addDataRow('Net Worth Begin', (p, idx) => {
    if (idx === 0) {
      // Calculate from components
      let cashBegin = isPV ? p.cashPV : p.cash
      let invBegin = 0
      investmentNames.forEach((name, invIndex) => {
        const inv = p.investments?.[invIndex]
        if (inv) {
          const marketValue = isPV ? inv.marketValuePV : inv.marketValue
          const allocation = isPV ? inv.allocationPV : inv.allocation
          const growth = isPV ? inv.growthPV : inv.growth
          invBegin += marketValue - allocation - growth
        }
      })
      const ending401k = isPV ? p.retirement401kValuePV : p.retirement401kValue
      const individual = isPV ? p.totalIndividual401kPV : p.totalIndividual401k
      const company = isPV ? p.annualCompany401kPV : p.annualCompany401k
      const prevValue = ending401k - individual - company
      const growthRate = investmentsData?.retirement401k?.growthRate || 0
      const growth = prevValue * (growthRate / 100)
      const ret401kBegin = ending401k - individual - company - growth

      return cashBegin + invBegin + ret401kBegin
    }
    const prevP = projections[idx - 1]
    return isPV ? prevP.netWorthPV : prevP.netWorth
  })

  // INCOME
  addSectionHeader('INCOME')

  incomeStreamNames.forEach(streamName => {
    addDataRow(streamName, p => {
      const stream = p.incomeByStream?.find(s => s.name === streamName)
      return stream ? (isPV ? stream.totalPV : stream.total) : 0
    })
  })

  addDataRow('Total Gross Income', p => isPV ? p.grossIncomePV : p.grossIncome)

  // PRE-TAX SAVINGS
  addSectionHeader('PRE-TAX SAVINGS')
  addDataRow('Individual 401k', p => isPV ? p.totalIndividual401kPV : p.totalIndividual401k)
  addDataRow('Taxable Income', p => isPV ? p.taxableIncomePV : p.taxableIncome)

  // TAXES
  addSectionHeader('TAXES')
  addDataRow('Federal Tax', p => isPV ? p.taxBreakdownPV.federal : p.taxBreakdown.federal)
  addDataRow('State Tax', p => isPV ? p.taxBreakdownPV.state : p.taxBreakdown.state)
  addDataRow('FICA', p => {
    const taxes = isPV ? p.taxBreakdownPV : p.taxBreakdown
    return (taxes.socialSecurity || 0) + (taxes.medicare || 0)
  })
  addDataRow('Total Taxes', p => isPV ? p.annualTaxesPV : p.annualTaxes)
  addDataRow('After-Tax Income', p => isPV ? p.afterTaxIncomePV : p.afterTaxIncome)

  // EXPENSES
  addSectionHeader('EXPENSES')

  expenseCategoryNames.forEach(catName => {
    addDataRow(catName, p => {
      const cat = p.expensesByCategory?.find(c => c.category === catName)
      return cat ? (isPV ? cat.amountPV : cat.amount) : 0
    })
  })

  addDataRow('Total Expenses', p => isPV ? p.annualExpensesPV : p.annualExpenses)

  // CASH FLOW
  addSectionHeader('CASH FLOW')
  addDataRow('Gap (Savings)', p => isPV ? p.gapPV : p.gap)
  addDataRow('Savings Rate %', p => {
    const income = isPV ? p.grossIncomePV : p.grossIncome
    const gap = isPV ? p.gapPV : p.gap
    return income > 0 ? ((gap / income) * 100).toFixed(2) : 0
  })

  // ALLOCATIONS
  addSectionHeader('ALLOCATIONS')
  addDataRow('To Cash', p => isPV ? p.cashContributionPV : p.cashContribution)

  investmentNames.forEach((name, invIndex) => {
    addDataRow(`To ${name}`, p => {
      const inv = p.investments?.[invIndex]
      return inv ? (isPV ? inv.allocationPV : inv.allocation) : 0
    })
  })

  addDataRow('To 401k (Individual + Company)', p => {
    const individual = isPV ? p.totalIndividual401kPV : p.totalIndividual401k
    const company = isPV ? p.annualCompany401kPV : p.annualCompany401k
    return individual + company
  })

  // INVESTMENT GROWTH
  addSectionHeader('INVESTMENT GROWTH')

  investmentNames.forEach((name, invIndex) => {
    addDataRow(`${name} Growth`, p => {
      const inv = p.investments?.[invIndex]
      return inv ? (isPV ? inv.growthPV : inv.growth) : 0
    })
  })

  addDataRow('401k Growth', (p, idx) => {
    if (idx === 0) {
      const ending = isPV ? p.retirement401kValuePV : p.retirement401kValue
      const individual = isPV ? p.totalIndividual401kPV : p.totalIndividual401k
      const company = isPV ? p.annualCompany401kPV : p.annualCompany401k
      const prevValue = ending - individual - company
      const growthRate = investmentsData?.retirement401k?.growthRate || 0
      return prevValue * (growthRate / 100)
    }
    const prevP = projections[idx - 1]
    const ending = isPV ? p.retirement401kValuePV : p.retirement401kValue
    const individual = isPV ? p.totalIndividual401kPV : p.totalIndividual401k
    const company = isPV ? p.annualCompany401kPV : p.annualCompany401k
    const beginning = isPV ? prevP.retirement401kValuePV : prevP.retirement401kValue
    return ending - beginning - individual - company
  })

  addDataRow('Total Growth', (p, idx) => {
    let totalGrowth = 0

    // Investment growth
    investmentNames.forEach((name, invIndex) => {
      const inv = p.investments?.[invIndex]
      if (inv) {
        totalGrowth += isPV ? inv.growthPV : inv.growth
      }
    })

    // 401k growth
    if (idx === 0) {
      const ending = isPV ? p.retirement401kValuePV : p.retirement401kValue
      const individual = isPV ? p.totalIndividual401kPV : p.totalIndividual401k
      const company = isPV ? p.annualCompany401kPV : p.annualCompany401k
      const prevValue = ending - individual - company
      const growthRate = investmentsData?.retirement401k?.growthRate || 0
      totalGrowth += prevValue * (growthRate / 100)
    } else {
      const prevP = projections[idx - 1]
      const ending = isPV ? p.retirement401kValuePV : p.retirement401kValue
      const individual = isPV ? p.totalIndividual401kPV : p.totalIndividual401k
      const company = isPV ? p.annualCompany401kPV : p.annualCompany401k
      const beginning = isPV ? prevP.retirement401kValuePV : prevP.retirement401kValue
      totalGrowth += ending - beginning - individual - company
    }

    return totalGrowth
  })

  // ENDING BALANCES
  addSectionHeader('ENDING BALANCES')
  addDataRow('Cash End', p => isPV ? p.cashPV : p.cash)

  investmentNames.forEach((name, invIndex) => {
    addDataRow(`${name} End`, p => {
      const inv = p.investments?.[invIndex]
      return inv ? (isPV ? inv.marketValuePV : inv.marketValue) : 0
    })
  })

  addDataRow('401k End', p => isPV ? p.retirement401kValuePV : p.retirement401kValue)
  addDataRow('Net Worth End', p => isPV ? p.netWorthPV : p.netWorth)

  // Generate CSV
  const csv = Papa.unparse(rows, {
    quotes: true,
    header: false
  })

  // Download
  downloadCSV(csv, filename)

  console.log(`✅ Detailed Net Worth Table exported: ${filename}`)
}
