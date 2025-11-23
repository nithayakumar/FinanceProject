import { useState, useEffect } from 'react'
import { storage } from '../../../core/storage'

const SCENARIO_STORAGE_KEY = 'scenarios'
const ACTIVE_SCENARIO_KEY = 'activeScenarioId'

const DEFAULT_SCENARIOS = [
    { id: '1', name: 'Scenario 1', color: 'blue', isLocked: false }
]

export function useScenarioData() {
    const [scenarios, setScenarios] = useState([])
    const [activeScenarioId, setActiveScenarioId] = useState('1')

    // Load initial data
    useEffect(() => {
        loadData()

        // Listen for storage changes
        const handleStorageChange = (e) => {
            if (e.detail.key === SCENARIO_STORAGE_KEY || e.detail.key === ACTIVE_SCENARIO_KEY) {
                loadData()
            }
        }

        window.addEventListener('localStorageChange', handleStorageChange)
        return () => window.removeEventListener('localStorageChange', handleStorageChange)
    }, [])

    const loadData = () => {
        const storedScenarios = storage.load(SCENARIO_STORAGE_KEY)
        const storedActiveId = storage.load(ACTIVE_SCENARIO_KEY)

        if (!storedScenarios || storedScenarios.length === 0) {
            // Initialize with default if empty
            storage.save(SCENARIO_STORAGE_KEY, DEFAULT_SCENARIOS)
            setScenarios(DEFAULT_SCENARIOS)
        } else {
            setScenarios(storedScenarios)
        }

        if (storedActiveId) {
            setActiveScenarioId(storedActiveId)
        } else {
            storage.save(ACTIVE_SCENARIO_KEY, '1')
            setActiveScenarioId('1')
        }
    }

    const addScenario = () => {
        if (scenarios.length >= 3) return

        // Find first available ID (1, 2, or 3)
        const existingIds = scenarios.map(s => parseInt(s.id))
        let newIdNum = 1
        while (existingIds.includes(newIdNum)) {
            newIdNum++
        }
        const newId = newIdNum.toString()

        // Assign fixed colors based on ID to ensure consistency
        // 1: Blue, 2: Green, 3: Purple
        const colorMap = {
            '1': 'blue',
            '2': 'green',
            '3': 'purple'
        }
        const newColor = colorMap[newId] || 'gray'

        const newScenario = {
            id: newId,
            name: `Scenario ${newId}`,
            color: newColor,
            isLocked: false
        }

        const updatedScenarios = [...scenarios, newScenario]
        storage.save(SCENARIO_STORAGE_KEY, updatedScenarios)

        // Clone data from active scenario to new scenario
        const keysToClone = ['income', 'expenses', 'investmentsDebt', 'taxes', 'taxLadders', 'gap', 'profile']

        // We need to manually read the source data (active scenario) and write to target (new scenario)
        // Since storage.load/save automatically use activeScenarioId, we need to temporarily bypass it
        // OR we can use the raw localStorage keys.
        // Using raw keys is safer here to avoid race conditions with activeScenarioId state.

        const sourceId = activeScenarioId
        const targetId = newId

        keysToClone.forEach(key => {
            const sourceKey = sourceId === '1' ? key : `${key}_${sourceId}`
            const targetKey = targetId === '1' ? key : `${key}_${targetId}`

            const data = localStorage.getItem(sourceKey)
            if (data) {
                localStorage.setItem(targetKey, data)
                // Trigger storage change event so Scenarios page recalculates
                window.dispatchEvent(new CustomEvent('localStorageChange', {
                    detail: { key: targetKey, value: data }
                }))
            }
        })

        return newId
    }

    const updateScenario = (id, updates) => {
        const updatedScenarios = scenarios.map(s =>
            s.id === id ? { ...s, ...updates } : s
        )
        storage.save(SCENARIO_STORAGE_KEY, updatedScenarios)
    }

    const deleteScenario = (id) => {
        if (scenarios.length <= 1) return // Cannot delete last scenario

        const updatedScenarios = scenarios.filter(s => s.id !== id)
        storage.save(SCENARIO_STORAGE_KEY, updatedScenarios)

        // If deleted active scenario, switch to first available
        if (activeScenarioId === id) {
            const newActiveId = updatedScenarios[0].id
            setActiveScenario(newActiveId)
        }
    }

    const setActiveScenario = (id) => {
        storage.save(ACTIVE_SCENARIO_KEY, id)
        setActiveScenarioId(id)
        // Force reload to ensure all components pick up new scenario data
        window.location.reload()
    }

    return {
        scenarios,
        activeScenarioId,
        addScenario,
        updateScenario,
        deleteScenario,
        setActiveScenario
    }
}
