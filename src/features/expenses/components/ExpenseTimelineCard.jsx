import React, { useState } from 'react'
import { Card, Button, Input } from '../../../shared/ui'
import { JUMP_TYPES } from '../config/expensesSchema'

export function ExpenseTimelineCard({ categories, onAddJump, onUpdateJump, onRemoveJump, onMoveJump }) {
    // Flatten all jumps into a single array with category context
    const allJumps = categories.flatMap(cat =>
        cat.jumps.map(jump => ({
            ...jump,
            categoryId: cat.id,
            categoryName: cat.name
        }))
    ).sort((a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999))

    const handleAddJump = () => {
        // Add jump to the first category by default
        if (categories.length > 0) {
            onAddJump(categories[0].id)
        }
    }

    return (
        <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Change in Expense 📅</h2>
                    <p className="text-sm text-gray-500">Model changes to expenses (e.g. tuition fees)</p>
                </div>
                <Button onClick={handleAddJump} variant="secondary" size="sm">
                    + Expense Change
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg w-24">Year</th>
                            <th className="px-4 py-3 w-48">Category</th>
                            <th className="px-4 py-3 w-64">Change Type</th>
                            <th className="px-4 py-3">Yearly Expense</th>
                            <th className="px-4 py-3 rounded-r-lg text-right w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {allJumps.map((jump) => (
                            <tr key={jump.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <Input
                                        type="number"
                                        value={jump.year}
                                        onChange={(val) => onUpdateJump(jump.categoryId, jump.id, 'year', val)}
                                        placeholder="Year"
                                        className="w-20"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={jump.categoryId}
                                        onChange={(e) => onMoveJump(jump.id, jump.categoryId, e.target.value)}
                                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={jump.type || JUMP_TYPES.CHANGE_PERCENT.value}
                                        onChange={(e) => onUpdateJump(jump.categoryId, jump.id, 'type', e.target.value)}
                                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                    >
                                        {Object.values(JUMP_TYPES).map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    {(() => {
                                        const jumpType = jump.type || JUMP_TYPES.CHANGE_PERCENT.value
                                        const isPercentType = jumpType === 'change_percent' || jumpType === 'set_percent_income'
                                        const isDollarType = jumpType === 'set_amount' || jumpType === 'change_amount'

                                        return (
                                            <Input
                                                type="number"
                                                value={jump.value || jump.jumpPercent}
                                                onChange={(val) => {
                                                    onUpdateJump(jump.categoryId, jump.id, 'value', val)
                                                    onUpdateJump(jump.categoryId, jump.id, 'jumpPercent', val)
                                                }}
                                                prefix={isDollarType ? '$' : undefined}
                                                suffix={isPercentType ? '%' : undefined}
                                                placeholder="0"
                                                className="w-24"
                                            />
                                        )
                                    })()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => onRemoveJump(jump.categoryId, jump.id)}
                                        className="text-gray-400 hover:text-red-600 font-medium text-lg"
                                        title="Remove"
                                    >
                                        ×
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {allJumps.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                    No future changes added yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
