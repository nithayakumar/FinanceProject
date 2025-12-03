const LZString = require('lz-string');

// Mock Data representing a "Typical" user state
const mockData = {
    profile: {
        location: 'California',
        country: 'USA',
        filingStatus: 'Single',
        age: 30,
        retirementAge: 65,
        currentCash: 15000,
        targetCash: 20000,
        inflationRate: 2.7,
        currentSavings: 50000
    },
    income: {
        incomeStreams: [
            {
                id: '1',
                name: 'Software Engineer',
                annualIncome: 160000,
                growthRate: 3.0,
                startYear: 1,
                endWorkYear: 35,
                isEndYearLinked: true,
                individual401k: 23000,
                company401k: 5000,
                equity: 20000,
                jumps: [
                    { id: 'j1', year: 5, jumpPercent: 15, description: 'Promotion' }
                ],
                careerBreaks: []
            },
            {
                id: '2',
                name: 'Side Hustle',
                annualIncome: 10000,
                growthRate: 5.0,
                startYear: 1,
                endWorkYear: 10,
                isEndYearLinked: false,
                individual401k: 0,
                company401k: 0,
                equity: 0,
                jumps: [],
                careerBreaks: []
            }
        ]
    },
    expenses: {
        expenseCategories: [
            { id: 'housing', name: 'Housing', annualAmount: 0, amountType: 'percent', percentOfIncome: 30, growthRate: 2.7, jumps: [] },
            { id: 'food', name: 'Food', annualAmount: 0, amountType: 'percent', percentOfIncome: 10, growthRate: 2.7, jumps: [] },
            { id: 'transport', name: 'Transport', annualAmount: 5000, amountType: 'fixed', percentOfIncome: 0, growthRate: 2.7, jumps: [] },
            { id: 'utilities', name: 'Utilities', annualAmount: 2400, amountType: 'fixed', percentOfIncome: 0, growthRate: 2.7, jumps: [] }
        ],
        oneTimeExpenses: [
            { id: 'wedding', year: 3, description: 'Wedding', amount: 30000 }
        ]
    },
    investmentsDebt: {
        currentCash: 15000,
        targetCash: 20000,
        retirement401k: {
            currentValue: 50000,
            growthRate: 7.0,
            individualLimit: 23000,
            limitGrowth: 2.0,
            companyContribution: 5000
        },
        investments: [
            { id: '1', currentValue: 20000, growthRate: 7.0, portfolioPercent: 80 },
            { id: '2', currentValue: 5000, growthRate: 5.0, portfolioPercent: 20 }
        ]
    },
    filingStatusRemapping: {},
    customTaxLadder: null,
    customStandardDeductions: null,
    customTaxCredits: null
};

// 1. Baseline: Current Implementation
const jsonString = JSON.stringify(mockData);
const compressed = LZString.compressToEncodedURIComponent(jsonString);
const currentUrlLength = compressed.length;

console.log('--- Baseline ---');
console.log('JSON Length:', jsonString.length);
console.log('Compressed (URL Safe) Length:', currentUrlLength);


// 2. Minification Strategy
function minify(data) {
    const m = {};

    // Profile
    if (data.profile) {
        m.p = {
            l: data.profile.location,
            c: data.profile.country,
            fs: data.profile.filingStatus,
            a: data.profile.age,
            ra: data.profile.retirementAge,
            cc: data.profile.currentCash,
            tc: data.profile.targetCash,
            ir: data.profile.inflationRate,
            cs: data.profile.currentSavings
        };
    }

    // Income
    if (data.income && data.income.incomeStreams) {
        m.i = data.income.incomeStreams.map(s => {
            const sMin = {
                n: s.name,
                ai: s.annualIncome,
                gr: s.growthRate,
                sy: s.startYear,
                ey: s.endWorkYear,
                i4: s.individual401k,
                c4: s.company401k,
                eq: s.equity
            };
            // Only add optional arrays if they exist
            if (s.jumps && s.jumps.length) sMin.j = s.jumps.map(j => ({ y: j.year, jp: j.jumpPercent, d: j.description }));
            if (s.careerBreaks && s.careerBreaks.length) sMin.cb = s.careerBreaks.map(b => ({ sy: b.startYear, dm: b.durationMonths, rp: b.reductionPercent }));
            return sMin;
        });
    }

    // Expenses
    if (data.expenses) {
        m.e = {};
        if (data.expenses.expenseCategories) {
            m.e.c = data.expenses.expenseCategories.map(c => {
                const cMin = {
                    i: c.id,
                    n: c.name,
                    at: c.amountType === 'percent' ? 1 : 0, // Enum optimization
                    gr: c.growthRate
                };
                if (c.amountType === 'percent') cMin.pi = c.percentOfIncome;
                else cMin.aa = c.annualAmount;

                if (c.jumps && c.jumps.length) cMin.j = c.jumps; // Simplify for now
                return cMin;
            });
        }
        if (data.expenses.oneTimeExpenses && data.expenses.oneTimeExpenses.length) {
            m.e.o = data.expenses.oneTimeExpenses.map(o => ({ y: o.year, d: o.description, a: o.amount }));
        }
    }

    // Investments
    if (data.investmentsDebt) {
        m.inv = {
            cc: data.investmentsDebt.currentCash,
            tc: data.investmentsDebt.targetCash,
            r4: {
                cv: data.investmentsDebt.retirement401k.currentValue,
                gr: data.investmentsDebt.retirement401k.growthRate,
                il: data.investmentsDebt.retirement401k.individualLimit,
                lg: data.investmentsDebt.retirement401k.limitGrowth
            },
            i: data.investmentsDebt.investments.map(i => ({
                cv: i.currentValue,
                gr: i.growthRate,
                pp: i.portfolioPercent
            }))
        };
    }

    return m;
}

