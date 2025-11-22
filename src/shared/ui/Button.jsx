import React from 'react'

export function Button({
    children,
    variant = 'primary',
    className = '',
    onClick,
    type = 'button',
    ...props
}) {
    const baseStyles = "rounded-full text-sm font-medium transition shadow-sm flex items-center justify-center"

    const variants = {
        primary: "bg-black text-white px-4 py-2 hover:bg-gray-800",
        secondary: "bg-gray-100 text-gray-600 px-3 py-1.5 hover:bg-gray-200",
        danger: "text-gray-400 hover:text-red-500 p-1",
        ghost: "text-gray-600 hover:text-gray-900",
        link: "text-blue-600 hover:text-blue-700 underline"
    }

    return (
        <button
            type={type}
            onClick={onClick}
            className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
