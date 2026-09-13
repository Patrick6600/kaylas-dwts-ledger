import { useEffect, useMemo, useRef, useState } from 'react'
import { NumField } from './NumField.jsx'
import { ConfirmDialog, Icon, SectionHead, Empty } from './ui.jsx'
import { DANCE_STYLES, REGULAR_JUDGES } from '../data/roster.js'
import { activeCouplesForWeek, weekLeaderboard, shortName } from '../data/selectors.js'

function WeekBar({ weeks, week, setWeek, filledWeeks, onAddWeek }) {
  return (
    <div className="weekbar" role="tablist" aria-label="Season week">
      {weeks.map((w) => (
        <button
          key={w}
          type="button"
          role="tab"
          aria-pressed={w === week}
          aria-selected={w === week}
          className={`weekbar__tab${filledWeeks.has(w) ? ' weekbar__tab--filled' : ''}`}
          onClick={() => setWeek(w)}
        >
          <span>Week</span>
          <b className="num">{w}</b>
          {filledWeeks.has(w) && <i className="weekbar__dot" aria-hidden="true" />}
        </button>
      ))}
      <button type="button" className="weekbar__tab" onClick={onAddWeek} title="Add another week">
        <span>Add</span>
        <b aria-hidden="true">+</b>
        <span className="sr-only">Add another week to the season</span>
      </button>
    </div>
  )
}

const BOARD_PREVIEW = 5

