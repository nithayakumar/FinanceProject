import { Link } from 'react-router-dom'
import { storage } from '../shared/storage'

function Home() {
  // Load data for financial snapshot
  const profile = storage.load('profile')
  const income = storage.load('income')
  const expenses = storage.load('expenses')

  // Calculate basic insights if data is available
  const hasData = profile && income && expenses
  let snapshot = null

  if (hasData) {
    const totalIncome = income.incomeStreams?.reduce((sum, stream) => {
      return sum + (Number(stream.annualIncome) || 0)
    }, 0) || 0

    const totalExpenses = expenses.expenseCategories?.reduce((sum, cat) => {
      return sum + (Number(cat.annualAmount) || 0)
    }, 0) || 0

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0

    snapshot = {
      totalIncome,
      totalExpenses,
      savingsRate,
      yearsToRetirement: profile.retirementAge && profile.age ? profile.retirementAge - profile.age : 0
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Finance Project</h1>
      <p className="text-xl text-gray-600 mb-8">
        Make smart, data-backed financial decisions
      </p>

      {/* Financial Snapshot */}
      {snapshot && snapshot.totalIncome > 0 && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Financial Snapshot</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Annual Income</p>
              <p className="text-2xl font-bold text-gray-900">${Math.round(snapshot.totalIncome).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Annual Expenses</p>
              <p className="text-2xl font-bold text-gray-900">${Math.round(snapshot.totalExpenses).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Savings Rate</p>
              <p className="text-2xl font-bold text-green-600">{snapshot.savingsRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Years to Retirement</p>
              <p className="text-2xl font-bold text-blue-600">{snapshot.yearsToRetirement}</p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
          >
            View Full Dashboard →
          </Link>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
        <p className="text-gray-700 mb-6">
          Follow the steps below to build your financial profile and compare scenarios.
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Personal Details"
            description="Basic information and filing status"
            link="/personal-details"
          />
          <FeatureCard
            title="Income"
            description="Salary, bonuses, and pre-tax contributions"
            link="/income"
          />
          <FeatureCard
            title="Expenses"
            description="Monthly and annual expenses by category"
            link="/expenses"
          />
          <FeatureCard
            title="Taxes"
            description="Federal, state, and FICA calculations"
            link="/taxes"
          />
          <FeatureCard
            title="Investments & Debt"
            description="Assets, retirement accounts, and debts"
            link="/investments-debt"
          />
          <FeatureCard
            title="Gap Calculations"
            description="Savings rate and financial summary"
            link="/gap"
          />
          <FeatureCard
            title="Scenarios"
            description="Compare different financial scenarios"
            link="/scenarios"
          />
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ title, description, link }) {
  return (
    <Link
      to={link}
      className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-50 transition"
    >
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </Link>
  )
}

export default Home