const minifiedData = minify(mockData);
const minifiedJson = JSON.stringify(minifiedData);
const minifiedCompressed = LZString.compressToEncodedURIComponent(minifiedJson);

console.log('\n--- Minified ---');
console.log('Minified JSON Length:', minifiedJson.length);
console.log('Minified Compressed Length:', minifiedCompressed.length);
console.log('Reduction:', ((1 - minifiedCompressed.length / currentUrlLength) * 100).toFixed(1) + '%');

// 3. Ultra-Minified (Array based, no keys)
function ultraMinify(data) {
    // Profile: [loc, country, status, age, retAge, currCash, targCash, infRate, currSav]
    const p = [
        data.profile.location,
        data.profile.country,
        data.profile.filingStatus,
        data.profile.age,
        data.profile.retirementAge,
        data.profile.currentCash,
        data.profile.targetCash,
        data.profile.inflationRate,
        data.profile.currentSavings
    ];

    // Income: [[name, inc, growth, start, end, ind401k, co401k, equity, [jumps], [breaks]], ...]
    const i = data.income.incomeStreams.map(s => [
        s.name,
        s.annualIncome,
        s.growthRate,
        s.startYear,
        s.endWorkYear,
        s.individual401k || 0,
        s.company401k || 0,
        s.equity || 0,
        (s.jumps || []).map(j => [j.year, j.jumpPercent]),
        (s.careerBreaks || []).map(b => [b.startYear, b.durationMonths])
    ]);

    // Expenses: [[id, type(0=fix,1=%), val, growth], ...]
    // Note: Dropping name if it matches ID defaults to save space? Or just keep name.
    // Let's keep name for custom cats.
    const e = data.expenses.expenseCategories.map(c => [
        c.id,
        c.amountType === 'percent' ? 1 : 0,
        c.amountType === 'percent' ? c.percentOfIncome : c.annualAmount,
        c.growthRate
    ]);

    // One Time: [[year, amount, desc], ...]
    const eo = (data.expenses.oneTimeExpenses || []).map(o => [o.year, o.amount, o.description]);

    // Investments: [currCash, targCash, [r4_val, r4_growth, r4_lim, r4_lim_growth], [[val, growth, alloc], ...]]
    const inv = [
        data.investmentsDebt.currentCash,
        data.investmentsDebt.targetCash,
        [
            data.investmentsDebt.retirement401k.currentValue,
            data.investmentsDebt.retirement401k.growthRate,
            data.investmentsDebt.retirement401k.individualLimit,
            data.investmentsDebt.retirement401k.limitGrowth
        ],
        data.investmentsDebt.investments.map(i => [
            i.currentValue,
            i.growthRate,
            i.portfolioPercent
        ])
    ];

    return [p, i, e, eo, inv];
}

const ultraMinifiedData = ultraMinify(mockData);
const ultraJson = JSON.stringify(ultraMinifiedData);
const ultraCompressed = LZString.compressToEncodedURIComponent(ultraJson);

console.log('\n--- Ultra Minified (Array-based) ---');
console.log('Ultra JSON Length:', ultraJson.length);
console.log('Ultra Compressed Length:', ultraCompressed.length);
console.log('Reduction vs Baseline:', ((1 - ultraCompressed.length / currentUrlLength) * 100).toFixed(1) + '%');
