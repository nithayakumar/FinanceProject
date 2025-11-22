import React from 'react'

export function Card({ children, className = '', ...props }) {
    return (
        <div
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md ${className}`}
            {...props}
        >
            {children}
        </div>
    )
}
