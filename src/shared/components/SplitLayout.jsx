import React from 'react'

const SplitLayout = ({ inputSection, outputSection }) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Left Panel - Input */}
      <div className="w-1/2 h-full overflow-y-auto border-r border-gray-200 bg-gray-50/50">
        <div className="max-w-2xl mx-auto p-8">
          {inputSection}
        </div>
      </div>

      {/* Right Panel - Output */}
      <div className="w-1/2 h-full bg-white overflow-y-auto">
        <div className="max-w-2xl mx-auto p-8 h-full">
          {outputSection}
        </div>
      </div>
    </div>
  )
}

export default SplitLayout
