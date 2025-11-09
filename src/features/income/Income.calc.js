/**
 * Income Validation and Projection Calculations
 */

/**
 * Validate income input data
 */
export function validateIncome(data, yearsToRetirement) {
  console.group('✅ Validating Income')
  console.log('Input:', data)

  const errors = {}

  // Validate each income stream
  data.incomeStreams.forEach((stream) => {
    // Annual Income
    if (stream.annualIncome === '' || stream.annualIncome < 0) {
      errors[`${stream.id}-annualIncome`] = 'Annual income must be a positive number'
    }

    // Company 401k
    if (stream.company401k === '' || stream.company401k < 0) {
      errors[`${stream.id}-company401k`] = 'Company 401k must be a positive number or 0'
    }

    // Equity
    if (stream.equity === '' || stream.equity < 0) {
      errors[`${stream.id}-equity`] = 'Equity must be a positive number or 0'
    }

    // Growth Rate
    if (stream.growthRate === '' || stream.growthRate < 0) {
      errors[`${stream.id}-growthRate`] = 'Growth rate must be a positive number'
    } else if (stream.growthRate > 50) {
      errors[`${stream.id}-growthRate`] = 'Growth rate seems unrealistic (> 50%)'
    }

    // End Work Year
    if (stream.endWorkYear === '' || stream.endWorkYear <= 0) {
      errors[`${stream.id}-endWorkYear`] = 'End work year must be greater than 0'
    } else if (stream.endWorkYear > yearsToRetirement) {
      errors[`${stream.id}-endWorkYear`] = `Cannot exceed retirement year (${yearsToRetirement})`
    }
  })

  console.log('Errors found:', Object.keys(errors).length)
  if (Object.keys(errors).length > 0) {
    console.log('Validation errors:', errors)
  }
  console.groupEnd()

  return errors
}

/**
 * Calculate comprehensive income projections for 100 years (1,200 months)
 * Returns one unified table with nominal and present value columns
 */
export function calculateIncomeProjections(data, profile) {
  console.group('📊 Calculating Income Projections')

  const inflationRate = profile.inflationRate || 2.7
  const yearsToRetirement = profile.retirementAge && profile.age
    ? profile.retirementAge - profile.age
    : 30
  const currentYear = new Date().getFullYear()

  console.log('Inflation Rate:', inflationRate + '%')
  console.log('Years to Retirement:', yearsToRetirement)

  // Generate monthly projections (1,200 months = 100 years)
  const projections = []

  // Sort jumps by year for efficient processing
  const sortedJumps = [...data.incomeJumps].sort((a, b) => a.year - b.year)

  // Track cumulative jump multipliers for each stream
  const streamMultipliers = {}
  data.incomeStreams.forEach(stream => {
    streamMultipliers[stream.id] = 1.0
  })

  // Generate 1,200 monthly rows
  for (let monthIndex = 0; monthIndex < 1200; monthIndex++) {
    const year = Math.floor(monthIndex / 12) + 1
    const month = (monthIndex % 12) + 1
    const absoluteYear = currentYear + year - 1

    // Check if any jumps occur this year
    let hasJump = false
    let jumpPercent = 0

    const jumpThisYear = sortedJumps.find(j => j.year === year)
    if (jumpThisYear && month === 1) {  // Apply jump in January
      hasJump = true
      jumpPercent = jumpThisYear.jumpPercent
      // Update all active stream multipliers
      const jumpMultiplier = 1 + (jumpPercent / 100)
      Object.keys(streamMultipliers).forEach(streamId => {
        streamMultipliers[streamId] *= jumpMultiplier
      })
    }

    // Calculate values for each active stream
    let salaryNominal = 0
    let equityNominal = 0
    let company401kNominal = 0
    const activeStreams = []

    data.incomeStreams.forEach(stream => {
      // Check if stream is still active
      if (year <= stream.endWorkYear) {
        activeStreams.push(stream.id)

        // Calculate annual values with growth and jumps
        // Growth is applied at the start of each year (month 1)
        const yearsOfGrowth = year - 1  // Year 1 has 0 years of growth
        const growthMultiplier = Math.pow(1 + stream.growthRate / 100, yearsOfGrowth)
        const jumpMultiplier = streamMultipliers[stream.id]

        const annualSalary = stream.annualIncome * growthMultiplier * jumpMultiplier
        const annualEquity = stream.equity * growthMultiplier * jumpMultiplier
        const annual401k = stream.company401k * growthMultiplier * jumpMultiplier

        // Convert to monthly
        salaryNominal += annualSalary / 12
        equityNominal += annualEquity / 12
        company401kNominal += annual401k / 12
      }
    })

    // Calculate total comp
    const totalCompNominal = salaryNominal + equityNominal + company401kNominal

    // Calculate present values (discounted by inflation)
    const yearsFromNow = (monthIndex / 12)
    const discountFactor = Math.pow(1 + inflationRate / 100, yearsFromNow)

    const salaryPV = salaryNominal / discountFactor
    const equityPV = equityNominal / discountFactor
    const company401kPV = company401kNominal / discountFactor
    const totalCompPV = totalCompNominal / discountFactor

    // Determine applied growth rate (weighted average of active streams)
    let appliedGrowthRate = 0
    if (activeStreams.length > 0) {
      const totalSalary = data.incomeStreams
        .filter(s => activeStreams.includes(s.id))
        .reduce((sum, s) => sum + s.annualIncome, 0)

      appliedGrowthRate = data.incomeStreams
        .filter(s => activeStreams.includes(s.id))
        .reduce((sum, s) => sum + (s.growthRate * s.annualIncome), 0) / totalSalary
    }

    // Store monthly projection
    projections.push({
      year,
      month,
      absoluteYear,
      monthIndex,

      // Nominal values
      salaryNominal: Math.round(salaryNominal),
      equityNominal: Math.round(equityNominal),
      company401kNominal: Math.round(company401kNominal),
      totalCompNominal: Math.round(totalCompNominal),

      // Present values
      salaryPV: Math.round(salaryPV),
      equityPV: Math.round(equityPV),
      company401kPV: Math.round(company401kPV),
      totalCompPV: Math.round(totalCompPV),

      // Metadata
      appliedGrowthRate,
      hasJump: hasJump && month === 1,
      jumpPercent: hasJump && month === 1 ? jumpPercent : 0,
      activeStreams: [...activeStreams]
    })
  }

  console.log(`Generated ${projections.length} monthly projections`)

  // Calculate summary statistics
  const summary = calculateSummary(projections, yearsToRetirement, data.incomeJumps)

  console.log('Summary calculated:', summary)
  console.groupEnd()

  return {
    projections,
    summary
  }
}

