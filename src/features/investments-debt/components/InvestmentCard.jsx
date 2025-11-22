import React from 'react'
import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'
import { Button } from '../../../shared/ui/Button'
import { INVESTMENT_FIELDS } from '../config/investmentsSchema'

export function InvestmentCard({
    investment,
    index,
    onUpdate,
    onRemove,
    canRemove
}) {
    return (
        <Card>
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Investment {index + 1}</h3>
                {canRemove && (
                    <Button variant="danger" onClick={() => onRemove(investment.id)} title="Remove Investment">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    {...INVESTMENT_FIELDS.currentBalance}
                    value={investment.currentValue}
                    onChange={(e) => onUpdate(investment.id, 'currentValue', e.target.value ? Number(e.target.value) : '')}
                />
                <Input
                    {...INVESTMENT_FIELDS.growthRate}
                    value={investment.growthRate}
                    onChange={(e) => onUpdate(investment.id, 'growthRate', e.target.value ? Number(e.target.value) : '')}
                />
            </div>
        </Card>
    )
}
