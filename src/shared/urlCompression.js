import { DEFAULT_EXPENSE_CATEGORIES } from '../features/expenses/config/expensesSchema'
import { getAvailableStates, getAvailableCountries } from '../features/taxes/csvTaxLadders'

// --- Dictionaries for Compression ---

// Countries: ['USA', 'Canada']
const COUNTRIES = ['USA', 'Canada']

// Filing Statuses
const FILING_STATUSES = ['Single', 'Married', 'Head of Household', 'Married Filing Separately', 'Qualifying Widow(er)']

// Expense IDs
const EXPENSE_ID_MAP = DEFAULT_EXPENSE_CATEGORIES.reduce((acc, cat, index) => {
    acc[cat.id] = index
    return acc
}, {})

const REVERSE_EXPENSE_ID_MAP = DEFAULT_EXPENSE_CATEGORIES.reduce((acc, cat, index) => {
    acc[index] = cat.id
    return acc
}, {})

// Helper to get states list (lazy loaded)
let STATES_LIST = null
const getStatesList = () => {
    if (!STATES_LIST) {
        const states = Array.from(getAvailableStates() || [])
        STATES_LIST = states.sort()
    }
    return STATES_LIST
}

// --- Helpers ---

// Map value to index in array, or return raw if not found
const toIdx = (val, list) => {
    const idx = list.indexOf(val)
    return idx === -1 ? val : idx
}

// Map index back to value
const fromIdx = (val, list) => {
    return typeof val === 'number' && list[val] !== undefined ? list[val] : val
}

// Trim trailing nulls/undefineds/defaults from array
const trimArray = (arr, defaults = []) => {
    let i = arr.length - 1
    while (i >= 0) {
        const val = arr[i]
        const defaultVal = defaults[i] !== undefined ? defaults[i] : null

        // Check if value is "empty" or matches default
        // Note: 0 is NOT empty, only null/undefined/empty string/empty array
        const isEmpty = val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)
        const isDefault = val === defaultVal

        if (isEmpty || isDefault) {
            i--
        } else {
            break
        }
    }
    return arr.slice(0, i + 1)
}

/**
 * Minify the state into an ultra-compact array structure
 */
