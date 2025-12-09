import { Card } from '../../../shared/ui/Card'
import { PROPERTY_MODES } from '../config/propertySchema'

export function PropertySelectionCard({ mode, onChange }) {
    return (
        <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Plan 🏠</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => onChange(PROPERTY_MODES.OWN)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${mode === PROPERTY_MODES.OWN
                        ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                        : 'border-gray-200 hover:border-blue-300'
                        }`}
                >
                    <div className="font-semibold text-gray-900">I own a home</div>
                    <div className="text-sm text-gray-500 mt-1">Track equity and mortgage payoff</div>
                </button>

                <button
                    onClick={() => onChange(PROPERTY_MODES.BUY)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${mode === PROPERTY_MODES.BUY
                        ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                        : 'border-gray-200 hover:border-blue-300'
                        }`}
                >
                    <div className="font-semibold text-gray-900">I'm buying a home</div>
                    <div className="text-sm text-gray-500 mt-1">Plan for purchase and mortgage</div>
                </button>

                <button
                    onClick={() => onChange(PROPERTY_MODES.NONE)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${mode === PROPERTY_MODES.NONE
                        ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                        : 'border-gray-200 hover:border-blue-300'
                        }`}
                >
                    <div className="font-semibold text-gray-900">No plans to buy</div>
                    <div className="text-sm text-gray-500 mt-1">Just renting or other living arrangements</div>
                </button>
            </div>
        </Card>
    )
}
