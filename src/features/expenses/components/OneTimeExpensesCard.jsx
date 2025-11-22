import React from 'react'
import { Card, Button, Input } from '../../../shared/ui'

export function OneTimeExpensesCard({ oneTimeExpenses, onAdd, onUpdate, onRemove }) {
    return (
        <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">One-Time Expenses</h2>
                    <p className="text-sm text-gray-500">Typically large one-time costs like weddings</p>
                </div>
                <Button onClick={onAdd} variant="secondary" size="sm">
                    + One-Time Expense
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg w-24">Year</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 w-48">Amount (Today's $)</th>
                            <th className="px-4 py-3 rounded-r-lg text-right w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {oneTimeExpenses.map((expense) => (
                            <tr key={expense.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <Input
                                        type="number"
                                        value={expense.year}
                                        onChange={(val) => onUpdate(expense.id, 'year', val)}
                                        placeholder="Year"
                                        className="w-20"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <Input
                                        value={expense.description}
                                        onChange={(val) => onUpdate(expense.id, 'description', val)}
                                        placeholder="Description"
                                        className="w-full"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <Input
                                        type="number"
                                        value={expense.amount}
                                        onChange={(val) => onUpdate(expense.id, 'amount', val)}
                                        prefix="$"
                                        placeholder="0"
                                        className="w-full max-w-[180px]"
                                    />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => onRemove(expense.id)}
                                        className="text-gray-400 hover:text-red-600 font-medium text-lg"
                                        title="Remove"
                                    >
                                        ×
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {oneTimeExpenses.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                                    No one-time expenses added yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
