import { Link } from 'react-router-dom'
import { storage } from '../core'
import { calculateIncomeProjections } from './income/Income.calc'
import { calculateExpenseProjections } from './expenses/Expenses.calc'
import { calculateGapProjections } from './gap/Gap.calc'

function Home() {
  // Load data for financial snapshot
  const profile = storage.load('profile')
  const income = storage.load('income')
  const expenses = storage.load('expenses')
  const investmentsDebt = storage.load('investmentsDebt')
  const property = storage.load('property')

  // Calculate basic insights if data is available
  const hasData = profile && income && expenses && investmentsDebt
  let snapshot = null

  if (hasData) {
    // Calculate total compensation (salary + equity + company 401k match)
    const totalIncome = income.incomeStreams?.reduce((sum, stream) => {
      const salary = Number(stream.annualIncome) || 0
      const equity = Number(stream.equity) || 0
      const company401k = Number(stream.company401k) || 0
      return sum + salary + equity + company401k
    }, 0) || 0

    const totalExpenses = expenses.expenseCategories?.reduce((sum, cat) => {
      return sum + (Number(cat.annualAmount) || 0)
    }, 0) || 0

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0

    // Calculate current net worth
    const currentCash = Number(investmentsDebt.currentCash) || 0
    const taxableAccounts = Number(investmentsDebt.taxableAccounts) || 0
    const rothAccounts = Number(investmentsDebt.rothAccounts) || 0
    const traditionalAccounts = Number(investmentsDebt.traditionalAccounts) || 0
    const employerAccounts = Number(investmentsDebt.employerAccounts) || 0
    const realEstate = Number(investmentsDebt.realEstate) || 0
    const mortgage = Number(investmentsDebt.mortgage) || 0
    const otherDebts = Number(investmentsDebt.otherDebts) || 0

    const currentNetWorth = currentCash + taxableAccounts + rothAccounts + traditionalAccounts + employerAccounts + realEstate - mortgage - otherDebts

    // Calculate projections to get net worth at retirement and actual expenses
    let netWorthAtRetirement = null
    let safeWithdrawalMonthly = null
    let yearsToFire = null
    let retirementExpenses = null
    let currentYearExpenses = totalExpenses // fallback to basic calculation

    try {
      const enrichedProfile = {
        ...profile,
        yearsToRetirement: profile.retirementAge - profile.age,
        currentAge: profile.age
      }

      const incomeProjections = calculateIncomeProjections(income, enrichedProfile)
      const expenseProjections = calculateExpenseProjections(expenses, enrichedProfile, incomeProjections.projections)

      const incomeWithProjections = {
        ...income,
        projections: incomeProjections.projections
      }
      const expensesWithProjections = {
        ...expenses,
        projections: expenseProjections.projections
      }
      const gapProjections = calculateGapProjections(incomeWithProjections, expensesWithProjections, investmentsDebt, property, enrichedProfile)

      // Get Year 1 actual expenses from GAP projections (where monthly expense data is aggregated to annual)
      // Note: Expense projections are monthly with totalExpensesNominal, while Gap aggregates to annualExpenses
      if (gapProjections.projections && gapProjections.projections.length > 0) {
        currentYearExpenses = gapProjections.projections[0].annualExpenses || totalExpenses
      }

      const yearsToRetirement = profile.retirementAge - profile.age
      const retirementYearIndex = Math.min(yearsToRetirement - 1, gapProjections.projections.length - 1)

      if (retirementYearIndex >= 0 && gapProjections.projections[retirementYearIndex]) {
        netWorthAtRetirement = gapProjections.projections[retirementYearIndex].netWorth
        retirementExpenses = gapProjections.projections[retirementYearIndex].annualExpenses
        // 4% safe withdrawal rate per year, divided by 12 for monthly
        safeWithdrawalMonthly = (netWorthAtRetirement * 0.04) / 12

        // Calculate Years to FIRE
        // Use expenses at retirement year
        const fireNumber = retirementExpenses * 25

        // Find when net worth exceeds FIRE number
        for (let i = 0; i < gapProjections.projections.length; i++) {
          if (gapProjections.projections[i].netWorth >= fireNumber) {
            yearsToFire = i + 1 // i is 0-indexed, represents years from now
            break
          }
        }
      }
    } catch (error) {
      console.error('Error calculating retirement projections:', error)
    }

    snapshot = {
      totalIncome,
      totalExpenses,
      currentYearExpenses,
      savingsRate,
      yearsToRetirement: profile.retirementAge && profile.age ? profile.retirementAge - profile.age : 0,
      currentNetWorth,
      netWorthAtRetirement,
      retirementExpenses,
      safeWithdrawalMonthly,
      yearsToFire
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Net Worth Project</h1>
      <p className="text-xl text-gray-600 mb-8">
        Project your Net Worth. Plan when and how you retire.
      </p>

      {/* Financial Snapshot */}
      {snapshot && snapshot.totalIncome > 0 && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Financial Snapshot</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Annual Income</p>
              <p className="text-2xl font-bold text-gray-900">${Math.round(snapshot.totalIncome).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Monthly Expenses</p>
              <p className="text-2xl font-bold text-gray-900">${Math.round(snapshot.currentYearExpenses / 12).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Net Worth (Current)</p>
              <p className="text-2xl font-bold text-gray-900">${Math.round(snapshot.currentNetWorth).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Years to Retirement</p>
              <p className="text-2xl font-bold text-blue-600">{snapshot.yearsToRetirement}</p>
            </div>
            {snapshot.netWorthAtRetirement && (
              <div>
                <p className="text-sm text-gray-600">Net Worth at Retirement</p>
                <p className="text-2xl font-bold text-gray-900">${Math.round(snapshot.netWorthAtRetirement).toLocaleString()}</p>
              </div>
            )}
            {snapshot.retirementExpenses && (
              <div>
                <p className="text-sm text-gray-600">Monthly Expenses at Retirement</p>
                <p className="text-2xl font-bold text-gray-900">${Math.round(snapshot.retirementExpenses / 12).toLocaleString()}</p>
              </div>
            )}
            {snapshot.safeWithdrawalMonthly && (
              <div>
                <p className="text-sm text-gray-600">Monthly Safe Withdrawal (4%)</p>
                <p className="text-2xl font-bold text-green-600">${Math.round(snapshot.safeWithdrawalMonthly).toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Years to FIRE</p>
              <p className="text-2xl font-bold text-blue-600">
                {snapshot.yearsToFire ? snapshot.yearsToFire : 'N/A'}
              </p>
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
        <h2 className="text-2xl font-semibold mb-4">What is the Net Worth Project?</h2>
        <p className="text-gray-700 mb-6">
          Follow the steps below to build your financial profile and compare scenarios.
        </p>
      </div>
    </div>
  )
}

export default Home
