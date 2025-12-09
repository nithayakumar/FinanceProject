import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'
import { Select } from '../../../shared/ui/Select'
import { PROPERTY_FIELDS } from '../config/propertySchema'

export function ExpenseImpactCard({ expensesData, actions, onUpdateProperty, propertyDetails, mode }) {
    const { simpleMode, expenseCategories } = expensesData

    // Find Housing category
    const housingCategory = expenseCategories.find(c => c.id === 'housing')

    if (!simpleMode && housingCategory) {
        // SPEND CATEGORIES MODE
        return (
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Current Expenses: Housing 🧾</h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Synced with Expenses</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                        label="Amount Type"
                        value={housingCategory.amountType}
                        onChange={val => actions.updateHousingExpense('amountType', val)}
                        options={[
                            { value: 'percent', label: '% of Income' },
                            { value: 'fixed', label: 'Fixed Amount' }
                        ]}
                    />

                    {housingCategory.amountType === 'percent' ? (
                        <div className="space-y-4">
                            <Input
                                label="% of Income"
                                suffix="%"
                                value={housingCategory.percentOfIncome}
                                onChange={val => actions.updateHousingExpense('percentOfIncome', val)}
                                type="number"
                            />
                            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                                ℹ️ Yearly Growth is tied to Income Growth when using % of Income.
                            </div>
                        </div>
                    ) : (
                        <>
                            <Input
                                label="Annual Amount"
                                prefix="$"
                                value={housingCategory.annualAmount}
                                onChange={val => actions.updateHousingExpense('annualAmount', val)}
                                type="number"
                            />
                            <Input
                                label="Yearly Expense Growth"
                                suffix="%"
                                value={housingCategory.growthRate}
                                onChange={val => actions.updateHousingExpense('growthRate', val)}
                                type="number"
                            />
                        </>
                    )}
                </div>

                {/* Sync Button for Buy Mode */}
                {mode === 'buy' && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={actions.syncMortgageToHousing}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                            🔄 Update with calculated mortgage calculation
                        </button>
                    </div>
                )}
            </Card>
        )
    }

    // SIMPLE MODE
    return (
        <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Related Expenses 🧾</h3>
            <p className="text-sm text-gray-500 mb-6">
                Since you're using "Simple Expenses", strictly add specific property costs here. These are added to your scenario for analysis but do NOT update your main Dashboard expense line.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                    {...PROPERTY_FIELDS.additionalExpense}
                    value={propertyDetails.additionalExpense}
                    onChange={val => onUpdateProperty('additionalExpense', val)}
                />

                <Input
                    {...PROPERTY_FIELDS.propertyTaxRate}
                    value={propertyDetails.propertyTaxRate}
                    onChange={val => onUpdateProperty('propertyTaxRate', val)}
                />

                <Input
                    {...PROPERTY_FIELDS.insuranceRate}
                    value={propertyDetails.insuranceRate}
                    onChange={val => onUpdateProperty('insuranceRate', val)}
                />

                <Input
                    {...PROPERTY_FIELDS.maintenanceRate}
                    value={propertyDetails.maintenanceRate}
                    onChange={val => onUpdateProperty('maintenanceRate', val)}
                />
            </div>
        </Card>
    )
}
