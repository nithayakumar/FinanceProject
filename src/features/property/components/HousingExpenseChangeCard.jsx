import React from 'react'
import { Card } from '../../../shared/ui/Card'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'
import { JUMP_TYPES } from '../../expenses/config/expensesSchema'

export function HousingExpenseChangeCard({ housingCategory, actions }) {
    const { onAddJump, onUpdateJump, onRemoveJump } = actions

    // Safety check for jumps array and sort by year
    const jumps = (housingCategory.jumps || []).sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0))

    return (
        <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Change in Housing Expense</h2>
                    <p className="text-xs bg-green-100 text-green-800 px-2 py-0.5 mt-2 rounded-full w-fit font-medium">Synced with Expenses</p>
                </div>
                <Button
                    onClick={() => onAddJump('add')}
                    variant="secondary"
                    size="sm"
                >
                    + Expense Change
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg w-24">Year</th>
                            <th className="px-4 py-3 w-48">Change Type</th>
                            <th className="px-4 py-3">Value</th>
                            <th className="px-4 py-3 rounded-r-lg text-right w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {jumps.map((jump) => (
                            <tr key={jump.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <Input
                                        type="number"
                                        value={jump.year}
                                        onChange={(val) => onUpdateJump('update', { jumpId: jump.id, field: 'year', value: val })}
                                        placeholder="Year"
                                        className="w-20"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={jump.type || JUMP_TYPES.CHANGE_PERCENT.value}
                                        onChange={(e) => onUpdateJump('update', { jumpId: jump.id, field: 'type', value: e.target.value })}
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
                                                    // Handle both field names for compatibility
                                                    onUpdateJump('update', { jumpId: jump.id, field: 'value', value: val })
                                                    onUpdateJump('update', { jumpId: jump.id, field: 'jumpPercent', value: val })
                                                }}
                                                prefix={isDollarType ? '$' : undefined}
                                                suffix={isPercentType ? '%' : undefined}
                                                placeholder="0"
                                                className="w-32"
                                            />
                                        )
                                    })()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => onRemoveJump('remove', { jumpId: jump.id })}
                                        className="text-gray-400 hover:text-red-600 font-medium text-lg"
                                        title="Remove"
                                    >
                                        ×
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {jumps.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
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
