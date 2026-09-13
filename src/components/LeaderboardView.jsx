import { useMemo, useState } from 'react'
import { SectionHead, Empty } from './ui.jsx'
import { seasonTotals, coupleName } from '../data/selectors.js'

const COLUMNS = [
  { key: 'cumulativeJudgeTotal', label: 'Judge total', hint: 'Sum of every judge total so far' },
  { key: 'cumulativeTotalScore', label: 'Total score', hint: 'Sum of the scores as aired' },
  { key: 'cumulativeHerScore', label: 'My score', hint: 'My own ratings' },
]

function NotesPanel({ row }) {
  const withNotes = row.entries.filter(
    (e) => e.judgeNotes.trim() || e.personalNotes.trim() || e.danceStyle.trim(),
  )
  if (!withNotes.length) {
    return <div className="notes-list"><p style={{ color: 'var(--ink-3)', fontSize: '0.85rem', margin: 0 }}>Nothing written down for this couple yet.</p></div>
  }
  return (
    <div className="notes-list">
      {withNotes.map((e) => (
        <div className="note-row" key={e.id}>
          <div className="note-row__head">
            <span className="note-row__week num">Wk {e.week}</span>
            <span className="note-row__dance">{e.danceStyle || 'Dance not recorded'}</span>
            {e.song && <span className="note-row__song">{e.song}{e.songArtist ? ` — ${e.songArtist}` : ''}</span>}
          </div>
          {e.judgeNotes.trim() && <p><b>Judges</b>{e.judgeNotes}</p>}
          {e.personalNotes.trim() && <p><b>My notes</b>{e.personalNotes}</p>}
        </div>
      ))}
    </div>
  )
}

export function LeaderboardView({ data }) {
  const { couples, entries, settings, updateSettings } = data
  const [sortKey, setSortKey] = useState('cumulativeTotalScore')
  const [expanded, setExpanded] = useState(null)

  const rows = useMemo(() => {
    const totals = seasonTotals(couples, entries, settings.herScoreMode)
    // Eliminated couples stay in the sort, just dimmed — she wants the whole field.
    return totals.slice().sort((a, b) => b[sortKey] - a[sortKey]
      || b.cumulativeTotalScore - a.cumulativeTotalScore
      || a.couple.celebrityName.localeCompare(b.couple.celebrityName))
  }, [couples, entries, settings.herScoreMode, sortKey])

  const anyData = entries.length > 0
  const fmt = (row, key) => {
    const v = row[key]
    if (key === 'cumulativeHerScore' && settings.herScoreMode === 'average') {
      return row.herScoreCount ? v.toFixed(1) : '—'
    }
    return v || (row.weeksDanced ? v : '—')
  }

  return (
    <>
      <SectionHead
        title="Season leaderboard"
        subtitle="Running totals across every week entered. Tap a couple to read their notes for the whole season."
      >
        <div className="segmented" role="group" aria-label="My score aggregation">
          {['sum', 'average'].map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={settings.herScoreMode === mode}
              onClick={() => updateSettings({ herScoreMode: mode })}
            >
              My score: {mode}
            </button>
          ))}
        </div>
      </SectionHead>

      {!anyData ? (
        <div className="card">
          <Empty title="The season has not started">
            Once week 1 is filled in, the standings show up here.
          </Empty>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="ledger">
            <caption className="sr-only">
              Cumulative season totals, sorted by {COLUMNS.find((c) => c.key === sortKey).label}
            </caption>
            <thead>
              <tr>
                <th scope="col">Couple</th>
                <th scope="col">Wks</th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={sortKey === col.key ? 'descending' : 'none'}
                  >
                    <button
                      type="button"
                      className="sortbtn"
                      aria-sort-active={String(sortKey === col.key)}
                      onClick={() => setSortKey(col.key)}
                      title={`Sort by ${col.hint.toLowerCase()}`}
                    >
                      {col.label}
                      <span aria-hidden="true">{sortKey === col.key ? '▾' : ''}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isOpen = expanded === row.couple.id
                return [
                  <tr
                    key={row.couple.id}
                    className={row.couple.eliminated ? 'ledger__row--out' : undefined}
                  >
                    <td>
                      <button
                        type="button"
                        className="sortbtn"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded(isOpen ? null : row.couple.id)}
                        style={{ textTransform: 'none', letterSpacing: 0, textAlign: 'left' }}
                      >
                        <span className="num" style={{ color: 'var(--ink-3)', minWidth: 18, display: 'inline-block' }}>
                          {i + 1}
                        </span>
                        <span>
                          {coupleName(row.couple)}
                          {row.couple.eliminated && (
                            <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--ink-3)' }}>
                              Eliminated week {row.couple.eliminatedWeek}
                            </span>
                          )}
                        </span>
                        <span aria-hidden="true" style={{ color: 'var(--violet-bright)' }}>{isOpen ? '−' : '+'}</span>
                      </button>
                    </td>
                    <td className="num">{row.weeksDanced || '—'}</td>
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="ledger__value num">{fmt(row, col.key)}</td>
                    ))}
                  </tr>,
                  isOpen && (
                    <tr className="ledger__expand" key={`${row.couple.id}-notes`}>
                      <td colSpan={5}><NotesPanel row={row} /></td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
