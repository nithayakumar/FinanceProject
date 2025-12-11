export const PROPERTY_MODES = {
    NONE: 'none',
    OWN: 'own',
    BUY: 'buy'
}

export const MORTGAGE_TERM_OPTIONS = [
    { value: 10, label: '10 Years' },
    { value: 15, label: '15 Years' },
    { value: 20, label: '20 Years' },
    { value: 25, label: '25 Years' },
    { value: 30, label: '30 Years' }
]

export const PROPERTY_FIELDS = {
    // Common
    homeValue: { label: 'Current Home Value', prefix: '$', type: 'number' },
    growthRate: { label: 'Growth Rate After Purchase', suffix: '%', placeholder: '3.0', type: 'number', step: '0.1' },

    // Own
    mortgageRemaining: { label: 'Mortgage Remaining', prefix: '$', type: 'number' },
    monthlyPayment: { label: 'Monthly Mortgage Payment', prefix: '$', type: 'number' },

    // Buy
    homePrice: { label: 'Home Price in Present Day Dollars', prefix: '$', type: 'number' },
    downPayment: { label: 'Down Payment', prefix: '$', type: 'number' }, // Could be % or $ logic handled in component
    purchaseYear: { label: 'Purchase Year', placeholder: '1', type: 'number' },
    mortgageRate: { label: 'Mortgage Interest Rate', suffix: '%', placeholder: '6.5', type: 'number', step: '0.1' },

    // Expenses (Simple Mode)
    additionalExpense: { label: 'Addt\'l Monthly Expenses (HOA, etc)', prefix: '$', type: 'number' },
    propertyTaxRate: { label: 'Property Tax Rate', suffix: '%', placeholder: '1.2', type: 'number', step: '0.01' },
    insuranceRate: { label: 'Home Insurance Rate', suffix: '%', placeholder: '0.5', type: 'number', step: '0.01' },
    maintenanceRate: { label: 'Maintenance Rate', suffix: '%', placeholder: '1.0', type: 'number', step: '0.1' }
}

export const DEFAULT_PROPERTY_STATE = {
    mode: PROPERTY_MODES.NONE,
    details: {
        // Own
        homeValue: '',
        growthRate: 3.0,
        mortgageRemaining: '',
        monthlyPayment: '',

        // Buy
        homePrice: '',
        downPayment: '',
        downPaymentType: 'percent', // 'percent' or 'dollar'
        purchaseYear: 1,
        mortgageRate: 6.5,
        term: 30,

        // Common Expenses (Simple Mode)
        propertyTaxRate: 1.2,
        insuranceRate: 0.5,
        maintenanceRate: 1.0,
        additionalExpense: '',

        // Simple Expense Card Fields
        ownershipExpenseAmount: '',
        ownershipExpenseType: 'percent',
        pmiAmount: '',
        pmiType: 'dollar',
        rentalIncomeOffsetAmount: '',
        rentalIncomeOffsetType: 'dollar'
    }
}
