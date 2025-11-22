export const EXPENSE_FIELDS = {
    amountType: {
        label: 'Type',
        type: 'select',
        options: [
            { value: 'percent', label: '% of Income' },
            { value: 'fixed', label: 'Fixed Amount' }
        ]
    },
    annualAmount: {
        label: 'Annual Amount 💸',
        prefix: '$',
        placeholder: '12000',
        type: 'number'
    },
    percentOfIncome: {
        label: '% of Income 📊',
        suffix: '%',
        placeholder: '10',
        type: 'number',
        step: '0.1'
    },
    growthRate: {
        label: 'Inflation Rate 📈',
        suffix: '%',
        type: 'number',
        step: '0.1'
    }
}

export const DEFAULT_EXPENSE_CATEGORIES = [
    { id: 'housing', name: 'Housing 🏠', defaultPercent: 30, defaultAmount: 0 },
    { id: 'utilities', name: 'Utilities 💡', defaultPercent: 4, defaultAmount: 0 },
    { id: 'transportation', name: 'Transportation 🚗', defaultPercent: 7, defaultAmount: 0 },
    { id: 'medical', name: 'Medical 🏥', defaultPercent: 3, defaultAmount: 0 },
    { id: 'food', name: 'Food 🍔', defaultPercent: 14, defaultAmount: 0 },
    { id: 'entertainment', name: 'Entertainment 🎬', defaultPercent: 9, defaultAmount: 0 },
    { id: 'other', name: 'Other 📦', defaultPercent: 4, defaultAmount: 0 },
    { id: 'childcare', name: 'Childcare 👶', defaultPercent: 0, defaultAmount: 0 },
    { id: 'education', name: 'Education 🎓', defaultPercent: 0, defaultAmount: 0 }
]

export const JUMP_TYPES = {
    CHANGE_AMOUNT: { value: 'change_amount', label: 'Change Expense $' },
    SET_AMOUNT: { value: 'set_amount', label: 'Set New Expense $' },
    CHANGE_PERCENT: { value: 'change_percent', label: 'Change by %' }, // e.g. increase by 10%
    SET_PERCENT_INCOME: { value: 'set_percent_income', label: 'Set New % of Income' }
}

export const JUMP_DESCRIPTIONS = ["Lifestyle Inflation 🍾", "New Home 🏠", "Child Expenses 👶", "Medical Costs 🏥", "Travel Plans ✈️"]
