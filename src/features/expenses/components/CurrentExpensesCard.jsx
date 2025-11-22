import React from 'react'
import { Card, Button, Input } from '../../../shared/ui'
import { EXPENSE_FIELDS } from '../config/expensesSchema'

export function CurrentExpensesCard({ categories, onUpdate }) {
    return (
        <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Current Expenses</h2>
                {/* Add button removed as per request for fixed categories */}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg w-1/4">Category</th>
                            <th className="px-4 py-3 w-1/4">Type</th>
                            <th className="px-4 py-3 w-1/4">Yearly Expense</th>
                            <th className="px-4 py-3 rounded-r-lg w-1/4">Yearly Growth</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <tr key={category.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900 text-base">
                                    {category.name}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
                                        <button
                                            onClick={() => onUpdate(category.id, 'amountType', 'fixed')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${category.amountType === 'fixed'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                        >
                                            $ Fixed
                                        </button>
                                        <button
                                            onClick={() => onUpdate(category.id, 'amountType', 'percent')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${category.amountType === 'percent'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                        >
                                            % Income
                                        </button>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {category.amountType === 'fixed' ? (
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={category.annualAmount}
                                                onChange={(val) => onUpdate(category.id, 'annualAmount', val)}
                                                prefix="$"
                                                placeholder="0"
                                                className="w-full max-w-[140px]"
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={category.percentOfIncome}
                                                onChange={(val) => onUpdate(category.id, 'percentOfIncome', val)}
                                                suffix="%"
                                                placeholder="0"
                                                step="0.1"
                                                className="w-full max-w-[140px]"
                                            />
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <Input
                                        type="number"
                                        value={category.growthRate}
                                        onChange={(val) => onUpdate(category.id, 'growthRate', val)}
                                        suffix="%"
                                        placeholder="2.7"
                                        step="0.1"
                                        className="w-24"
                                    />
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                                    No expenses found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
