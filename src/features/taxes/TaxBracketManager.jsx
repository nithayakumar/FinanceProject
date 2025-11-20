import { useEffect, useState } from 'react'
import {
  initializeTaxLadders,
  getAllLadderData,
  getTaxTypesForJurisdiction,
  getFilingStatusesForTaxType
} from './csvTaxLadders'

function TaxBracketManager() {
  const [ladderData, setLadderData] = useState(null)
  const [regionType, setRegionType] = useState('states') // 'states' or 'countries'
  const [selectedState, setSelectedState] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedTaxType, setSelectedTaxType] = useState('')
  const [selectedFilingStatus, setSelectedFilingStatus] = useState('')

  useEffect(() => {
    initializeTaxLadders()
    const data = getAllLadderData()
    setLadderData(data)

    if (data?.metadata?.states?.length) {
      const firstState = data.metadata.states[0]
      setSelectedState(firstState)
      updateDefaults('states', firstState)
    }

    if (data?.metadata?.countries?.length) {
      const firstCountry = data.metadata.countries[0]
      setSelectedCountry(firstCountry)
      if (regionType === 'countries') {
        updateDefaults('countries', firstCountry)
      }
    }
  }, [])

  const isStateView = regionType === 'states'
  const regionKey = isStateView ? 'State_Province' : 'Federal'
  const jurisdictionOptions = isStateView
    ? (ladderData?.metadata?.states || [])
    : (ladderData?.metadata?.countries || [])
  const jurisdiction = isStateView ? selectedState : selectedCountry

  const updateDefaults = (scope, jurisdictionValue) => {
    if (!jurisdictionValue) {
      setSelectedTaxType('')
      setSelectedFilingStatus('')
      return
    }

    const taxTypes = getTaxTypesForJurisdiction(
      scope === 'states' ? 'State_Province' : 'Federal',
      jurisdictionValue
    )
    const nextTaxType = taxTypes[0] || ''
    setSelectedTaxType(nextTaxType)

    const statuses = nextTaxType
      ? getFilingStatusesForTaxType(
          scope === 'states' ? 'State_Province' : 'Federal',
          jurisdictionValue,
          nextTaxType
        )
      : []
    setSelectedFilingStatus(statuses[0] || '')
  }

  const handleRegionChange = (value) => {
    setRegionType(value)
    if (value === 'states') {
      const defaultState = ladderData?.metadata?.states?.[0] || ''
      setSelectedState(defaultState)
      updateDefaults('states', defaultState)
    } else {
      const defaultCountry = ladderData?.metadata?.countries?.[0] || ''
      setSelectedCountry(defaultCountry)
      updateDefaults('countries', defaultCountry)
    }
  }

  const handleJurisdictionChange = (value) => {
    if (isStateView) {
      setSelectedState(value)
      updateDefaults('states', value)
    } else {
      setSelectedCountry(value)
      updateDefaults('countries', value)
    }
  }

  const handleTaxTypeChange = (value) => {
    setSelectedTaxType(value)
    if (!jurisdiction) return
    const statuses = getFilingStatusesForTaxType(regionKey, jurisdiction, value)
    setSelectedFilingStatus(statuses[0] || '')
  }

  const availableTaxTypes = jurisdiction
    ? getTaxTypesForJurisdiction(regionKey, jurisdiction)
    : []
  const availableFilingStatuses =
    jurisdiction && selectedTaxType
      ? getFilingStatusesForTaxType(regionKey, jurisdiction, selectedTaxType)
      : []

  const ladder = (() => {
    if (!ladderData || !jurisdiction || !selectedTaxType || !selectedFilingStatus) return null
    const key = `${regionKey}_${jurisdiction}_${selectedTaxType}_${selectedFilingStatus}`
    return ladderData.ladders[key]
  })()

  const renderSelectors = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">View Tax Ladder</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Region Type</label>
          <select
            value={regionType}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="states">States / Provinces</option>
            <option value="countries">Countries / Federal</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isStateView ? 'State / Province' : 'Country'}
          </label>
          <select
            value={jurisdiction}
            onChange={(e) => handleJurisdictionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {jurisdictionOptions.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tax Type</label>
          <select
            value={selectedTaxType}
            onChange={(e) => handleTaxTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {availableTaxTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filing Status</label>
          <select
            value={selectedFilingStatus}
            onChange={(e) => setSelectedFilingStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={availableFilingStatuses.length === 0}
          >
            {availableFilingStatuses.length === 0 ? (
              <option value="">Not available</option>
            ) : (
              availableFilingStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))
            )}
          </select>
        </div>
      </div>
    </div>
  )

  const renderLadder = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {ladder ? (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {jurisdiction} • {selectedTaxType}
              </h3>
              <p className="text-sm text-gray-600">Filing Status: {selectedFilingStatus}</p>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
              {ladder.brackets.length} brackets
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Bracket</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Min Income</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Max Income</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Rate</th>
                </tr>
              </thead>
              <tbody>
                {ladder.brackets.map((bracket, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-2 text-sm text-gray-600">{bracket.step || index + 1}</td>
                    <td className="py-3 px-2 text-sm">${Math.round(bracket.min).toLocaleString()}</td>
                    <td className="py-3 px-2 text-sm">
                      {bracket.max === 99999999 ? '∞' : `$${Math.round(bracket.max).toLocaleString()}`}
                    </td>
                    <td className="py-3 px-2 text-sm text-right font-medium">
                      {(bracket.rate * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No ladder found for this combination</p>
          <p className="text-sm mt-1">Try selecting a different tax type or filing status</p>
        </div>
      )}
    </div>
  )

  if (!ladderData) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <p className="text-center text-gray-500">Loading tax ladders...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tax Ladders</h1>
          <p className="text-gray-600">Browse federal and state/provincial tax brackets sourced from the master CSV</p>
        </div>
      </div>

      {renderSelectors()}
      {renderLadder()}

      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p>
          <span className="font-semibold">Available jurisdictions:</span>{' '}
          {ladderData.metadata.states.length} states/provinces • {ladderData.metadata.countries.length} countries •{' '}
          {ladderData.metadata.taxTypes.length} tax types
        </p>
      </div>
    </div>
  )
}

export default TaxBracketManager
