import React from 'react'
import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'
import { Button } from '../../../shared/ui/Button'
import { INCOME_FIELDS } from '../config/incomeSchema'

export function IncomeStreamCard({
    stream,
    isExpanded,
    onToggleExpand,
    onUpdate,
    onRemove,
    canRemove,
    onAddJump,
    onUpdateJump,
    onRemoveJump,
    onAddBreak,
    onUpdateBreak,
    onRemoveBreak,
    yearsToRetirement
}) {
    return (
        <Card>
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1 mr-4">
                    <Input
                        {...INCOME_FIELDS.name}
                        value={stream.name}
                        onChange={(val) => onUpdate(stream.id, 'name', val)}
                        className="bg-transparent border-none p-0"
                    />
                </div>
                {canRemove && (
                    <Button variant="danger" onClick={() => onRemove(stream.id)} title="Remove Stream">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Input
                    {...INCOME_FIELDS.annualIncome}
                    value={stream.annualIncome}
                    onChange={(val) => onUpdate(stream.id, 'annualIncome', val ? Number(val) : '')}
                />
                <Input
                    {...INCOME_FIELDS.individual401k}
                    value={stream.individual401k}
                    onChange={(val) => onUpdate(stream.id, 'individual401k', val ? Number(val) : '')}
                />
            </div>

            <div>
                <button
                    onClick={() => onToggleExpand(stream.id)}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 font-medium group"
                >
                    <div className={`mr-2 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-200 transition ${isExpanded ? 'rotate-90' : ''}`}>
                        ▶
                    </div>
                    More detail (Growth, Equity, Jumps & Breaks)
                </button>

                {isExpanded && (
                    <div className="mt-4 pl-2 space-y-6 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                {...INCOME_FIELDS.growthRate}
                                value={stream.growthRate}
                                onChange={(val) => onUpdate(stream.id, 'growthRate', val ? Number(val) : '')}
                            />
                            <Input
                                {...INCOME_FIELDS.equity}
                                value={stream.equity}
                                onChange={(val) => onUpdate(stream.id, 'equity', val ? Number(val) : '')}
                            />
                            <Input
                                {...INCOME_FIELDS.company401k}
                                value={stream.company401k}
                                onChange={(val) => onUpdate(stream.id, 'company401k', val ? Number(val) : '')}
                            />
                            <Input
                                {...INCOME_FIELDS.endWorkYear}
                                value={stream.endWorkYear}
                                onChange={(val) => onUpdate(stream.id, 'endWorkYear', val ? Number(val) : '')}
                                placeholder={yearsToRetirement.toString()}
                            />
                        </div>

                        {/* Jumps Section */}
                        <div className="border-t border-gray-100 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                                    Income Jumps 🚀 <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Future changes</span>
                                </h3>
                                <Button variant="secondary" onClick={() => onAddJump(stream.id)} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100">
                                    + Add Jump
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {stream.jumps?.map((jump) => (
                                    <div key={jump.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg group hover:bg-gray-100 transition">
                                        <input
                                            type="text"
                                            value={jump.description}
                                            onChange={(e) => onUpdateJump(stream.id, jump.id, 'description', e.target.value)}
                                            className="flex-1 bg-transparent border-none text-sm text-gray-900 focus:ring-0 p-0"
                                            placeholder="Description"
                                        />
                                        <div className="flex items-center bg-white rounded px-2 py-1 shadow-sm">
                                            <span className="text-xs text-gray-400 mr-1">Yr</span>
                                            <input
                                                type="number"
                                                value={jump.year}
                                                onChange={(e) => onUpdateJump(stream.id, jump.id, 'year', e.target.value ? Number(e.target.value) : '')}
                                                className="w-12 text-xs text-right border-none p-0 focus:ring-0"
                                                placeholder="5"
                                            />
                                        </div>
                                        <div className="flex items-center bg-white rounded px-2 py-1 shadow-sm">
                                            <input
                                                type="number"
                                                value={jump.jumpPercent}
                                                onChange={(e) => onUpdateJump(stream.id, jump.id, 'jumpPercent', e.target.value ? Number(e.target.value) : '')}
                                                className="w-10 text-xs text-right border-none p-0 focus:ring-0"
                                                placeholder="10"
                                            />
                                            <span className="text-xs text-gray-400 ml-1">%</span>
                                        </div>
                                        <button onClick={() => onRemoveJump(stream.id, jump.id)} className="text-gray-400 hover:text-red-500 px-1 opacity-0 group-hover:opacity-100 transition">×</button>
                                    </div>
                                ))}
                                {(!stream.jumps || stream.jumps.length === 0) && (
                                    <div className="text-xs text-gray-400 italic pl-2">No future income jumps added.</div>
                                )}
                            </div>
                        </div>

                        {/* Breaks Section */}
                        <div className="border-t border-gray-100 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                                    Career Breaks ⏸️ <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Gaps in income</span>
                                </h3>
                                <Button variant="secondary" onClick={() => onAddBreak(stream.id)} className="text-xs bg-orange-50 text-orange-600 hover:bg-orange-100">
                                    + Add Break
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {stream.careerBreaks?.map((breakItem) => (
                                    <div key={breakItem.id} className="flex flex-col gap-2 bg-orange-50/50 p-3 rounded-lg group hover:bg-orange-50 transition border border-orange-100/50">
                                        <div className="flex justify-between items-center">
                                            <input
                                                type="text"
                                                value={breakItem.description}
                                                onChange={(e) => onUpdateBreak(stream.id, breakItem.id, 'description', e.target.value)}
                                                className="bg-transparent border-none text-sm text-gray-900 focus:ring-0 p-0 font-medium w-full"
                                                placeholder="Description"
                                            />
                                            <button onClick={() => onRemoveBreak(stream.id, breakItem.id)} className="text-gray-400 hover:text-red-500 px-1 opacity-0 group-hover:opacity-100 transition">×</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex items-center bg-white rounded px-2 py-1 shadow-sm">
                                                <span className="text-xs text-gray-400 mr-1">Start Yr</span>
                                                <input
                                                    type="number"
                                                    value={breakItem.startYear}
                                                    onChange={(e) => onUpdateBreak(stream.id, breakItem.id, 'startYear', e.target.value ? Number(e.target.value) : '')}
                                                    className="w-full text-xs text-right border-none p-0 focus:ring-0"
                                                />
                                            </div>
                                            <div className="flex-1 flex items-center bg-white rounded px-2 py-1 shadow-sm">
                                                <span className="text-xs text-gray-400 mr-1">Months</span>
                                                <input
                                                    type="number"
                                                    value={breakItem.durationMonths}
                                                    onChange={(e) => onUpdateBreak(stream.id, breakItem.id, 'durationMonths', e.target.value ? Number(e.target.value) : '')}
                                                    className="w-full text-xs text-right border-none p-0 focus:ring-0"
                                                />
                                            </div>
                                            <div className="flex-1 flex items-center bg-white rounded px-2 py-1 shadow-sm">
                                                <span className="text-xs text-gray-400 mr-1">Pay %</span>
                                                <input
                                                    type="number"
                                                    value={breakItem.reductionPercent}
                                                    onChange={(e) => onUpdateBreak(stream.id, breakItem.id, 'reductionPercent', e.target.value ? Number(e.target.value) : '')}
                                                    className="w-full text-xs text-right border-none p-0 focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!stream.careerBreaks || stream.careerBreaks.length === 0) && (
                                    <div className="text-xs text-gray-400 italic pl-2">No career breaks added.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
