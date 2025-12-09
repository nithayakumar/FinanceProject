import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SplitLayout from '../../shared/components/SplitLayout'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { usePropertyData } from './hooks/usePropertyData'
import { PropertySelectionCard } from './components/PropertySelectionCard'
import { PropertyDetailsOwnCard } from './components/PropertyDetailsOwnCard'
import { PropertyDetailsBuyCard } from './components/PropertyDetailsBuyCard'
import { HousingExpensesCard } from './components/HousingExpensesCard'
import { HousingExpenseChangeCard } from './components/HousingExpenseChangeCard'
import { SimplePropertyExpensesCard } from './components/SimplePropertyExpensesCard'
import { PropertyChart } from './components/PropertyChart'
import { PropertySummary } from './components/PropertySummary'
import { PROPERTY_MODES } from './config/propertySchema'

function Property() {
    const navigate = useNavigate()
    const { data, expensesData, projections, actions } = usePropertyData()
    const [viewMode, setViewMode] = useState('nominal') // 'nominal' or 'PV' (real)

    // housing category helper
    const housingCategory = expensesData.expenseCategories.find(c => c.id === 'housing')

    const InputSection = (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Property & Home 🏡</h1>
            </div>

            <div className="space-y-6">
                <PropertySelectionCard
                    mode={data.mode}
                    onChange={actions.updateMode}
                />

                {data.mode === PROPERTY_MODES.OWN && (
                    <PropertyDetailsOwnCard
                        details={data.details}
                        onUpdate={actions.updateDetails}
                    />
                )}

                {data.mode === PROPERTY_MODES.BUY && (
                    <PropertyDetailsBuyCard
                        details={data.details}
                        onUpdate={actions.updateDetails}
                    />
                )}

                {/* EXPENSE CARDS */}
                {data.mode !== PROPERTY_MODES.NONE && (
                    <>
                        {!expensesData.simpleMode && housingCategory ? (
                            <>
                                <HousingExpensesCard
                                    housingCategory={housingCategory}
                                    onUpdate={(field, val) => actions.updateHousingExpense(field, val)}
                                />
                                <HousingExpenseChangeCard
                                    housingCategory={housingCategory}
                                    actions={{
                                        onAddJump: actions.updateHousingJumps,
                                        onUpdateJump: actions.updateHousingJumps,
                                        onRemoveJump: actions.updateHousingJumps
                                    }}
                                />
                            </>
                        ) : (
                            <SimplePropertyExpensesCard
                                details={data.details}
                                onUpdate={actions.updateDetails}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    )

    const OutputSection = (
        <div className="h-full flex flex-col space-y-6">
            <div className="space-y-6">
                {data.mode === PROPERTY_MODES.NONE ? (
                    <div className="flex items-center justify-center h-64 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 px-6 text-center">
                        If you own or are planning to buy a home, use this to determine the impact to your net worth.
                    </div>
                ) : (
                    <>
                        {/* Metrics & Toggles matches Investments Layout */}
                        <div className="flex justify-end">
                            <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                                <button
                                    onClick={() => setViewMode('nominal')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'nominal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Future Dollars
                                </button>
                                <button
                                    onClick={() => setViewMode('PV')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'PV' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Today's Dollars
                                </button>
                            </div>
                        </div>

                        <PropertySummary data={projections} viewMode={viewMode} mode={data.mode} />
                        <PropertyChart data={projections} viewMode={viewMode} />
                    </>
                )}
            </div>

            <div className="pt-4 pb-4">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm text-lg"
                >
                    Continue to Dashboard →
                </button>
            </div>
        </div>
    )
    return <SplitLayout inputSection={InputSection} outputSection={OutputSection} />
}

export default Property
