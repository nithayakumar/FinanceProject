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
        label: 'Yearly Expense Growth 📈',
        suffix: '%',
        type: 'number',
        step: '0.1'
    }
}

export const DEFAULT_EXPENSE_CATEGORIES = [
    { id: 'housing', name: 'Housing', defaultPercent: 22, defaultAmount: 0 },
    { id: 'utilities', name: 'Utilities', defaultPercent: 3, defaultAmount: 0 },
    { id: 'transportation', name: 'Transportation', defaultPercent: 7, defaultAmount: 0 },
    { id: 'medical', name: 'Medical', defaultPercent: 3, defaultAmount: 0 },
    { id: 'food', name: 'Food', defaultPercent: 12, defaultAmount: 0 },
    { id: 'entertainment', name: 'Entertainment', defaultPercent: 8, defaultAmount: 0 },
    { id: 'childcare', name: 'Childcare', defaultPercent: 0, defaultAmount: 0 },
    { id: 'education', name: 'Education', defaultPercent: 0, defaultAmount: 0 },
    { id: 'other', name: 'Other', defaultPercent: 0, defaultAmount: 0 }
]

export const JUMP_TYPES = {
    SET_AMOUNT: { value: 'set_amount', label: 'New Amount' },
    CHANGE_AMOUNT: { value: 'change_amount', label: 'Add/Subtract Amount' },
    CHANGE_PERCENT: { value: 'change_percent', label: 'Change Amount by %' },
    SET_PERCENT_INCOME: { value: 'set_percent_income', label: 'New % of Income' }
}

export const JUMP_DESCRIPTIONS = ["Lifestyle Inflation 🍾", "New Home 🏠", "Child Expenses 👶", "Medical Costs 🏥", "Travel Plans ✈️"]
