import { useMemo } from 'react'
import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'
import { Select } from '../../../shared/ui/Select'
import { PROPERTY_FIELDS, MORTGAGE_TERM_OPTIONS } from '../config/propertySchema'
import { calculateMonthlyPayment } from '../Property.calc'

export function PropertyDetailsBuyCard({ details, onUpdate }) {
    const estimatedPayment = useMemo(() => {
        const price = Number(details.homePrice) || 0
        let down = Number(details.downPayment) || 0

        if (details.downPaymentType === 'percent') {
            down = price * (down / 100)
        }

        const loan = Math.max(0, price - down)
        return calculateMonthlyPayment(loan, Number(details.mortgageRate), Number(details.term))
    }, [details])

    return (
        <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Row 1: Home Price & Purchase Year */}
                <Input
                    {...PROPERTY_FIELDS.homePrice}
                    value={details.homePrice}
                    onChange={val => onUpdate('homePrice', val)}
                />
                <Input
                    {...PROPERTY_FIELDS.purchaseYear}
                    value={details.purchaseYear}
                    onChange={val => onUpdate('purchaseYear', val)}
                />

                {/* Row 2: Down Payment & Growth Rate */}
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">{PROPERTY_FIELDS.downPayment.label}</label>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <Input
                                value={details.downPayment}
                                onChange={val => onUpdate('downPayment', val)}
                                placeholder="0"
                                type="number"
                                prefix={details.downPaymentType === 'dollar' ? '$' : undefined}
                                suffix={details.downPaymentType === 'percent' ? '%' : undefined}
                                className="w-full"
                            />
                        </div>
                        <div className="flex bg-gray-100 rounded-lg p-1 h-[42px] items-center shrink-0">
                            <button
                                onClick={() => onUpdate('downPaymentType', 'percent')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all h-full ${details.downPaymentType === 'percent'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                %
                            </button>
                            <button
                                onClick={() => onUpdate('downPaymentType', 'dollar')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all h-full ${details.downPaymentType === 'dollar'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                $
                            </button>
                        </div>
                    </div>
                </div>
                <Input
                    {...PROPERTY_FIELDS.growthRate}
                    value={details.growthRate}
                    onChange={val => onUpdate('growthRate', val)}
                />

                {/* Row 3: Mortgage Rate & Mortgage Term */}
                <Input
                    {...PROPERTY_FIELDS.mortgageRate}
                    value={details.mortgageRate}
                    onChange={val => onUpdate('mortgageRate', val)}
                />
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Mortgage Term</label>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {MORTGAGE_TERM_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => onUpdate('term', option.value)}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${details.term === option.value
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                {option.value}y
                            </button>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-2 bg-blue-50 p-4 rounded-md border border-blue-100 mt-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-900">Estimated Monthly Payment (Principal + Interest)</span>
                        <span className="text-xl font-bold text-blue-700">
                            ${Math.round(estimatedPayment).toLocaleString()}
                        </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                        *Does not include taxes or insurance calculated in expenses
                    </p>
                </div>
            </div >
        </Card >
    )
}
