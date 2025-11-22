import React from 'react'
import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'
import { Button } from '../../../shared/ui/Button'
import { EXPENSE_FIELDS } from '../config/expensesSchema'

export function ExpenseCategoryCard({
    category,
    isExpanded,
    onToggleExpand,
    onUpdate,
    onAddJump,
    onUpdateJump,
    onRemoveJump
}) {
    return (
        <Card>
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{category.category}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Input
                    {...EXPENSE_FIELDS.annualAmount}
                    value={category.annualAmount}
                    onChange={(e) => onUpdate(category.id, 'annualAmount', e.target.value ? Number(e.target.value) : '')}
                />
                <Input
                    {...EXPENSE_FIELDS.percentOfIncome}
                    value={category.percentOfIncome}
                    onChange={(e) => onUpdate(category.id, 'percentOfIncome', e.target.value ? Number(e.target.value) : '')}
                />
            </div>

            <div>
                <button
                    onClick={() => onToggleExpand(category.id)}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 font-medium group"
                >
                    <div className={`mr-2 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-200 transition ${isExpanded ? 'rotate-90' : ''}`}>
                        ▶
                    </div>
                    More detail (Inflation & Jumps)
                </button>

                {isExpanded && (
                    <div className="mt-4 pl-2 space-y-6 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                {...EXPENSE_FIELDS.growthRate}
                                value={category.growthRate}
                                onChange={(e) => onUpdate(category.id, 'growthRate', e.target.value ? Number(e.target.value) : '')}
                            />
                        </div>

                        {/* Jumps Section */}
                        <div className="border-t border-gray-100 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                                    Expense Jumps 📈 <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Future changes</span>
                                </h3>
                                <Button variant="secondary" onClick={() => onAddJump(category.id)} className="text-xs bg-red-50 text-red-600 hover:bg-red-100">
                                    + Add Jump
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {category.jumps?.map((jump) => (
                                    <div key={jump.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg group hover:bg-gray-100 transition">
                                        <input
                                            type="text"
                                            value={jump.description}
                                            onChange={(e) => onUpdateJump(category.id, jump.id, 'description', e.target.value)}
                                            className="flex-1 bg-transparent border-none text-sm text-gray-900 focus:ring-0 p-0"
                                            placeholder="Description"
                                        />
                                        <div className="flex items-center bg-white rounded px-2 py-1 shadow-sm">
                                            <span className="text-xs text-gray-400 mr-1">Yr</span>
                                            <input
                                                type="number"
                                                value={jump.year}
                                                onChange={(e) => onUpdateJump(category.id, jump.id, 'year', e.target.value ? Number(e.target.value) : '')}
                                                className="w-12 text-xs text-right border-none p-0 focus:ring-0"
                                                placeholder="5"
                                            />
                                        </div>
                                        <div className="flex items-center bg-white rounded px-2 py-1 shadow-sm">
                                            <input
                                                type="number"
                                                value={jump.jumpPercent}
                                                onChange={(e) => onUpdateJump(category.id, jump.id, 'jumpPercent', e.target.value ? Number(e.target.value) : '')}
                                                className="w-10 text-xs text-right border-none p-0 focus:ring-0"
                                                placeholder="10"
                                            />
                                            <span className="text-xs text-gray-400 ml-1">%</span>
                                        </div>
                                        <button onClick={() => onRemoveJump(category.id, jump.id)} className="text-gray-400 hover:text-red-500 px-1 opacity-0 group-hover:opacity-100 transition">×</button>
                                    </div>
                                ))}
                                {(!category.jumps || category.jumps.length === 0) && (
                                    <div className="text-xs text-gray-400 italic pl-2">No future expense jumps added.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
