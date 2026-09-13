import { useMemo, useState } from 'react'
import { SectionHead, Empty } from './ui.jsx'
import { findByDanceStyle, danceStyleTally, coupleName } from '../data/selectors.js'

function Highlight({ text, query }) {
  const q = query.trim()
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

export function SearchView({ data }) {
  const { couples, entries } = data
  const [query, setQuery] = useState('')

  const styles = useMemo(() => danceStyleTally(entries), [entries])
  const results = useMemo(
    () => findByDanceStyle(entries, couples, query),
    [entries, couples, query],
  )

  return (
    <>
      <SectionHead
        title="Every dance"
        subtitle="Search the whole season by dance style, song or artist."
      />

      <div className="card panel" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="dance-search">Search</label>
          <input
            id="dance-search"
            className="input"
            type="search"
            value={query}
            placeholder="Argentine Tango"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {styles.length > 0 && (
          <>
            <div className="eyebrow" style={{ margin: '16px 0 8px' }}>Danced so far</div>
            <div className="chip-row">
              {styles.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="chip"
                  aria-pressed={query.trim().toLowerCase() === s.label.toLowerCase()}
                  onClick={() => setQuery(
                    query.trim().toLowerCase() === s.label.toLowerCase() ? '' : s.label,
                  )}
                >
                  {s.label}
                  <span className="num" style={{ opacity: 0.7 }}>{s.count}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card">
        {results.length === 0 ? (
          <Empty title={query.trim() ? 'No dances match that' : 'Nothing recorded yet'}>
            {query.trim()
              ? 'Try a different style, song or artist.'
              : 'Dances show up here as soon as a style is filled in.'}
          </Empty>
        ) : (
          <>
            <div className="eyebrow" style={{ padding: '14px 16px 4px' }}>
              {results.length} {results.length === 1 ? 'dance' : 'dances'}
            </div>
            {results.map(({ entry, couple }) => (
              <div className="result-row" key={entry.id}>
                <div className="result-row__top">
                  <span className="result-row__style">
                    <Highlight text={entry.danceStyle || 'Untitled dance'} query={query} />
                  </span>
                  <span className="result-row__who">{coupleName(couple)}</span>
                  <span className="result-row__meta num">Week {entry.week}</span>
                </div>
                {(entry.song || entry.songArtist) && (
                  <div className="result-row__song">
                    <Highlight text={entry.song || 'Unknown song'} query={query} />
                    {entry.songArtist ? <> — <Highlight text={entry.songArtist} query={query} /></> : null}
                  </div>
                )}
                <div className="result-row__scores">
                  <span>Judges <b className="num">{entry.judgeTotal || '—'}</b></span>
                  <span>Total <b className="num">{Number.isFinite(entry.totalScore) ? entry.totalScore : '—'}</b></span>
                  <span>Mine <b className="num">{Number.isFinite(entry.herScore) ? entry.herScore : '—'}</b></span>
                  {Number.isFinite(entry.weekPlacement) && (
                    <span>Placed <b className="num">{entry.weekPlacement}</b></span>
                  )}
                  {entry.guestJudgeName && <span>Guest: <b>{entry.guestJudgeName}</b></span>}
                </div>
                {entry.personalNotes.trim() && (
                  <div style={{ fontSize: '0.84rem', color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>
                    {entry.personalNotes}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}