function MiniLeaderboard({ rows, week }) {
  // Fifteen rows would push the entry cards off the bottom of a phone screen,
  // so the board opens as a top five and expands on request.
  const [showAll, setShowAll] = useState(false)
  const scored = rows.filter((r) => r.totalScore !== null)
  const shown = showAll ? rows : rows.slice(0, BOARD_PREVIEW)

  return (
    <div className="card panel">
      <div className="eyebrow">Week {week} standings</div>
      <h3 style={{ fontSize: '1.15rem', margin: '4px 0 10px' }}>Tonight&rsquo;s board</h3>
      {scored.length === 0 ? (
        <p style={{ color: 'var(--ink-3)', fontSize: '0.84rem', margin: 0 }}>
          Enter a total score and the board builds itself.
        </p>
      ) : (
        <div className="mini-board">
          {shown.map((row) => (
            <div
              key={row.couple.id}
              className={`mini-board__row${row.rank === 1 ? ' mini-board__row--top' : ''}`}
            >
              <div className="mini-board__rank num">{row.rank ?? '–'}</div>
              <div className="mini-board__name">
                {shortName(row.couple)}
                <div className="mini-board__sub">
                  {row.entry?.danceStyle?.trim() || 'No dance yet'}
                </div>
              </div>
              {row.totalScore !== null ? (
                <div className="mini-board__score num">{row.totalScore}</div>
              ) : (
                <div className="mini-board__score--pending">—</div>
              )}
            </div>
          ))}
          {rows.length > BOARD_PREVIEW && (
            <button
              type="button"
              className="mini-board__more"
              aria-expanded={showAll}
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? 'Show top five' : `Show all ${rows.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CoupleEntryCard({ couple, week, entry, expanded, onToggle, data, onRequestClear }) {
  const { updateEntry, setJudgeScore, setGuestJudge, setElimination } = data
  const hasGuest = entry.guestJudgeName !== null
  const judgeCount = hasGuest ? 4 : 3
  const filledScores = entry.judgeScores.slice(0, judgeCount).filter((s) => Number.isFinite(s)).length
  const allScoresIn = filledScores === judgeCount

  // A small settle when the last paddle lands. Fires on the transition into
  // "complete", never on every keystroke, and never on first render.
  const [settled, setSettled] = useState(false)
  const wasComplete = useRef(allScoresIn)
  useEffect(() => {
    if (allScoresIn && !wasComplete.current) {
      setSettled(true)
      const t = setTimeout(() => setSettled(false), 650)
      wasComplete.current = allScoresIn
      return () => clearTimeout(t)
    }
    wasComplete.current = allScoresIn
    return undefined
  }, [allScoresIn])

  // Opening a card halfway down a list of fifteen should bring it to the top,
  // not leave her hunting for the form she just opened.
  const cardRef = useRef(null)
  useEffect(() => {
    if (!expanded) return
    cardRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [expanded])

  const isOut = couple.eliminated
  const f = (name) => `${couple.id}-w${week}-${name}`

  return (
    <article ref={cardRef} className={`card couple-card${isOut ? ' couple-card--out' : ''}`}>
      <button
        type="button"
        className="couple-card__head"
        aria-expanded={expanded}
        aria-controls={`${couple.id}-body`}
        onClick={onToggle}
      >
        <div className="couple-card__names">
          <div className="couple-card__celeb">{couple.celebrityName}</div>
          <div className="couple-card__pro">with {couple.proName}</div>
        </div>
        {isOut && <span className="couple-card__badge">Out wk {couple.eliminatedWeek}</span>}
        <div
          className={`judge-pill${entry.judgeTotal ? '' : ' judge-pill--empty'}${settled ? ' judge-pill--settled' : ''}`}
        >
          <span>Judges</span>
          <b className="num">{entry.judgeTotal || '—'}</b>
        </div>
        <span className="couple-card__chevron"><Icon name="chevron" size={18} /></span>
      </button>

      {expanded && (
        <div className="couple-card__body" id={`${couple.id}-body`}>
          <div className="form-grid form-grid--2">
            <div className="field">
              <label htmlFor={f('style')}>Dance style</label>
              <input
                id={f('style')}
                className="input"
                list="dance-styles"
                value={entry.danceStyle}
                placeholder="Argentine Tango"
                onChange={(e) => updateEntry(couple.id, week, { danceStyle: e.target.value })}
              />
            </div>
            <NumField
              id={f('placement')}
              label="Week placement"
              value={entry.weekPlacement}
              min={1}
              max={30}
              integer
              onChange={(v) => updateEntry(couple.id, week, { weekPlacement: v })}
            />
          </div>

          <div className="form-grid form-grid--2">
            <div className="field">
              <label htmlFor={f('song')}>Song</label>
              <input
                id={f('song')}
                className="input"
                value={entry.song}
                placeholder="Song title"
                onChange={(e) => updateEntry(couple.id, week, { song: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={f('artist')}>Artist</label>
              <input
                id={f('artist')}
                className="input"
                value={entry.songArtist}
                placeholder="Performed by"
                onChange={(e) => updateEntry(couple.id, week, { songArtist: e.target.value })}
              />
            </div>
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: '18px 0 0' }}>
            <legend className="eyebrow" style={{ padding: 0, marginBottom: 8 }}>Judge scores</legend>
            <div className="scores">
              {REGULAR_JUDGES.map((judge, i) => (
                <NumField
                  key={judge}
                  id={f(`judge${i}`)}
                  label={judge.split(' ')[0]}
                  value={entry.judgeScores[i] ?? null}
                  min={0}
                  max={10}
                  step={0.5}
                  className="score-input"
                  onChange={(v) => setJudgeScore(couple.id, week, i, v)}
                />
              ))}
              {hasGuest && (
                <NumField
                  id={f('judge3')}
                  label={entry.guestJudgeName.trim() ? entry.guestJudgeName.split(' ')[0] : 'Guest'}
                  value={entry.judgeScores[3] ?? null}
                  min={0}
                  max={10}
                  step={0.5}
                  className="score-input"
                  onChange={(v) => setJudgeScore(couple.id, week, 3, v)}
                />
              )}
            </div>

            <label className="toggle-line">
              <input
                type="checkbox"
                checked={hasGuest}
                onChange={(e) => setGuestJudge(couple.id, week, e.target.checked ? '' : null)}
              />
              Guest judge on the panel this week
            </label>
            {hasGuest && (
              <div className="field">
                <label htmlFor={f('guest')}>Guest judge name</label>
                <input
                  id={f('guest')}
                  className="input"
                  value={entry.guestJudgeName}
                  placeholder="Who is on the panel?"
                  onChange={(e) => setGuestJudge(couple.id, week, e.target.value)}
                />
              </div>
            )}

            <div className="judge-strip">
              <div className={`judge-strip__total${settled ? ' is-settled' : ''}`}>
                <span className="eyebrow">Judge total</span>
                <b className="num">{entry.judgeTotal || 0}</b>
                <span style={{ color: 'var(--ink-3)', fontSize: '0.78rem' }}>/ {judgeCount * 10}</span>
              </div>
              <span style={{ color: 'var(--ink-3)', fontSize: '0.74rem' }}>
                {allScoresIn ? 'All paddles in' : `${filledScores} of ${judgeCount} entered`}
              </span>
            </div>
          </fieldset>

          <div className="form-grid form-grid--2" style={{ marginTop: 16 }}>
            <NumField
              id={f('total')}
              label="Total score (as aired)"
              value={entry.totalScore}
              min={0}
              step={0.5}
              onChange={(v) => updateEntry(couple.id, week, { totalScore: v })}
            />
            <NumField
              id={f('her')}
              label="My score"
              suffix="(1–10)"
              value={entry.herScore}
              min={1}
              max={10}
              step={0.5}
              onChange={(v) => updateEntry(couple.id, week, { herScore: v })}
            />
          </div>

          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor={f('judgenotes')}>Judge notes</label>
              <textarea
                id={f('judgenotes')}
                className="textarea"
                value={entry.judgeNotes}
                placeholder="What the panel said"
                onChange={(e) => updateEntry(couple.id, week, { judgeNotes: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={f('mynotes')}>My notes</label>
              <textarea
                id={f('mynotes')}
                className="textarea"
                value={entry.personalNotes}
                placeholder="What I thought"
                onChange={(e) => updateEntry(couple.id, week, { personalNotes: e.target.value })}
              />
            </div>
          </div>

          <div className="card-actions">
            {isOut ? (
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setElimination(couple.id, null)}
              >
                Undo elimination
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--sm btn--danger"
                onClick={() => setElimination(couple.id, week)}
              >
                Eliminated in week {week}
              </button>
            )}
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={onRequestClear}
            >
              Clear this week
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

export function WeeklyEntryView({ data, week, setWeek, weeks, onAddWeek }) {
  const { couples, entries, getEntry, clearEntry } = data
  const [openId, setOpenId] = useState(null)
  const [pendingClear, setPendingClear] = useState(null)

  const visible = useMemo(() => activeCouplesForWeek(couples, week), [couples, week])
  const board = useMemo(() => weekLeaderboard(couples, entries, week), [couples, entries, week])
  const filledWeeks = useMemo(() => new Set(entries.map((e) => e.week)), [entries])

  const entered = board.filter((r) => r.entry).length

  return (
    <>
      <SectionHead
        title="Weekly entry"
        subtitle="One card per couple. Judge total adds itself up; the total score and my score come from you."
      />

      <WeekBar
        weeks={weeks}
        week={week}
        setWeek={(w) => { setWeek(w); setOpenId(null) }}
        filledWeeks={filledWeeks}
        onAddWeek={onAddWeek}
      />

      <datalist id="dance-styles">
        {DANCE_STYLES.map((s) => <option key={s} value={s} />)}
      </datalist>

      <div className="entry-layout">
        <div>
          <div className="eyebrow" style={{ margin: '2px 0 12px' }}>
            {visible.length} couples dancing · {entered} entered
          </div>
          {visible.length === 0 ? (
            <Empty title="Nobody left to dance">
              Every couple is marked eliminated on or before week {week}.
            </Empty>
          ) : (
            visible.map((couple) => (
              <CoupleEntryCard
                key={couple.id}
                couple={couple}
                week={week}
                entry={getEntry(couple.id, week)}
                expanded={openId === couple.id}
                onToggle={() => setOpenId((id) => (id === couple.id ? null : couple.id))}
                data={data}
                onRequestClear={() => setPendingClear(couple)}
              />
            ))
          )}
        </div>

        <aside className="entry-layout__aside">
          <MiniLeaderboard rows={board} week={week} />
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(pendingClear)}
        title={`Clear week ${week}?`}
        body={`This erases everything recorded for ${pendingClear?.celebrityName ?? ''} in week ${week} — scores, song and notes. Other weeks are untouched.`}
        confirmLabel="Clear it"
        danger
        onCancel={() => setPendingClear(null)}
        onConfirm={() => {
          clearEntry(pendingClear.id, week)
          setPendingClear(null)
        }}
      />
    </>
  )
}
