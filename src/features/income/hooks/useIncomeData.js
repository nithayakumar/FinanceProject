import { useState, useEffect, useMemo, useRef } from 'react'
import { storage, INCOME_CONFIG, createDefaultIncomeStream } from '../../../core'
import { calculateIncomeProjections } from '../Income.calc'
import { JUMP_DESCRIPTIONS, BREAK_DESCRIPTIONS } from '../config/incomeSchema'

export function useIncomeData() {
    // Load profile for retirement year and inflation rate
    const profile = storage.load('profile') || {}
    const yearsToRetirement = profile.retirementAge && profile.age
        ? profile.retirementAge - profile.age
        : 30
    const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7

    // Initialize state directly from storage
    const [data, setData] = useState(() => {
        const saved = storage.load('income')
        if (saved) {
            // Sanitize saved data
            if (saved.incomeStreams) {
                saved.incomeStreams = saved.incomeStreams.map(stream => {
                    if (stream.isEndYearLinked === undefined) stream.isEndYearLinked = true
                    if (!stream.endWorkYear || stream.endWorkYear < 0) {
                        stream.endWorkYear = yearsToRetirement > 0 ? yearsToRetirement : 30
                        stream.isEndYearLinked = true
                    }
                    return stream
                })
            }
            return saved
        }
        return {
            incomeStreams: [
                createDefaultIncomeStream(1, yearsToRetirement, INCOME_CONFIG.DEFAULT_GROWTH_RATE)
            ]
        }
    })

    const [expandedStreams, setExpandedStreams] = useState({})
    const [errors, setErrors] = useState({})

    // Sync endWorkYear with yearsToRetirement if linked
    useEffect(() => {
        setData(prev => ({
            ...prev,
            incomeStreams: prev.incomeStreams.map(stream => {
                if (stream.isEndYearLinked && stream.endWorkYear !== yearsToRetirement) {
                    return { ...stream, endWorkYear: yearsToRetirement }
                }
                return stream
            })
        }))
    }, [yearsToRetirement])

    // Auto-save effect
    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        storage.save('income', data)
    }, [data])

    // Debounced Projections
    const [projections, setProjections] = useState(() => calculateIncomeProjections(data, profile))

    useEffect(() => {
        const timer = setTimeout(() => {
            setProjections(calculateIncomeProjections(data, profile))
        }, 300) // 300ms debounce

        return () => clearTimeout(timer)
    }, [data, profile])

    // Actions
    const addIncomeStream = () => {
        if (data.incomeStreams.length >= INCOME_CONFIG.MAX_STREAMS) return

        const newStream = createDefaultIncomeStream(
            data.incomeStreams.length + 1,
            yearsToRetirement,
            INCOME_CONFIG.DEFAULT_GROWTH_RATE
        )

        setExpandedStreams({}) // Auto-collapse
        setData(prev => ({
            ...prev,
            incomeStreams: [...prev.incomeStreams, newStream]
        }))
    }

    const removeIncomeStream = (streamId) => {
        if (data.incomeStreams.length <= INCOME_CONFIG.MIN_STREAMS) return
        setData(prev => ({
            ...prev,
            incomeStreams: prev.incomeStreams.filter(s => s.id !== streamId)
        }))
    }

    const updateStream = (streamId, field, value) => {
        setData(prev => ({
            ...prev,
            incomeStreams: prev.incomeStreams.map(stream => {
                if (stream.id !== streamId) return stream
                const updates = { [field]: value }
                if (field === 'endWorkYear') updates.isEndYearLinked = false
                return { ...stream, ...updates }
            })
        }))
    }

    const toggleAdvanced = (streamId) => {
        setExpandedStreams(prev => ({ ...prev, [streamId]: !prev[streamId] }))
    }

    // Jumps & Breaks Logic
    const addJump = (streamId) => {
        const desc = JUMP_DESCRIPTIONS[Math.floor(Math.random() * JUMP_DESCRIPTIONS.length)]
        const newJump = { id: `jump-${Date.now()}`, year: '', jumpPercent: '', description: desc }

        setData(prev => ({
            ...prev,
            incomeStreams: prev.incomeStreams.map(s =>
                s.id === streamId ? { ...s, jumps: [...s.jumps, newJump] } : s
            )
        }))
    }

    const updateJump = (streamId, jumpId, field, value) => {
        setData(prev => ({
            ...prev,
            incomeStreams: prev.incomeStreams.map(s =>
                s.id === streamId ? {
                    ...s,
                    jumps: s.jumps.map(j => j.id === jumpId ? { ...j, [field]: value } : j)
                } : s
            )
        }))
    }

    const removeJump = (streamId, jumpId) => {
        setData(prev => ({
            ...prev,
            incomeStreams: prev.incomeStreams.map(s =>
                s.id === streamId ? { ...s, jumps: s.jumps.filter(j => j.id !== jumpId) } : s
            )
        }))
    }

    const addBreak = (streamId) => {
        const desc = BREAK_DESCRIPTIONS[Math.floor(Math.random() * BREAK_DESCRIPTIONS.length)]
        const newBreak = {
            id: `break-${Date.now()}`,
            startYear: '',
            durationMonths: '',
            reductionPercent: 100,
            description: desc
        }

        setData(prev => ({
            ...prev,
            incomeStreams: prev.incomeStreams.map(s =>
                s.id === streamId ? { ...s, careerBreaks: [...(s.careerBreaks || []), newBreak] } : s
            )
        }))
    }

    const updateBreak = (streamId, breakId, field, value) => {
        setData(prev => ({
            ...prev,
            incomeStreams: prev.incomeStreams.map(s =>
                s.id === streamId ? {
                    ...s,
                    careerBreaks: (s.careerBreaks || []).map(b => b.id === breakId ? { ...b, [field]: value } : b)
                } : s
            )
        }))
    }

    const removeBreak = (streamId, breakId) => {
        setData(prev => ({
            ...prev,
            incomeStreams: prev.incomeStreams.map(s =>
                s.id === streamId ? {
                    ...s,
                    careerBreaks: (s.careerBreaks || []).filter(b => b.id !== breakId)
                } : s
            )
        }))
    }

    return {
        data,
        projections,
        expandedStreams,
        yearsToRetirement,
        actions: {
            addIncomeStream,
            removeIncomeStream,
            updateStream,
            toggleAdvanced,
            addJump,
            updateJump,
            removeJump,
            addBreak,
            updateBreak,
            removeBreak
        }
    }
}
