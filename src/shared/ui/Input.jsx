import React from 'react'

export function Input({
    label,
    value,
    onChange,
    type = 'text',
    placeholder = '',
    prefix,
    suffix,
    className = '',
    tooltip,
    ...props
}) {
    return (
        <div className={`bg-gray-50 rounded-xl p-3 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-colors ${className}`}>
            {label && (
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    {label}
                    {tooltip && (
                        <span title={tooltip} className="cursor-help text-gray-400 hover:text-gray-600">ⓘ</span>
                    )}
                </label>
            )}
            <div className="flex items-center relative">
                {prefix && <span className="text-gray-400 text-sm mr-1">{prefix}</span>}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none p-0 text-gray-900 font-medium focus:ring-0 placeholder-gray-300"
                    {...props}
                />
                {suffix && <span className="text-gray-400 text-sm ml-1">{suffix}</span>}
            </div>
        </div>
    )
}
