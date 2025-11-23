import React from 'react'
import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'

export function CashCard({ data, onUpdate, errors }) {
    return (
        <Card className="h-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash on Hand 💵</h3>
            <div className="space-y-4">
                <Input
                    label="Current Cash"
                    prefix="$"
                    value={data.currentCash}
                    onChange={(val) => onUpdate('currentCash', val ? Number(val) : '')}
                    placeholder="50000"
                    className={errors.currentCash ? 'border-red-500' : ''}
                />
                <Input
                    label="Target Cash"
                    prefix="$"
                    value={data.targetCash}
                    onChange={(val) => onUpdate('targetCash', val ? Number(val) : '')}
                    placeholder="100000"
                    className={errors.targetCash ? 'border-red-500' : ''}
                />
            </div>
        </Card>
    )
}
