import React from 'react'
import { Card } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'

export function Retirement401kCard({ data, onUpdate, errors }) {
    return (
        <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">401(k) Retirement Account 🏦</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                    label="Individual Limit (2025)"
                    prefix="$"
                    value={data.individualLimit}
                    onChange={(e) => onUpdate('individualLimit', e.target.value ? Number(e.target.value) : '')}
                    placeholder="23500"
                    className={errors['401k-individualLimit'] ? 'border-red-500' : ''}
                />
                <Input
                    label="Annual Limit Growth"
                    suffix="%"
                    value={data.limitGrowth}
                    onChange={(e) => onUpdate('limitGrowth', e.target.value ? Number(e.target.value) : '')}
                    placeholder="3.0"
                    step="0.1"
                    className={errors['401k-limitGrowth'] ? 'border-red-500' : ''}
                />
                <Input
                    label="Company Match (Annual)"
                    prefix="$"
                    value={data.companyContribution}
                    disabled
                    className="bg-gray-50 text-gray-600"
                    tooltip="Calculated from Income section"
                />
                <Input
                    label="Current 401(k) Value"
                    prefix="$"
                    value={data.currentValue}
                    onChange={(e) => onUpdate('currentValue', e.target.value ? Number(e.target.value) : '')}
                    placeholder="250000"
                    className={errors['401k-currentValue'] ? 'border-red-500' : ''}
                />
                <Input
                    label="401(k) Growth Rate"
                    suffix="%"
                    value={data.growthRate}
                    onChange={(e) => onUpdate('growthRate', e.target.value ? Number(e.target.value) : '')}
                    placeholder="7.0"
                    step="0.1"
                    className={errors['401k-growthRate'] ? 'border-red-500' : ''}
                />
            </div>
        </Card>
    )
}
