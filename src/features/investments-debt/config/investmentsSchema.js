export const INVESTMENT_FIELDS = {
    name: {
        label: 'Account Name',
        placeholder: 'e.g. Brokerage Account'
    },
    currentBalance: {
        label: 'Current Balance 💰',
        prefix: '$',
        type: 'number'
    },
    annualContribution: {
        label: 'Annual Contribution ➕',
        prefix: '$',
        type: 'number'
    },
    growthRate: {
        label: 'Growth Rate 📈',
        suffix: '%',
        type: 'number',
        step: '0.1'
    }
}

export const DEBT_FIELDS = {
    name: {
        label: 'Loan Name',
        placeholder: 'e.g. Student Loan'
    },
    currentBalance: {
        label: 'Current Balance 📉',
        prefix: '$',
        type: 'number'
    },
    interestRate: {
        label: 'Interest Rate 🏦',
        suffix: '%',
        type: 'number',
        step: '0.1'
    },
    monthlyPayment: {
        label: 'Monthly Payment 💳',
        prefix: '$',
        type: 'number'
    }
}
