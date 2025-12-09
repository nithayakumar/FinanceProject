export function Select({
    label,
    value,
    onChange,
    options = [],
    className = '',
    id,
    helperText,
    error,
    disabled = false,
    required = false
}) {
    const inputId = id || `select-${Math.random().toString(36).substr(2, 9)}`

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative rounded-md shadow-sm">
                <select
                    id={inputId}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`
            block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm
            ${error ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}
          `}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
            {(error || helperText) && (
                <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
                    {error || helperText}
                </p>
            )}
        </div>
    )
}
