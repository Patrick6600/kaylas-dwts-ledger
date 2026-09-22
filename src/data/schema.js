import { SEASON_NUMBER, DEFAULT_TOTAL_WEEKS } from './roster.js'

// Bump when the persisted shape changes; migrate() handles the upgrade.
export const SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS = {
  seasonNumber: SEASON_NUMBER,
  totalWeeks: DEFAULT_TOTAL_WEEKS,
  // 'sum' matches the other cumulative column; 'average' is the toggle.
  herScoreMode: 'sum',
  // Season-wide, keyed by week number: { 1: 'Premiere Night', 2: 'Disney Night' }.
  weekThemes: {},
}

export function makeEntryId(coupleId, week) {
  return `${coupleId}__w${week}`
}

export function blankEntry(coupleId, week) {
  return {
    id: makeEntryId(coupleId, week),
    coupleId,
    week,
    danceStyle: '',
    song: '',
    songArtist: '',
    // Exactly 3 regular judges; a 4th slot appears only when a guest judge is on.
    judgeScores: [null, null, null],
    guestJudgeName: null,
    judgeTotal: 0,
    herScore: null,
    judgeNotes: '',
    personalNotes: '',
  }
}

// judgeTotal is always derived, never trusted from input or from an imported file.
export function computeJudgeTotal(judgeScores) {
  return (judgeScores || []).reduce((sum, s) => sum + (Number.isFinite(s) ? s : 0), 0)
}

export function withJudgeTotal(entry) {
  return { ...entry, judgeTotal: computeJudgeTotal(entry.judgeScores) }
}

// An entry is worth persisting only once it holds something.
export function isEntryEmpty(entry) {
  if (!entry) return true
  const hasText = [entry.danceStyle, entry.song, entry.songArtist, entry.judgeNotes, entry.personalNotes]
    .some((v) => (v || '').trim() !== '')
  const hasNumber = Number.isFinite(entry.herScore)
  const hasScore = (entry.judgeScores || []).some((s) => Number.isFinite(s))
  return !hasText && !hasNumber && !hasScore && !entry.guestJudgeName
}

function coerceNum(v, { min, max, integer = false } = {}) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  let out = integer ? Math.round(n) : n
  if (min !== undefined) out = Math.max(min, out)
  if (max !== undefined) out = Math.min(max, out)
  return out
}

export const num = coerceNum

export function sanitizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const coupleId = String(raw.coupleId || '')
  const week = coerceNum(raw.week, { min: 1, integer: true })
  if (!coupleId || !week) return null

  const scores = Array.isArray(raw.judgeScores) ? raw.judgeScores : []
  const judgeScores = [0, 1, 2].map((i) => coerceNum(scores[i], { min: 0, max: 10 }))
  const guestJudgeName = raw.guestJudgeName ? String(raw.guestJudgeName) : null
  const hasGuestScore = scores.length > 3 && scores[3] !== null && scores[3] !== undefined && scores[3] !== ''
  if (guestJudgeName !== null || hasGuestScore) {
    judgeScores.push(coerceNum(scores[3], { min: 0, max: 10 }))
  }

  return withJudgeTotal({
    id: raw.id || makeEntryId(coupleId, week),
    coupleId,
    week,
    danceStyle: String(raw.danceStyle ?? ''),
    song: String(raw.song ?? ''),
    songArtist: String(raw.songArtist ?? ''),
    judgeScores,
    guestJudgeName,
    judgeTotal: 0,
    herScore: coerceNum(raw.herScore, { min: 1, max: 10 }),
    judgeNotes: String(raw.judgeNotes ?? ''),
    personalNotes: String(raw.personalNotes ?? ''),
  })
}

export function sanitizeCouple(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null
  const eliminatedWeek = coerceNum(raw.eliminatedWeek, { min: 1, integer: true })
  return {
    id: String(raw.id),
    celebrityName: String(raw.celebrityName ?? ''),
    proName: String(raw.proName ?? ''),
    eliminated: Boolean(raw.eliminated),
    eliminatedWeek: raw.eliminated ? eliminatedWeek : null,
  }
}

// Themes are stored untrimmed so typing a space does not fight the cursor; an
// all-whitespace theme is dropped rather than stored.
const MAX_THEME_LEN = 120

function sanitizeWeekThemes(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  Object.entries(raw).forEach(([week, value]) => {
    const w = coerceNum(week, { min: 1, integer: true })
    const text = String(value ?? '').slice(0, MAX_THEME_LEN)
    if (w && text.trim()) out[w] = text
  })
  return out
}

export function sanitizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {}
  return {
    seasonNumber: coerceNum(s.seasonNumber, { min: 1, integer: true }) ?? DEFAULT_SETTINGS.seasonNumber,
    totalWeeks: coerceNum(s.totalWeeks, { min: 1, max: 40, integer: true }) ?? DEFAULT_SETTINGS.totalWeeks,
    herScoreMode: s.herScoreMode === 'average' ? 'average' : 'sum',
    weekThemes: sanitizeWeekThemes(s.weekThemes),
  }
}

// Forward-compatible hook: older exports get folded up to the current shape here.
export function migrate(bundle) {
  return bundle
}
