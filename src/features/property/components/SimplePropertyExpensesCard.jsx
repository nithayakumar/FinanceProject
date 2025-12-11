import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'


export function SimplePropertyExpensesCard({ details, onUpdate, mode }) {
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
        if (!amount) return null
        let annual = 0
        if (type === 'percent') {
            annual = baseValue * (Number(amount) / 100)
        } else {
            // Assume input is monthly if the prop is related to rental offset (based on user request), 
            // but for generic function we need context? 
            // The function is used for PMI and Ownership Expenses too which are usually Annual inputs in this simple form?
            // Actually, the previous implementation for dollar was:
            // "if (type !== 'percent') return null" -> wait, line 27 in previous view was:
            // "if (type !== 'percent' || !amount) return null"
            // So previously it ONLY showed calc for percent types!
            // Now we want to show it for Dollar types too IF it helps (e.g. "X/yr").

            // However, the USER SPECIFICALLY asked for "Monthly Rental Fees Avoided" as input.
            // So for Rental calc, if dollar, input = monthly. Annual = input * 12.
            // For others (PMI/Own), are they Monthly or Annual?
            // Look at lines 61, 99. OwnershipExpense placeholders suggest % (2.5) or $ (10000). $10000 is likely Annual.
            // PMI usually annual or monthly? "Mortgage Related Fees". $0/yr.

            // To be safe and minimal: I will ONLY modify the call site for rental? 
            // No, 'getCalculatedAmount' is a helper.
            // Let's modify the helper to take a 'isMonthlyInput' flag?
            // Or just check the type in the specific consts.
            return null // Default for dollar types unless handled below
        }

        const monthly = annual / 12
        return `${Math.round(annual).toLocaleString()}/yr ($${Math.round(monthly).toLocaleString()}/mo)`
    }

    // Custom calc for Rental (Dollar = Monthly)
    const getRentalCalc = (type, amount) => {
        if (!amount) return null
        let annual = 0
        let monthly = 0

        if (type === 'percent') {
            annual = baseValue * (Number(amount) / 100)
            monthly = annual / 12
        } else {
            // Input is Monthly
            monthly = Number(amount)
            annual = monthly * 12
        }
        return `${Math.round(annual).toLocaleString()}/yr ($${Math.round(monthly).toLocaleString()}/mo)`
    }

    const pmiCalc = getCalculatedAmount(details.pmiType, details.pmiAmount)
    const ownCalc = getCalculatedAmount(details.ownershipExpenseType, details.ownershipExpenseAmount)
    const rentalCalc = getRentalCalc(details.rentalIncomeOffsetType, details.rentalIncomeOffsetAmount)

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

                {/* Group 2: Home Ownership Costs (Only for Buy mode) */}
                {mode === 'buy' && (
                    <>
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

                        <div className="h-px bg-gray-50 w-full" />
                    </>
                )}

                {/* Group 3: Monthly Rental Fees Avoided (Only for Buy mode) */}
                {mode === 'buy' && (
                    <div className="flex items-start justify-between group">
                        <div>
                            <div className="font-semibold text-gray-900 text-sm">Monthly Rental Fees Avoided</div>
                            <div className="text-xs text-gray-500 mt-0.5">Rent and related fees that are no longer relevant (adjusts with inflation)</div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Toggle
                                value={details.rentalIncomeOffsetType || 'dollar'}
                                onChange={val => onUpdate('rentalIncomeOffsetType', val)}
                                options={[
                                    { value: 'dollar', label: '$ Fixed' },
                                    { value: 'percent', label: '% Value' }
                                ]}
                            />
                            <div className="w-28">
                                <Input
                                    value={details.rentalIncomeOffsetAmount}
                                    onChange={val => onUpdate('rentalIncomeOffsetAmount', val)}
                                    prefix={details.rentalIncomeOffsetType === 'dollar' ? '$' : undefined}
                                    suffix={details.rentalIncomeOffsetType === 'percent' ? '%' : undefined}
                                    placeholder="0"
                                    className="bg-gray-50 !p-2 !text-sm text-right"
                                />
                                {rentalCalc && (
                                    <div className="text-[10px] text-gray-400 text-right mt-1 pr-1 font-medium">
                                        ≈ ${rentalCalc}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card >
    )
}
