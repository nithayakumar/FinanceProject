import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Finance Project</h1>
      <p className="text-xl text-gray-600 mb-8">
        Make smart, data-backed financial decisions
      </p>

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
