import { useMemo, useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { SectionHead, Empty, Divider } from './ui.jsx'
import {
  METRIC_LIST, coupleTrend, weeklyMaxima, weeksWithData, coupleName, shortName, seasonTotals,
} from '../data/selectors.js'

/* Validated against the app chart surface (#1d1240) with
   scripts/validate_palette.js — adjacent CVD ΔE 8.4, normal-vision ΔE 19.3,
   every slot ≥ 3:1. Assigned in this fixed order, never cycled. */
const CATEGORICAL = [
  '#3987e5', '#d95926', '#199e70', '#c98500',
  '#d55181', '#008300', '#9085e9', '#e66767',
]
const MAX_COMPARE = CATEGORICAL.length

const AXIS = { fill: '#9a93b5', fontSize: 11, fontFamily: 'Jost, sans-serif' }
const GRID = '#2f2258'

function Legend({ items }) {
  return (
    <div className="legend">
      {items.map((item) => (
        <span className="legend__item" key={item.label}>
          <span className="legend__key" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function TrendTooltip({ active, payload, label, suffix = '', meta }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const note = meta ? meta(row) : null
  return (
    <div className="tooltip">
      <div className="tooltip__head">Week {label}</div>
      {payload.map((p) => (
        <div className="tooltip__row" key={p.dataKey}>
          <span className="legend__key" style={{ background: p.stroke }} />
          <span style={{ color: 'var(--ink-2)' }}>{p.name}</span>
          <span>{p.value === null || p.value === undefined ? '—' : `${p.value}${suffix}`}</span>
        </div>
      ))}
      {note && <div className="tooltip__meta">{note}</div>}
    </div>
  )
}

/* Direct label on the final plotted point — identity without reading the legend.
   Only <= 4 series are ever direct-labelled, per the house chart rules. */
const LABEL_MAX_CHARS = 13

function makeLastLabel(lastIndex, text, color, dy = 0) {
  // The label sits in the right-hand margin, so a long name has to be clipped
  // rather than allowed to run off the edge of the card.
  const shown = text.length > LABEL_MAX_CHARS ? `${text.slice(0, LABEL_MAX_CHARS - 1)}…` : text
  return function LastLabel(props) {
    const { x, y, index } = props
    if (index !== lastIndex || x === undefined || y === undefined) return null
    return (
      <text x={x + 8} y={y + 4 + dy} fill={color} fontSize={11} fontFamily="Jost, sans-serif">
        <title>{text}</title>
        {shown}
      </text>
    )
  }
}

/* Series that finish the season neck and neck would print their labels on top of
   each other. Push the lower ones down until they clear, so the text stays
   readable and still points at the right line. */
const LABEL_GAP = 14

function staggerLabels(rows, keys, plotHeight, [lo, hi]) {
  const span = hi - lo || 1
  const placed = keys
    .map((key) => {
      const index = lastIndexWithValue(rows, key)
      return { key, index, value: index >= 0 ? rows[index][key] : null }
    })
    .filter((item) => item.value !== null)
    .sort((a, b) => b.value - a.value)

  const offsets = {}
  let floor = -Infinity
  placed.forEach((item) => {
    const y = ((hi - item.value) / span) * plotHeight
    const at = Math.max(y, floor + LABEL_GAP)
    offsets[item.key] = at - y
    floor = at
  })
  return offsets
}

function lastIndexWithValue(rows, key) {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i][key] !== null && rows[i][key] !== undefined) return i
  }
  return -1
}

function DataTable({ rows, columns, caption }) {
  return (
    <div className="table-wrap">
      <table className="ledger" style={{ minWidth: 380 }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            {columns.map((c) => <th scope="col" key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.week}>
              <th scope="row" style={{ textAlign: 'left', fontWeight: 400 }} className="num">{row.week}</th>
              {columns.map((c) => (
                <td className="num" key={c.key}>
                  {row[c.key] === null || row[c.key] === undefined ? '—' : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ single */

const INDEXED_DOMAIN = [0, 100]
const INDEXED_PLOT_H = 238
const COMPARE_PLOT_H = 258

function SingleCoupleChart({ rows, scale }) {
  const indexed = scale === 'indexed'
  const offsets = useMemo(
    () => staggerLabels(rows, METRIC_LIST.map((m) => `${m.key}Indexed`), INDEXED_PLOT_H, INDEXED_DOMAIN),
    [rows],
  )

  if (indexed) {
    return (
      <>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={rows} margin={{ top: 8, right: 58, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis
              domain={INDEXED_DOMAIN}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              width={46}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={<TrendTooltip suffix="%" meta={(r) => (r?.entry?.danceStyle ? r.entry.danceStyle : null)} />}
              cursor={{ stroke: '#7d7f96', strokeWidth: 1 }}
            />
            {METRIC_LIST.map((m) => {
              const key = `${m.key}Indexed`
              const last = lastIndexWithValue(rows, key)
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: m.color, stroke: '#1d1240', strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: '#1d1240', strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                  label={makeLastLabel(last, m.label.split(' ')[0], m.color, offsets[key] ?? 0)}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
        <Legend items={METRIC_LIST.map((m) => ({ label: m.label, color: m.color }))} />
      </>
    )
  }

  // Raw values sit on three different scales, so they get three panels rather
  // than a second y-axis.
  return (
    <div className="small-multiples">
      {METRIC_LIST.map((m, i) => (
        <div key={m.key}>
          <div className="legend" style={{ paddingBottom: 2 }}>
            <span className="legend__item">
              <span className="legend__key" style={{ background: m.color }} />
              {m.label}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={rows} margin={{ top: 4, right: 18, bottom: i === METRIC_LIST.length - 1 ? 4 : 0, left: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="week"
                tick={i === METRIC_LIST.length - 1 ? AXIS : false}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                height={i === METRIC_LIST.length - 1 ? 24 : 10}
              />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={46} />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#7d7f96', strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={2}
                dot={{ r: 4, fill: m.color, stroke: '#1d1240', strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: '#1d1240', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------- compare */

function CompareChart({ weeks, series, metric }) {
  const rows = useMemo(() => weeks.map((week) => {
    const row = { week }
    series.forEach((s) => { row[s.id] = s.byWeek.get(week) ?? null })
    return row
  }), [weeks, series])

  // A fitted domain: judge totals separated by a point or two are the whole
  // point of this chart, and a 0-based axis flattens them into one line.
  const domain = useMemo(() => {
    const values = rows.flatMap((r) => series.map((s) => r[s.id])).filter(Number.isFinite)
    if (!values.length) return [0, 10]
    const lo = Math.min(...values)
    const hi = Math.max(...values)
    const pad = Math.max(1, (hi - lo) * 0.25)
    return [Math.max(0, Math.floor(lo - pad)), Math.ceil(hi + pad)]
  }, [rows, series])

  const offsets = useMemo(
    () => staggerLabels(rows, series.map((s) => s.id), COMPARE_PLOT_H, domain),
    [rows, series, domain],
  )

  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={rows} margin={{ top: 8, right: 78, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis domain={domain} tick={AXIS} tickLine={false} axisLine={false} width={46} allowDecimals={false} />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#7d7f96', strokeWidth: 1 }} />
          {series.map((s) => {
            const last = lastIndexWithValue(rows, s.id)
            return (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 4, fill: s.color, stroke: '#1d1240', strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: '#1d1240', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
                label={series.length <= 4
                  ? makeLastLabel(last, s.label, s.color, offsets[s.id] ?? 0)
                  : undefined}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
      <p style={{ padding: '0 16px 8px', margin: 0, color: 'var(--ink-3)', fontSize: '0.78rem' }}>
        Raw {metric.label.toLowerCase()} per week, on a fitted axis. A line that stops is a
        couple that went home.
      </p>
    </>
  )
}

export function ChartsView({ data }) {
  const { couples, entries, settings } = data
  const [mode, setMode] = useState('single')
  const [scale, setScale] = useState('indexed')
  const [showTable, setShowTable] = useState(false)
  const [selectedId, setSelectedId] = useState(couples[0]?.id ?? null)
  const [compareMetric, setCompareMetric] = useState('judgeTotal')

  // Colour follows the couple, not their position in the list. Each selection
  // holds its palette slot until that couple is removed, so de-selecting one
  // never repaints the survivors. Kept in state, not a ref, because the colours
  // have to be known during the same render that draws the lines.
  const [compare, setCompare] = useState([])
  const slotOf = (id) => compare.find((x) => x.id === id)?.slot

  const weeks = useMemo(() => weeksWithData(entries, settings.totalWeeks), [entries, settings.totalWeeks])
  const maxima = useMemo(() => weeklyMaxima(entries, weeks), [entries, weeks])

  const selected = couples.find((c) => c.id === selectedId) ?? couples[0] ?? null
  const singleRows = useMemo(
    () => (selected ? coupleTrend(entries, selected.id, weeks, maxima) : []),
    [entries, selected, weeks, maxima],
  )

  const totals = useMemo(
    () => seasonTotals(couples, entries, settings.herScoreMode),
    [couples, entries, settings.herScoreMode],
  )
  const selectedTotals = totals.find((t) => t.couple.id === selected?.id)

  const compareSeries = useMemo(() => compare.map(({ id, slot }) => {
    const couple = couples.find((c) => c.id === id)
    const byWeek = new Map()
    entries.filter((e) => e.coupleId === id).forEach((e) => {
      const v = compareMetric === 'judgeTotal' ? (e.judgeTotal || null) : e[compareMetric]
      byWeek.set(e.week, Number.isFinite(v) ? v : null)
    })
    return {
      id,
      label: shortName(couple),
      color: CATEGORICAL[slot],
      byWeek,
    }
  }), [compare, couples, entries, compareMetric])

  const toggleCompare = (id) => {
    setCompare((prev) => {
      if (prev.some((x) => x.id === id)) return prev.filter((x) => x.id !== id)
      if (prev.length >= MAX_COMPARE) return prev
      const used = new Set(prev.map((x) => x.slot))
      let slot = 0
      while (used.has(slot)) slot += 1
      return [...prev, { id, slot }]
    })
  }

  if (!entries.length) {
    return (
      <>
        <SectionHead title="Trends" subtitle="The judges and me — week by week." />
        <div className="card">
          <Empty title="No dances recorded yet">
            The charts fill in from week 1 onwards.
          </Empty>
        </div>
      </>
    )
  }

  return (
    <>
      <SectionHead
        title="Trends"
        subtitle="Where the judges and my own scoring agree — and where they part company."
      >
        <div className="segmented" role="group" aria-label="Chart mode">
          <button type="button" aria-pressed={mode === 'single'} onClick={() => setMode('single')}>One couple</button>
          <button type="button" aria-pressed={mode === 'compare'} onClick={() => setMode('compare')}>Compare</button>
        </div>
      </SectionHead>

      {mode === 'single' ? (
        <>
          <div className="card panel" style={{ marginBottom: 14 }}>
            <div className="field">
              <label htmlFor="couple-picker">Couple</label>
              <select
                id="couple-picker"
                className="select"
                value={selected?.id ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {couples.map((c) => (
                  <option key={c.id} value={c.id}>
                    {coupleName(c)}{c.eliminated ? ` — out wk ${c.eliminatedWeek}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedTotals && (
              <div className="stat-row" style={{ marginTop: 14 }}>
                <div className="stat">
                  <b className="num" style={{ color: 'var(--series-judge)' }}>{selectedTotals.cumulativeJudgeTotal || '—'}</b>
                  <span>Judge total</span>
                </div>
                <div className="stat">
                  <b className="num" style={{ color: 'var(--series-her)' }}>
                    {settings.herScoreMode === 'average'
                      ? (selectedTotals.herScoreCount ? selectedTotals.cumulativeHerScore.toFixed(1) : '—')
                      : (selectedTotals.cumulativeHerScore || '—')}
                  </b>
                  <span>My score ({settings.herScoreMode})</span>
                </div>
                <div className="stat">
                  <b className="num">{selectedTotals.weeksDanced || '—'}</b>
                  <span>Weeks danced</span>
                </div>
              </div>
            )}
          </div>

          <div className="card chart-card">
            <div className="chart-head">
              <div className="eyebrow">{selected ? coupleName(selected) : ''}</div>
              <h3 style={{ fontSize: '1.15rem', margin: '4px 0 10px' }}>
                {scale === 'indexed' ? 'Standing against the field' : 'Raw scores'}
              </h3>
              <p style={{ margin: '0 0 10px', color: 'var(--ink-3)', fontSize: '0.8rem', maxWidth: '58ch' }}>
                {scale === 'indexed'
                  ? 'Each line is that week’s score as a share of the highest anyone scored that week, so both sit on one axis. 100% means nobody beat them.'
                  : 'The numbers as recorded. Two panels, because a judge total out of 30 and a score out of 10 do not belong on the same axis.'}
              </p>
              <div className="chip-row">
                <div className="segmented" role="group" aria-label="Scale">
                  <button type="button" aria-pressed={scale === 'indexed'} onClick={() => setScale('indexed')}>Indexed</button>
                  <button type="button" aria-pressed={scale === 'raw'} onClick={() => setScale('raw')}>Raw</button>
                </div>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  aria-pressed={showTable}
                  onClick={() => setShowTable((v) => !v)}
                >
                  {showTable ? 'Hide table' : 'Show table'}
                </button>
              </div>
            </div>

            <SingleCoupleChart rows={singleRows} scale={scale} />

            {showTable && (
              <div style={{ padding: '8px 16px 12px' }}>
                <DataTable
                  rows={singleRows}
                  columns={METRIC_LIST.map((m) => ({
                    key: scale === 'indexed' ? `${m.key}Indexed` : m.key,
                    label: m.label,
                  }))}
                  caption={`Week by week scores for ${selected ? coupleName(selected) : 'this couple'}`}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card panel" style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Pick my favourites — up to {MAX_COMPARE}
            </div>
            <div className="chip-row">
              {couples.map((c) => {
                const slot = slotOf(c.id)
                const on = slot !== undefined
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="chip"
                    aria-pressed={on}
                    disabled={!on && compare.length >= MAX_COMPARE}
                    onClick={() => toggleCompare(c.id)}
                  >
                    {on && (
                      <span className="chip__swatch" style={{ background: CATEGORICAL[slot] }} />
                    )}
                    {shortName(c)}
                  </button>
                )
              })}
            </div>

            <Divider />

            <div className="field">
              <label htmlFor="metric-picker">Measure</label>
              <select
                id="metric-picker"
                className="select"
                value={compareMetric}
                onChange={(e) => setCompareMetric(e.target.value)}
              >
                {METRIC_LIST.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="card chart-card">
            {compareSeries.length < 2 ? (
              <Empty title="Choose two or more couples">
                Their lines get overlaid so you can see who is pulling ahead.
              </Empty>
            ) : (
              <CompareChart
                weeks={weeks}
                series={compareSeries}
                metric={METRIC_LIST.find((m) => m.key === compareMetric)}
              />
            )}
          </div>
        </>
      )}
    </>
  )
}
