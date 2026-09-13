import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { indexedDbBackend } from '../data/storage.js'
import { buildRoster, SEASON_NUMBER } from '../data/roster.js'
import {
  SCHEMA_VERSION, DEFAULT_SETTINGS, blankEntry, isEntryEmpty, makeEntryId, migrate,
  sanitizeCouple, sanitizeEntry, sanitizeSettings, withJudgeTotal,
} from '../data/schema.js'

// The one and only place the app talks to storage. Point this at a different
// module (same six methods) to move the season into Firestore later.
const backend = indexedDbBackend

const WRITE_DEBOUNCE_MS = 400
// If storage has not answered in this long it is not going to. Better a screen
// that explains itself than a spinner that never stops.
const LOAD_TIMEOUT_MS = 8000

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('BALLROOM_DB_TIMEOUT')), LOAD_TIMEOUT_MS)
    }),
  ])
}

export function useSeasonData() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [couples, setCouples] = useState([])
  const [entriesById, setEntriesById] = useState({})
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  // Writes are batched: typing in a notes field should not hit the DB per keystroke.
  const pendingEntries = useRef(new Map())
  const pendingDeletes = useRef(new Set())
  const flushTimer = useRef(null)

  const flush = useCallback(async () => {
    clearTimeout(flushTimer.current)
    flushTimer.current = null
    const writes = [...pendingEntries.current.values()]
    const deletes = [...pendingDeletes.current]
    pendingEntries.current.clear()
    pendingDeletes.current.clear()
    if (!writes.length && !deletes.length) return
    try {
      await Promise.all([backend.putEntries(writes), backend.deleteEntries(deletes)])
    } catch (err) {
      setError(err)
    }
  }, [])

  const scheduleFlush = useCallback(() => {
    clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(flush, WRITE_DEBOUNCE_MS)
  }, [flush])

  // Do not lose the last few keystrokes if the tab closes mid-sentence.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  // --- initial load -------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const stored = await withTimeout(backend.loadAll())
        if (cancelled) return
        if (!stored) {
          const roster = buildRoster()
          await backend.putCouples(roster)
          await backend.putSettings(DEFAULT_SETTINGS)
          setCouples(roster)
          setSettings(DEFAULT_SETTINGS)
          setEntriesById({})
        } else {
          const roster = buildRoster()
          const storedById = new Map(stored.couples.map((c) => [c.id, c]))
          // Roster order is canonical; a stored couple keeps its elimination state.
          const merged = roster.map((c) => ({ ...c, ...(storedById.get(c.id) ?? {}) }))
          const extras = stored.couples.filter((c) => !merged.some((m) => m.id === c.id))
          const map = {}
          stored.entries.forEach((e) => { map[e.id] = withJudgeTotal(e) })
          setCouples([...merged, ...extras])
          setEntriesById(map)
          setSettings(sanitizeSettings(stored.settings))
        }
        setStatus('ready')
      } catch (err) {
        if (!cancelled) { setError(err); setStatus('error') }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // --- entries ------------------------------------------------------------
  const getEntry = useCallback(
    (coupleId, week) => entriesById[makeEntryId(coupleId, week)] ?? blankEntry(coupleId, week),
    [entriesById],
  )

  const updateEntry = useCallback((coupleId, week, patch) => {
    const id = makeEntryId(coupleId, week)
    setEntriesById((prev) => {
      const base = prev[id] ?? blankEntry(coupleId, week)
      const next = withJudgeTotal({ ...base, ...patch, id, coupleId, week })
      // An entry blanked back out again should not linger in the backup file.
      if (isEntryEmpty(next)) {
        if (!prev[id]) return prev
        pendingEntries.current.delete(id)
        pendingDeletes.current.add(id)
        scheduleFlush()
        const { [id]: _removed, ...rest } = prev
        return rest
      }
      pendingDeletes.current.delete(id)
      pendingEntries.current.set(id, next)
      scheduleFlush()
      return { ...prev, [id]: next }
    })
  }, [scheduleFlush])

  const setJudgeScore = useCallback((coupleId, week, index, value) => {
    const current = getEntry(coupleId, week)
    const judgeScores = [...current.judgeScores]
    while (judgeScores.length <= index) judgeScores.push(null)
    judgeScores[index] = value
    updateEntry(coupleId, week, { judgeScores })
  }, [getEntry, updateEntry])

  // Adding a guest judge opens the 4th slot; removing one closes it and drops the score.
  const setGuestJudge = useCallback((coupleId, week, name) => {
    const current = getEntry(coupleId, week)
    const judgeScores = current.judgeScores.slice(0, 3)
    if (name === null) {
      updateEntry(coupleId, week, { guestJudgeName: null, judgeScores })
    } else {
      updateEntry(coupleId, week, {
        guestJudgeName: name,
        judgeScores: [...judgeScores, current.judgeScores[3] ?? null],
      })
    }
  }, [getEntry, updateEntry])

  const clearEntry = useCallback((coupleId, week) => {
    const id = makeEntryId(coupleId, week)
    setEntriesById((prev) => {
      if (!prev[id]) return prev
      pendingEntries.current.delete(id)
      pendingDeletes.current.add(id)
      scheduleFlush()
      const { [id]: _removed, ...rest } = prev
      return rest
    })
  }, [scheduleFlush])

  // --- couples ------------------------------------------------------------
  const setElimination = useCallback((coupleId, week) => {
    setCouples((prev) => {
      const next = prev.map((c) => (
        c.id === coupleId
          ? { ...c, eliminated: week !== null, eliminatedWeek: week !== null ? week : null }
          : c
      ))
      const changed = next.find((c) => c.id === coupleId)
      if (changed) backend.putCouples([changed]).catch(setError)
      return next
    })
  }, [])

  // --- settings -----------------------------------------------------------
  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = sanitizeSettings({ ...prev, ...patch })
      backend.putSettings(next).catch(setError)
      return next
    })
  }, [])

  // --- backup / restore ---------------------------------------------------
  const buildBundle = useCallback(() => ({
    app: 'ballroom-ledger',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    seasonNumber: settings.seasonNumber ?? SEASON_NUMBER,
    settings,
    couples,
    entries: Object.values(entriesById).sort(
      (a, b) => a.week - b.week || a.coupleId.localeCompare(b.coupleId),
    ),
  }), [couples, entriesById, settings])

  const importBundle = useCallback(async (raw) => {
    const bundle = migrate(raw)
    if (!bundle || typeof bundle !== 'object') throw new Error('That file is not valid season data.')
    if (bundle.app && bundle.app !== 'ballroom-ledger') {
      throw new Error('That backup was made by a different app.')
    }
    if (!Array.isArray(bundle.couples) || !Array.isArray(bundle.entries)) {
      throw new Error('That file is missing its couples or entries list.')
    }

    const nextCouples = bundle.couples.map(sanitizeCouple).filter(Boolean)
    const nextEntries = bundle.entries.map(sanitizeEntry).filter(Boolean)
    const nextSettings = sanitizeSettings(bundle.settings)
    if (!nextCouples.length) throw new Error('That backup has no couples in it.')

    await flush()
    await backend.replaceAll({ couples: nextCouples, entries: nextEntries, settings: nextSettings })

    const map = {}
    nextEntries.forEach((e) => { map[e.id] = e })
    setCouples(nextCouples)
    setEntriesById(map)
    setSettings(nextSettings)
    return { couples: nextCouples.length, entries: nextEntries.length }
  }, [flush])

  const resetSeason = useCallback(async () => {
    await flush()
    const roster = buildRoster()
    await backend.replaceAll({ couples: roster, entries: [], settings: DEFAULT_SETTINGS })
    setCouples(roster)
    setEntriesById({})
    setSettings(DEFAULT_SETTINGS)
  }, [flush])

  const entries = useMemo(() => Object.values(entriesById), [entriesById])

  return {
    status,
    error,
    couples,
    entries,
    entriesById,
    settings,
    getEntry,
    updateEntry,
    setJudgeScore,
    setGuestJudge,
    clearEntry,
    setElimination,
    updateSettings,
    buildBundle,
    importBundle,
    resetSeason,
  }
}
