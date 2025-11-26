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
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-amber-800">Filing Status Remapped</h3>
                        <p className="mt-1 text-sm text-amber-700">
                            Tax brackets for <span className="font-semibold">{getFilingStatusLabel(filingStatus)}</span> are not available in {state}.
                            Using <span className="font-semibold">{getFilingStatusLabel(filingStatusRemap)}</span> brackets instead.
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
