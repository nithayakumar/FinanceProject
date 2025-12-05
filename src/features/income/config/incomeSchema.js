export const INCOME_FIELDS = {
    name: {
        label: 'Stream Name',
        placeholder: 'e.g. Primary Job'
    },
    annualIncome: {
        label: 'Annual Income 💵',
        prefix: '$',
        placeholder: '150000',
        type: 'number'
    },
    individual401k: {
        label: 'Pre-Tax Retirement (401k) 🏦',
        prefix: '$',
        placeholder: '23000',
        type: 'number',
        tooltip: 'Capped by the 401k limit set in Investments. If you enter a higher amount first, it will be overridden when you set the limit.'
    },
    growthRate: {
        label: 'Growth Rate 📈',
        suffix: '%',
        type: 'number',
        step: '0.1'
    },
    equity: {
        label: 'Bonus, Equity, etc. 📈',
        type: 'number',
        tooltip: 'Treated like cash'
    },
    company401k: {
        label: '401k Match 🤝',
        prefix: '$',
        type: 'number',
        tooltip: 'Employer contributions to your retirement'
    },
    startYear: {
        label: 'Start Year 🏁',
        type: 'number',
        tooltip: 'Year this income stream begins (1 = current year)'
    },
    endWorkYear: {
        label: 'End Work Year 🏁',
        type: 'number'
    }
}

export const JUMP_DESCRIPTIONS = ["Promotion 🚀", "Lateral Move ↔️", "New Job 💼", "Performance Bonus 🌟", "Market Adjustment 📈"]
export const BREAK_DESCRIPTIONS = ["Sabbatical 🏝️", "Parental Leave 👶", "Study Leave 📚", "Travel ✈️", "Personal Time 🧘"]
