import React from 'react'
import { getFilingStatusLabel } from '../hooks/useTaxData'

export function TaxMappingNotification({
    filingStatus,
    state,
    country,
    filingStatusRemap,
    missingFilingStatus
}) {
    // No notification if there's a missing status warning (handled by TaxSettings)
    if (missingFilingStatus) {
        return null
    }

    // Show remapping notification if a remap is active
    if (filingStatusRemap && filingStatusRemap !== filingStatus) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Using Override</h3>
                        <p className="mt-1 text-sm text-blue-700">
                            Filing status is <span className="font-semibold">{getFilingStatusLabel(filingStatus)}</span>, but using <span className="font-semibold">{getFilingStatusLabel(filingStatusRemap)}</span> brackets for calculations.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // Show success notification
    return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Tax Brackets Found</h3>
                    <p className="mt-1 text-sm text-green-700">
                        Using <span className="font-semibold">{getFilingStatusLabel(filingStatus)}</span> brackets for {state}, {country}.
                    </p>
                </div>
            </div>
        </div>
    )
}
