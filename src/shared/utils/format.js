export const formatCompactNumber = (number) => {
    if (number === 0) return '$0'

    const absNumber = Math.abs(number)
    const sign = number < 0 ? '-' : ''

    if (absNumber >= 1000000) {
        return `${sign}$${(absNumber / 1000000).toFixed(1)}M`
    }
    if (absNumber >= 1000) {
        return `${sign}$${(absNumber / 1000).toFixed(0)}k`
    }
    return `${sign}$${absNumber.toLocaleString()}`
}

export const formatCurrency = (number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number)
}

export const formatPercentage = (number) => {
    return `${(number * 100).toFixed(1)}%`
}
