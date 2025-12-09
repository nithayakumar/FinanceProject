import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'


export function SimplePropertyExpensesCard({ details, onUpdate }) {
    // Current Home Value (or Purchase Price) to base percentages on
    const baseValue = Number(details.homeValue || details.homePrice || 0)

    const Toggle = ({ value, onChange, options }) => (
        <div className="flex bg-gray-100 p-0.5 rounded-lg inline-flex items-center">
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${value === opt.value
                        ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-100'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    )

    const getCalculatedAmount = (type, amount) => {
        if (type !== 'percent' || !amount) return null
        const annual = baseValue * (Number(amount) / 100)
        const monthly = annual / 12
        return `${Math.round(annual).toLocaleString()}/yr ($${Math.round(monthly).toLocaleString()}/mo)`
    }

    const pmiCalc = getCalculatedAmount(details.pmiType, details.pmiAmount)
    const ownCalc = getCalculatedAmount(details.ownershipExpenseType, details.ownershipExpenseAmount)

    return (
        <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Property Related Expenses</h3>

            <div className="space-y-6">
                {/* Group 1: Mortgage Related Fees */}
                <div className="flex items-start justify-between group">
                    <div>
                        <div className="font-semibold text-gray-900 text-sm">Mortgage Related Fees</div>
                        <div className="text-xs text-gray-500 mt-0.5">Costs (like PMI) incurred during the mortgage term</div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Toggle
                            value={details.pmiType || 'dollar'}
                            onChange={val => onUpdate('pmiType', val)}
                            options={[
                                { value: 'dollar', label: '$ Fixed' },
                                { value: 'percent', label: '% Value' }
                            ]}
                        />
                        <div className="w-28">
                            <Input
                                value={details.pmiAmount}
                                onChange={val => onUpdate('pmiAmount', val)}
                                prefix={details.pmiType === 'dollar' ? '$' : undefined}
                                suffix={details.pmiType === 'percent' ? '%' : undefined}
                                placeholder="0"
                                className="bg-gray-50 !p-2 !text-sm text-right"
                            />
                            {pmiCalc && (
                                <div className="text-[10px] text-gray-400 text-right mt-1 pr-1 font-medium">
                                    ≈ ${pmiCalc}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-50 w-full" />

                {/* Group 2: Home Ownership Costs */}
                <div className="flex items-start justify-between group">
                    <div>
                        <div className="font-semibold text-gray-900 text-sm">Home Ownership Costs</div>
                        <div className="text-xs text-gray-500 mt-0.5">Costs (like tax and maintenance) incurred forever</div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Toggle
                            value={details.ownershipExpenseType || 'percent'}
                            onChange={val => onUpdate('ownershipExpenseType', val)}
                            options={[
                                { value: 'dollar', label: '$ Fixed' },
                                { value: 'percent', label: '% Value' }
                            ]}
                        />
                        <div className="w-28">
                            <Input
                                value={details.ownershipExpenseAmount}
                                onChange={val => onUpdate('ownershipExpenseAmount', val)}
                                prefix={details.ownershipExpenseType === 'dollar' ? '$' : undefined}
                                suffix={details.ownershipExpenseType === 'percent' ? '%' : undefined}
                                placeholder={details.ownershipExpenseType === 'percent' ? '2.5' : '10000'}
                                className="bg-gray-50 !p-2 !text-sm text-right"
                            />
                            {ownCalc && (
                                <div className="text-[10px] text-gray-400 text-right mt-1 pr-1 font-medium">
                                    ≈ ${ownCalc}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card >
    )
}
