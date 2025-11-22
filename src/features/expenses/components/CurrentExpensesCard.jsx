import React from 'react'
import { Card, Button, Input } from '../../../shared/ui'
import { EXPENSE_FIELDS } from '../config/expensesSchema'

export function CurrentExpensesCard({ categories, onUpdate, onAdd, onRemove }) {
    return (
        <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Current Expenses 💸</h2>
                <Button onClick={onAdd} variant="primary" size="sm">
                    + Add Expense Category
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg">Category</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Amount / Rate</th>
                            <th className="px-4 py-3">Inflation</th>
                            <th className="px-4 py-3 rounded-r-lg text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <tr key={category.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                    <Input
                                        value={category.name}
                                        onChange={(val) => onUpdate(category.id, 'name', val)}
                                        placeholder="Category Name"
                                        className="w-full min-w-[150px]"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={category.amountType}
                                        onChange={(e) => onUpdate(category.id, 'amountType', e.target.value)}
                                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                    >
                                        {EXPENSE_FIELDS.amountType.options.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    {category.amountType === 'fixed' ? (
                                        <Input
                                            type="number"
                                            value={category.annualAmount}
                                            onChange={(val) => onUpdate(category.id, 'annualAmount', val)}
                                            prefix="$"
                                            placeholder="0"
                                            className="w-32"
                                        />
                                    ) : (
                                        <Input
                                            type="number"
                                            value={category.percentOfIncome}
                                            onChange={(val) => onUpdate(category.id, 'percentOfIncome', val)}
                                            suffix="%"
                                            placeholder="0"
                                            step="0.1"
                                            className="w-32"
                                        />
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
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => onRemove(category.id)}
                                        className="text-red-600 hover:text-red-900 font-medium"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                    No expenses added yet. Click "Add Expense Category" to start.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
