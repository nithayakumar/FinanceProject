import { useMemo } from 'react'
import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'
import { PROPERTY_FIELDS } from '../config/propertySchema'
import { calculateRemainingTerm } from '../Property.calc'

export function PropertyDetailsOwnCard({ details, onUpdate }) {
    const { years, months, valid } = useMemo(() => {
        const result = calculateRemainingTerm(Number(details.mortgageRemaining), Number(details.monthlyPayment))
        return result || { years: 0, months: 0, valid: false }
    }, [details.mortgageRemaining, details.monthlyPayment])

    return (
        <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Home Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                    {...PROPERTY_FIELDS.homeValue}
                    value={details.homeValue}
                    onChange={val => onUpdate('homeValue', val)}
                />
                <Input
                    {...PROPERTY_FIELDS.growthRate}
                    value={details.growthRate}
                    onChange={val => onUpdate('growthRate', val)}
                />
                <Input
                    {...PROPERTY_FIELDS.mortgageRemaining}
                    value={details.mortgageRemaining}
                    onChange={val => onUpdate('mortgageRemaining', val)}
                />
                <Input
                    {...PROPERTY_FIELDS.monthlyPayment}
                    value={details.monthlyPayment}
                    onChange={val => onUpdate('monthlyPayment', val)}
                />

                <div className="md:col-span-2 bg-gray-50 p-4 rounded-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Term Remaining</label>
                    <div className="text-lg font-medium text-gray-900">
                        {valid ? (
                            daysToYearsAndMonths(years, months)
                        ) : (
                            <span className="text-gray-400">Enter mortgage details to calculate</span>
                        )}
                        {valid && years === 99 && <span className="text-red-500 text-sm ml-2">(Payment too low to cover interest)</span>}
                    </div>
                </div>
            </div>
        </Card>
    )
}

function daysToYearsAndMonths(years, months) {
    if (years === 0 && months === 0) return '0 months'
    const y = years > 0 ? `${years} year${years !== 1 ? 's' : ''}` : ''
    const m = months > 0 ? `${months} month${months !== 1 ? 's' : ''}` : ''
    return [y, m].filter(Boolean).join(', ')
}
