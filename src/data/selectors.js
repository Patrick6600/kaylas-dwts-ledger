// Every season-level number in the app is derived here — nothing in this file is
// ever entered by hand or persisted.

export function activeCouplesForWeek(couples, week) {
  return couples.filter((c) => !c.eliminated || (c.eliminatedWeek ?? Infinity) >= week)
}

export function entriesForWeek(entries, week) {
  return entries.filter((e) => e.week === week)
}

export function coupleName(couple) {
  return couple ? `${couple.celebrityName} & ${couple.proName}` : 'Unknown couple'
}

export function shortName(couple) {
  return couple ? couple.celebrityName : 'Unknown'
}

// Sorted standings for one week. Couples with no total score yet sit at the
// bottom in roster order rather than being dropped, so the board fills in live.
export function weekLeaderboard(couples, entries, week) {
  const byCouple = new Map(entriesForWeek(entries, week).map((e) => [e.coupleId, e]))
  const rows = activeCouplesForWeek(couples, week).map((couple, index) => {
    const entry = byCouple.get(couple.id) ?? null
    return {
      couple,
      entry,
      order: index,
      totalScore: entry && Number.isFinite(entry.totalScore) ? entry.totalScore : null,
      judgeTotal: entry && entry.judgeTotal ? entry.judgeTotal : null,
      herScore: entry && Number.isFinite(entry.herScore) ? entry.herScore : null,
      weekPlacement: entry && Number.isFinite(entry.weekPlacement) ? entry.weekPlacement : null,
    }
  })

  rows.sort((a, b) => {
    const aHas = a.totalScore !== null
    const bHas = b.totalScore !== null
    if (aHas !== bHas) return aHas ? -1 : 1
    if (aHas && a.totalScore !== b.totalScore) return b.totalScore - a.totalScore
    if ((a.judgeTotal ?? 0) !== (b.judgeTotal ?? 0)) return (b.judgeTotal ?? 0) - (a.judgeTotal ?? 0)
    return a.order - b.order
  })

  let rank = 0
  let lastScore = Symbol('none')
  return rows.map((row, i) => {
    if (row.totalScore !== lastScore) { rank = i + 1; lastScore = row.totalScore }
    return { ...row, rank: row.totalScore === null ? null : rank }
  })
}

// Running sums across every week entered so far.
export function seasonTotals(couples, entries, herScoreMode = 'sum') {
  const grouped = new Map(couples.map((c) => [c.id, []]))
  entries.forEach((e) => {
    if (grouped.has(e.coupleId)) grouped.get(e.coupleId).push(e)
  })

  return couples.map((couple) => {
    const list = (grouped.get(couple.id) ?? []).slice().sort((a, b) => a.week - b.week)
    const herScores = list.map((e) => e.herScore).filter(Number.isFinite)
    const herSum = herScores.reduce((s, v) => s + v, 0)
    return {
      couple,
      weeksDanced: list.length,
      entries: list,
      cumulativeJudgeTotal: list.reduce((s, e) => s + (e.judgeTotal || 0), 0),
      cumulativeTotalScore: list.reduce(
        (s, e) => s + (Number.isFinite(e.totalScore) ? e.totalScore : 0), 0,
      ),
      cumulativeHerScore: herScoreMode === 'average'
        ? (herScores.length ? herSum / herScores.length : 0)
        : herSum,
      herScoreCount: herScores.length,
    }
  })
}

export const METRICS = {
  judgeTotal: { key: 'judgeTotal', label: 'Judge Total', color: '#c98500' },
  totalScore: { key: 'totalScore', label: 'Total Score', color: '#3987e5' },
  herScore: { key: 'herScore', label: 'My Score', color: '#d55181' },
}

export const METRIC_LIST = [METRICS.judgeTotal, METRICS.totalScore, METRICS.herScore]

function metricValue(entry, key) {
  if (!entry) return null
  if (key === 'judgeTotal') return entry.judgeTotal || null
  const v = entry[key]
  return Number.isFinite(v) ? v : null
}

// Per-week best for each metric — the base the indexed view is measured against.
export function weeklyMaxima(entries, weeks) {
  const maxima = new Map()
  weeks.forEach((week) => {
    const list = entriesForWeek(entries, week)
    maxima.set(week, {
      judgeTotal: Math.max(0, ...list.map((e) => metricValue(e, 'judgeTotal') ?? 0)),
      totalScore: Math.max(0, ...list.map((e) => metricValue(e, 'totalScore') ?? 0)),
      herScore: Math.max(0, ...list.map((e) => metricValue(e, 'herScore') ?? 0)),
    })
  })
  return maxima
}

/**
 * One row per week for a single couple.
 *
 * The three metrics live on wildly different scales (judge total runs to 30 or
 * 40, her score to 10, the total score is whatever the show puts on screen), so
 * plotting the raw numbers on a shared axis would flatten her score into the
 * floor. `indexed` re-expresses each one as a share of that week best — 100
 * means nobody scored higher that week — which is what actually makes the gap
 * between the judges, the show and her readable on one axis.
 */
export function coupleTrend(entries, coupleId, weeks, maxima) {
  const byWeek = new Map(
    entries.filter((e) => e.coupleId === coupleId).map((e) => [e.week, e]),
  )
  return weeks.map((week) => {
    const entry = byWeek.get(week) ?? null
    const max = maxima.get(week) ?? { judgeTotal: 0, totalScore: 0, herScore: 0 }
    const row = { week, entry }
    METRIC_LIST.forEach(({ key }) => {
      const raw = metricValue(entry, key)
      row[key] = raw
      row[`${key}Indexed`] = raw !== null && max[key] > 0
        ? Math.round((raw / max[key]) * 1000) / 10
        : null
    })
    return row
  })
}

// Weeks that actually have something plotted — trailing empties just add dead axis.
export function weeksWithData(entries, totalWeeks) {
  const seen = new Set(entries.map((e) => e.week))
  const maxSeen = seen.size ? Math.max(...seen) : 0
  const upper = Math.max(1, Math.min(totalWeeks, maxSeen))
  return Array.from({ length: upper }, (_, i) => i + 1)
}

export function allWeeks(totalWeeks) {
  return Array.from({ length: totalWeeks }, (_, i) => i + 1)
}

// Dance-style search across the whole season.
export function findByDanceStyle(entries, couples, query) {
  const q = query.trim().toLowerCase()
  const byId = new Map(couples.map((c) => [c.id, c]))
  const matches = entries.filter((e) => {
    if (!q) return Boolean(e.danceStyle.trim())
    const haystack = `${e.danceStyle} ${e.song} ${e.songArtist}`.toLowerCase()
    return haystack.includes(q)
  })
  return matches
    .map((entry) => ({ entry, couple: byId.get(entry.coupleId) }))
    .filter((row) => row.couple)
    .sort((a, b) => a.entry.week - b.entry.week
      || (b.entry.judgeTotal || 0) - (a.entry.judgeTotal || 0))
}

export function danceStyleTally(entries) {
  const tally = new Map()
  entries.forEach((e) => {
    const style = e.danceStyle.trim()
    if (!style) return
    const key = style.toLowerCase()
    const current = tally.get(key) ?? { label: style, count: 0 }
    current.count += 1
    tally.set(key, current)
  })
  return [...tally.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}