export function minifyState(data) {
    const states = getStatesList()

    // 1. Profile
    // [loc(idx), country(idx), status(idx), age, retAge, currCash, targCash, infRate, currSav]
    const p = trimArray([
        toIdx(data.profile.location, states),
        toIdx(data.profile.country, COUNTRIES),
        toIdx(data.profile.filingStatus, FILING_STATUSES),
        data.profile.age,
        data.profile.retirementAge,
        Math.round(data.profile.currentCash || 0),
        Math.round(data.profile.targetCash || 0),
        data.profile.inflationRate,
        Math.round(data.profile.currentSavings || 0)
    ])

    // 2. Income
    // [name, val, start, end, growth, ind401k, co401k, equity, jumps[], breaks[]]
    // Defaults: growth=2.7, start=1, end=retAge-age
    const yearsToRet = (data.profile.retirementAge || 65) - (data.profile.age || 30)

    const i = (data.income?.incomeStreams || []).map(s => {
        const streamArr = [
            s.name,
            Math.round(s.annualIncome || 0),
            s.startYear,
            s.endWorkYear,
            s.growthRate,
            Math.round(s.individual401k || 0),
            Math.round(s.company401k || 0),
            Math.round(s.equity || 0),
            (s.jumps || []).map(j => [j.year, j.jumpPercent, j.description || '']),
            (s.careerBreaks || []).map(b => [b.startYear, b.durationMonths, b.reductionPercent || 100, b.description || ''])
        ]

        // Defaults for trimming: [null, null, 1, yearsToRet, 2.7, 0, 0, 0, [], []]
        // Note: We can't easily trim 'name' or 'val' from start, but we can trim from end
        return trimArray(streamArr, [null, null, 1, yearsToRet, 2.7, 0, 0, 0, [], []])
    })

    // 3. Expenses
    // [simpleMode, totalMonthly, simpleGrowth, [categories...]]
    // 3. Expenses
    // [simpleMode, totalMonthly, simpleGrowth, [categories...]]
    const categories = (data.expenses?.expenseCategories || [])
        .filter(c => {
            // Optimization: Only include category if it has non-default values
            // Default: amount=0, percent=0, jumps=[], growth=default?
            const hasAmount = (c.amountType === 'percent' && c.percentOfIncome > 0) || (c.amountType !== 'percent' && c.annualAmount > 0)
            const hasJumps = c.jumps && c.jumps.length > 0
            // Keep if custom (not in default map) OR has values
            const isCustom = EXPENSE_ID_MAP[c.id] === undefined
            return isCustom || hasAmount || hasJumps
        })
        .map(c => {
            const id = EXPENSE_ID_MAP[c.id] !== undefined ? EXPENSE_ID_MAP[c.id] : c.id
            const isPercent = c.amountType === 'percent'

            const arr = [
                id,
                isPercent ? 1 : 0,
                isPercent ? c.percentOfIncome : Math.round(c.annualAmount || 0),
                c.growthRate,
                (c.jumps || []).map(j => [j.year, j.type, j.value, j.description || ''])
            ]

            // Defaults: [null, 1, 0, 2.7, []]
            return trimArray(arr, [null, 1, 0, 2.7, []])
        })

    const e = [
        data.expenses?.simpleMode ? 1 : 0,
        Math.round(data.expenses?.totalMonthlyExpense || 0),
        data.expenses?.simpleGrowthRate !== undefined ? data.expenses.simpleGrowthRate : 3,
        categories
    ]

    // 4. One Time Expenses
    // [year, amount, desc]
    const eo = (data.expenses?.oneTimeExpenses || []).map(o => [
        o.year,
        Math.round(o.amount || 0),
        o.description || ''
    ])

    // 5. Investments
    // [currCash, targCash, [r4_val, r4_growth, r4_lim, r4_lim_growth, r4_co_contrib], [[val, growth, alloc], ...]]
    const inv = [
        Math.round(data.investmentsDebt?.currentCash || 0),
        Math.round(data.investmentsDebt?.targetCash || 0),
        trimArray([
            Math.round(data.investmentsDebt?.retirement401k?.currentValue || 0),
            data.investmentsDebt?.retirement401k?.growthRate || 0,
            Math.round(data.investmentsDebt?.retirement401k?.individualLimit || 0),
            data.investmentsDebt?.retirement401k?.limitGrowth || 0,
            Math.round(data.investmentsDebt?.retirement401k?.companyContribution || 0)
        ], [0, 7, 23000, 0, 0]),
        (data.investmentsDebt?.investments || []).map(inv => trimArray([
            Math.round(inv.currentValue || 0),
            inv.growthRate || 0,
            inv.portfolioPercent || 0
        ], [0, 7, 0]))
    ]

    // 6. Tax Customizations
    // [filingRemap, customLadder, customDed, customCred]
    const t = trimArray([
        Object.keys(data.filingStatusRemapping || {}).length ? data.filingStatusRemapping : null,
        data.customTaxLadder,
        data.customStandardDeductions,
        data.customTaxCredits
    ])

    // 7. Property
    // [mode, [homeVal, growth, mortRem, monPay, price, downPmt, downType, purchYr, mortRate, term, tax, ins, maint, addExp, ownExpAmt, ownExpType, pmiAmt, pmiType, rentOffAmt, rentOffType]]
    const pd = data.property?.details || {}
    const pDetails = trimArray([
        Math.round(pd.homeValue || 0),              // 0
        pd.growthRate,                              // 1: 3.0
        Math.round(pd.mortgageRemaining || 0),      // 2
        Math.round(pd.monthlyPayment || 0),         // 3
        Math.round(pd.homePrice || 0),              // 4
        Math.round(pd.downPayment || 0),            // 5
        pd.downPaymentType === 'percent' ? 1 : 0,   // 6: 1 (percent)
        pd.purchaseYear,                            // 7: 1
        pd.mortgageRate,                            // 8: 6.5
        pd.term,                                    // 9: 30
        pd.propertyTaxRate,                         // 10: 1.2
        pd.insuranceRate,                           // 11: 0.5
        pd.maintenanceRate,                         // 12: 1.0
        Math.round(pd.additionalExpense || 0),      // 13
        Math.round(pd.ownershipExpenseAmount || 0), // 14
        pd.ownershipExpenseType === 'percent' ? 1 : 0, // 15: 1 (percent)
        Math.round(pd.pmiAmount || 0),              // 16
        pd.pmiType === 'percent' ? 1 : 0,           // 17: 0 (dollar - Wait, default is dollar? Schema says 'dollar' for pmiType default: 64: pmiType: 'dollar')
        Math.round(pd.rentalIncomeOffsetAmount || 0), // 18
        pd.rentalIncomeOffsetType === 'percent' ? 1 : 0 // 19: 0 (dollar)
    ], [0, 3.0, 0, 0, 0, 0, 1, 1, 6.5, 30, 1.2, 0.5, 1.0, 0, 0, 1, 0, 0, 0, 0])

    const prop = trimArray([
        toIdx(data.property?.mode || 'none', ['none', 'own', 'buy']),
        pDetails
    ], [0, []]) // Default mode 0 (none), empty details

    // Final Array: [p, i, e, eo, inv, t, prop]
    // Trim empty sections from the end (e.g. if no property)
    return trimArray([p, i, e, eo, inv, t, prop])
}

