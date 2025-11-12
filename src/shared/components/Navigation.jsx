import { Link, useLocation } from 'react-router-dom'

function Navigation() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/personal-details', label: 'Personal Details' },
    { path: '/income', label: 'Income' },
    { path: '/expenses', label: 'Expenses' },
    { path: '/taxes', label: 'Taxes' },
    { path: '/investments-debt', label: 'Investments & Debt' },
    { path: '/gap', label: 'Gap' },
    { path: '/scenarios', label: 'Scenarios' },
  ]

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-gray-900">
            💰 Finance Project
          </Link>

          <div className="hidden md:flex space-x-1">
            {navItems.slice(1).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <button className="text-sm text-gray-600 hover:text-gray-900">
            Export Data
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