/**
 * Calculate summary statistics from projections
 */
function calculateSummary(projections, yearsToRetirement, incomeJumps) {
  // Current year (Year 1)
  const year1Months = projections.filter(p => p.year === 1)
  const currentYearCompNominal = year1Months.reduce((sum, p) => sum + p.totalCompNominal, 0)
  const currentYearCompPV = year1Months.reduce((sum, p) => sum + p.totalCompPV, 0)

  // Year 10 (if exists)
  const year10Months = projections.filter(p => p.year === 10)
  const year10CompNominal = year10Months.length > 0
    ? year10Months.reduce((sum, p) => sum + p.totalCompNominal, 0)
    : 0
  const year10CompPV = year10Months.length > 0
    ? year10Months.reduce((sum, p) => sum + p.totalCompPV, 0)
    : 0

  // Lifetime earnings (current year to retirement)
  const retirementMonthIndex = yearsToRetirement * 12 - 1
  const lifetimeMonths = projections.filter(p => p.monthIndex <= retirementMonthIndex)

  const lifetimeEarningsNominal = lifetimeMonths.reduce((sum, p) => sum + p.totalCompNominal, 0)
  const lifetimeEarningsPV = lifetimeMonths.reduce((sum, p) => sum + p.totalCompPV, 0)

  // Component breakdowns (lifetime)
  const totalSalaryNominal = lifetimeMonths.reduce((sum, p) => sum + p.salaryNominal, 0)
  const totalSalaryPV = lifetimeMonths.reduce((sum, p) => sum + p.salaryPV, 0)

  const totalEquityNominal = lifetimeMonths.reduce((sum, p) => sum + p.equityNominal, 0)
  const totalEquityPV = lifetimeMonths.reduce((sum, p) => sum + p.equityPV, 0)

  const total401kNominal = lifetimeMonths.reduce((sum, p) => sum + p.company401kNominal, 0)
  const total401kPV = lifetimeMonths.reduce((sum, p) => sum + p.company401kPV, 0)

  // Average annual growth
  const growthRates = projections
    .filter(p => p.year <= yearsToRetirement && p.appliedGrowthRate > 0)
    .map(p => p.appliedGrowthRate)
  const averageAnnualGrowth = growthRates.length > 0
    ? growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length
    : 0

  // Key milestones (where jumps occur)
  const milestones = incomeJumps
    .filter(jump => jump.year && jump.jumpPercent)
    .map(jump => {
      const jumpYearFirstMonth = projections.find(p => p.year === jump.year && p.month === 1)
      if (!jumpYearFirstMonth) return null

      const jumpYearMonths = projections.filter(p => p.year === jump.year)
      const compNominal = jumpYearMonths.reduce((sum, p) => sum + p.totalCompNominal, 0)
      const compPV = jumpYearMonths.reduce((sum, p) => sum + p.totalCompPV, 0)

      return {
        label: `Year ${jump.year}: ${jump.description || 'Income Jump'} (+${jump.jumpPercent}%)`,
        compNominal: Math.round(compNominal),
        compPV: Math.round(compPV)
      }
    })
    .filter(m => m !== null)

  return {
    currentYearCompNominal: Math.round(currentYearCompNominal),
    currentYearCompPV: Math.round(currentYearCompPV),

    year10CompNominal: Math.round(year10CompNominal),
    year10CompPV: Math.round(year10CompPV),

    lifetimeEarningsNominal: Math.round(lifetimeEarningsNominal),
    lifetimeEarningsPV: Math.round(lifetimeEarningsPV),

    totalSalaryNominal: Math.round(totalSalaryNominal),
    totalSalaryPV: Math.round(totalSalaryPV),

    totalEquityNominal: Math.round(totalEquityNominal),
    totalEquityPV: Math.round(totalEquityPV),

    total401kNominal: Math.round(total401kNominal),
    total401kPV: Math.round(total401kPV),

    averageAnnualGrowth,

    milestones
  }
}