/**
 * Inflate the ultra-compact array structure back into the full state object
 */
export function inflateState(minified) {
    if (!Array.isArray(minified)) {
        console.error('Invalid share link format')
        return null
    }

    const states = getStatesList()

    // Destructure with defaults
    const p = minified[0] || []
    const i = minified[1] || []
    const e = minified[2] || []
    const eo = minified[3] || []
    const inv = minified[4] || []
    const t = minified[5] || []
    const prop = minified[6] || []

    // 1. Profile
    const profile = {
        location: fromIdx(p[0], states) || 'California',
        country: fromIdx(p[1], COUNTRIES) || 'USA',
        filingStatus: fromIdx(p[2], FILING_STATUSES) || 'Single',
        age: p[3] || 30,
        retirementAge: p[4] || 65,
        currentCash: p[5] || 0,
        targetCash: p[6] || 0,
        inflationRate: p[7] !== undefined ? p[7] : 2.7,
        currentSavings: p[8] || 0
    }

    // 2. Income
    const yearsToRet = (profile.retirementAge || 65) - (profile.age || 30)

    const incomeStreams = i.map((s, idx) => ({
        id: `stream-${idx + 1}`,
        name: s[0] || 'Income',
        annualIncome: s[1] || 0,
        startYear: s[2] !== undefined ? s[2] : 1,
        endWorkYear: s[3] !== undefined ? s[3] : yearsToRet,
        growthRate: s[4] !== undefined ? s[4] : 2.7,
        individual401k: s[5] || 0,
        company401k: s[6] || 0,
        equity: s[7] || 0,
        isEndYearLinked: s[3] === undefined || s[3] === yearsToRet, // Infer linkage
        jumps: (s[8] || []).map((j, jIdx) => ({
            id: `jump-${idx}-${jIdx}`,
            year: j[0],
            jumpPercent: j[1],
            description: j[2]
        })),
        careerBreaks: (s[9] || []).map((b, bIdx) => ({
            id: `break-${idx}-${bIdx}`,
            startYear: b[0],
            durationMonths: b[1],
            reductionPercent: b[2],
            description: b[3]
        }))
    }))

    // 3. Expenses
    const rawExpenses = e
    let simpleMode = false
    let totalMonthlyExpense = ''
    let simpleGrowthRate = 3
    let categoriesList = []

    if (rawExpenses.length > 0 && !Array.isArray(rawExpenses[0])) {
        // New format: [simpleMode, totalMonthly, simpleGrowth, categories]
        simpleMode = !!rawExpenses[0]
        totalMonthlyExpense = rawExpenses[1] || ''
        simpleGrowthRate = rawExpenses[2] !== undefined ? rawExpenses[2] : 3
        categoriesList = rawExpenses[3] || []
    } else {
        // Old format: [cat1, cat2, ...]
        categoriesList = rawExpenses
    }

    // Helper to inflate a single category array
    const inflateCategory = (c, idx) => {
        // Resolve ID
        let id = c[0]
        let name = c[0]

        if (typeof c[0] === 'number') {
            id = REVERSE_EXPENSE_ID_MAP[c[0]]
            // Find default name
            const defaultCat = DEFAULT_EXPENSE_CATEGORIES.find(d => d.id === id)
            if (defaultCat) name = defaultCat.name
        }

        const isPercent = c[1] !== 0 // Default to percent (1) if undefined/omitted

        const inflated = {
            id: typeof c[0] === 'number' ? id : `custom-${idx}`,
            category: name || 'Expense', // For UI compatibility
            name: name || 'Expense',
            amountType: isPercent ? 'percent' : 'fixed',
            percentOfIncome: isPercent ? (c[2] || 0) : '',
            annualAmount: !isPercent ? (c[2] || 0) : '',
            growthRate: c[3] !== undefined ? c[3] : 2.7,
            jumps: (c[4] || []).map((j, jIdx) => ({
                id: `exp-jump-${idx}-${jIdx}`,
                year: j[0],
                type: j[1],
                value: j[2],
                description: j[3]
            }))
        }
        return inflated
    }

    // Inflate only the Present categories from URL
    const urlCategories = categoriesList.map((c, idx) => inflateCategory(c, idx))

    // Merge with Defaults to ensure no categories are missing
    const expenseCategories = DEFAULT_EXPENSE_CATEGORIES.map(def => {
        const found = urlCategories.find(c => c.id === def.id)
        if (found) return found

        // Return blank default
        return {
            id: def.id,
            category: def.name,
            name: def.name,
            amountType: 'percent',
            percentOfIncome: '',
            annualAmount: '',
            growthRate: 2.7,
            jumps: []
        }
    })

    // Add any Custom categories from URL that aren't in defaults
    const customCategories = urlCategories.filter(c => !DEFAULT_EXPENSE_CATEGORIES.some(d => d.id === c.id))
    expenseCategories.push(...customCategories)

    // 4. One Time Expenses
    const oneTimeExpenses = eo.map((o, idx) => ({
        id: `ote-${idx}`,
        year: o[0],
        amount: o[1],
        description: o[2]
    }))

    // 5. Investments
    const inv401k = inv[2] || []
    const investmentsDebt = {
        currentCash: inv[0] || 0,
        targetCash: inv[1] || 0,
        retirement401k: {
            currentValue: inv401k[0] || 0,
            growthRate: inv401k[1] !== undefined ? inv401k[1] : 7,
            individualLimit: inv401k[2] !== undefined ? inv401k[2] : 23000,
            limitGrowth: inv401k[3] || 0,
            companyContribution: inv401k[4] || 0
        },
        investments: (inv[3] || []).map((item, idx) => ({
            id: `inv-${idx + 1}`,
            currentValue: item[0] || 0,
            growthRate: item[1] !== undefined ? item[1] : 7,
            portfolioPercent: item[2] || 0
        }))
    }

    // 6. Tax Customizations
    const filingStatusRemapping = t[0] || {}
    const customTaxLadder = t[1]
    const customStandardDeductions = t[2]
    const customTaxCredits = t[3]

    // 7. Property
    const pd = prop[1] || []
    const property = {
        mode: fromIdx(prop[0], ['none', 'own', 'buy']) || 'none',
        details: {
            homeValue: pd[0] || '',
            growthRate: pd[1] !== undefined ? pd[1] : 3.0,
            mortgageRemaining: pd[2] || '',
            monthlyPayment: pd[3] || '',
            homePrice: pd[4] || '',
            downPayment: pd[5] || '',
            downPaymentType: pd[6] === 0 ? 'dollar' : 'percent',
            purchaseYear: pd[7] !== undefined ? pd[7] : 1,
            mortgageRate: pd[8] !== undefined ? pd[8] : 6.5,
            term: pd[9] !== undefined ? pd[9] : 30,
            propertyTaxRate: pd[10] !== undefined ? pd[10] : 1.2,
            insuranceRate: pd[11] !== undefined ? pd[11] : 0.5,
            maintenanceRate: pd[12] !== undefined ? pd[12] : 1.0,
            additionalExpense: pd[13] || '',
            ownershipExpenseAmount: pd[14] || '',
            ownershipExpenseType: pd[15] === 0 ? 'dollar' : 'percent',
            pmiAmount: pd[16] || '',
            pmiType: pd[17] === 1 ? 'percent' : 'dollar',
            rentalIncomeOffsetAmount: pd[18] || '',
            rentalIncomeOffsetType: pd[19] === 1 ? 'percent' : 'dollar'
        }
    }

    return {
        profile,
        income: { incomeStreams },
        expenses: {
            expenseCategories,
            oneTimeExpenses,
            simpleMode,
            totalMonthlyExpense,
            simpleGrowthRate
        },
        investmentsDebt,
        filingStatusRemapping,
        customTaxLadder,
        customStandardDeductions,
        customTaxCredits,
        property
    }
}
