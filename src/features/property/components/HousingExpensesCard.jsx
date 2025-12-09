import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'

export function HousingExpensesCard({ housingCategory, onUpdate }) {
    if (!housingCategory) return null

    return (
        <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Housing Expenses 🏠</h2>
                    <p className="text-xs bg-green-100 text-green-800 px-2 py-0.5 mt-1 rounded-full w-fit font-medium">Synced with Expenses</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg w-1/5">Category</th>
                            <th className="px-4 py-3 w-1/4">Type</th>
                            <th className="px-4 py-3 w-1/4">Yearly Expense</th>
                            <th className="px-4 py-3 rounded-r-lg w-1/4">Yearly Growth</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-white border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900 text-sm">
                                {housingCategory.name}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
                                    <button
                                        onClick={() => onUpdate('amountType', 'fixed')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${housingCategory.amountType === 'fixed'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                    >
                                        $ Fixed
                                    </button>
                                    <button
                                        onClick={() => onUpdate('amountType', 'percent')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${housingCategory.amountType === 'percent'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                    >
                                        % Income
                                    </button>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                {housingCategory.amountType === 'fixed' ? (
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={housingCategory.annualAmount}
                                            onChange={(val) => onUpdate('annualAmount', val)}
                                            prefix="$"
                                            placeholder="0"
                                            className="w-full max-w-[180px]"
                                        />
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={housingCategory.percentOfIncome}
                                            onChange={(val) => onUpdate('percentOfIncome', val)}
                                            suffix="%"
                                            placeholder="0"
                                            step="0.1"
                                            className="w-full max-w-[140px]"
                                        />
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                {housingCategory.amountType === 'fixed' ? (
                                    <Input
                                        type="number"
                                        value={housingCategory.growthRate}
                                        onChange={(val) => onUpdate('growthRate', val)}
                                        suffix="%"
                                        placeholder="2.7"
                                        step="0.1"
                                        className="w-24"
                                    />
                                ) : (
                                    <span className="text-xs text-gray-500 italic">Tied to income</span>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
