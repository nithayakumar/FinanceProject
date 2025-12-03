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
        const isEmpty = val === null || val === undefined || val === '' || val === 0 || (Array.isArray(val) && val.length === 0)
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
    // [id(idx), type(0/1), val, growth, jumps[]]
    const e = (data.expenses?.expenseCategories || []).map(c => {
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

    // Final Array: [p, i, e, eo, inv, t]
    // Trim empty sections from the end (e.g. if no tax customizations)
    return trimArray([p, i, e, eo, inv, t])
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
    const expenseCategories = e.map((c, idx) => {
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

        return {
            id: typeof c[0] === 'number' ? id : `custom-${idx}`,
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
    })

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

    return {
        profile,
        income: { incomeStreams },
        expenses: { expenseCategories, oneTimeExpenses },
        investmentsDebt,
        filingStatusRemapping,
        customTaxLadder,
        customStandardDeductions,
        customTaxCredits
    }
}
