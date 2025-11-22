import React, { useState } from 'react'
import { Card, Button, Input } from '../../../shared/ui'
import { JUMP_TYPES } from '../config/expensesSchema'

export function ExpenseTimelineCard({ categories, onAddJump, onUpdateJump, onRemoveJump }) {
    // Flatten all jumps into a single array with category context
    const allJumps = categories.flatMap(cat =>
        cat.jumps.map(jump => ({
            ...jump,
            categoryId: cat.id,
            categoryName: cat.name
        }))
    ).sort((a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999))

    const [selectedCategoryForNewJump, setSelectedCategoryForNewJump] = useState(categories[0]?.id || '')

    const handleAddJump = () => {
        if (selectedCategoryForNewJump) {
            onAddJump(selectedCategoryForNewJump)
        }
    }

    return (
        <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Expense Timeline 📅</h2>
                    <p className="text-sm text-gray-500">Future changes to your expenses (e.g., buying a home, kids, etc.)</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedCategoryForNewJump}
                        onChange={(e) => setSelectedCategoryForNewJump(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                    >
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <Button onClick={handleAddJump} variant="secondary" size="sm" disabled={!selectedCategoryForNewJump}>
                        + Add Change
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg w-24">Year</th>
                            <th className="px-4 py-3 w-48">Category</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Change Type</th>
                            <th className="px-4 py-3">Value</th>
                            <th className="px-4 py-3 rounded-r-lg text-right">Actions</th>
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
                                <td className="px-4 py-3 font-medium text-gray-900">
                                    {jump.categoryName}
                                </td>
                                <td className="px-4 py-3">
                                    <Input
                                        value={jump.description}
                                        onChange={(val) => onUpdateJump(jump.categoryId, jump.id, 'description', val)}
                                        placeholder="Description"
                                        className="w-full"
                                    />
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
                                    <Input
                                        type="number"
                                        value={jump.value || jump.jumpPercent} // Fallback for migration
                                        onChange={(val) => {
                                            onUpdateJump(jump.categoryId, jump.id, 'value', val)
                                            // Also update jumpPercent for backward compatibility if needed, or just rely on 'value'
                                            onUpdateJump(jump.categoryId, jump.id, 'jumpPercent', val)
                                        }}
                                        placeholder="0"
                                        className="w-24"
                                    />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => onRemoveJump(jump.categoryId, jump.id)}
                                        className="text-red-600 hover:text-red-900 font-medium"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {allJumps.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
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
