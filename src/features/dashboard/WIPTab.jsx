function WIPTab({ data }) {
  return (
    <div>
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <span className="text-3xl mr-3">🚧</span>
          <div>
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">
              Work In Progress Dashboard
            </h2>
            <p className="text-sm text-yellow-800 mb-2">
              This section contains experimental features and visualizations.
              Content will be added incrementally based on your requirements.
            </p>
            <p className="text-xs text-yellow-700">
              <strong>Status:</strong> Ready for components • Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder for future components */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Components Added Yet
          </h3>
          <p className="text-gray-500 mb-4">
            This dashboard is ready to receive new visualizations and analytics.
          </p>
          <div className="inline-block bg-gray-100 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-600 font-medium mb-2">Available Data:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>✓ Income projections ({data?.incomeProjections?.projections?.length || 0} months)</li>
              <li>✓ Expense projections ({data?.expenseProjections?.projections?.length || 0} months)</li>
              <li>✓ Gap projections ({data?.gapProjections?.projections?.length || 0} years)</li>
              <li>✓ Profile data (age: {data?.profile?.age}, retirement: {data?.profile?.retirementAge})</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WIPTab
