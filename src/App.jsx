import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useSeasonData } from './hooks/useSeasonData.js'
import { WeeklyEntryView } from './components/WeeklyEntryView.jsx'
import { LeaderboardView } from './components/LeaderboardView.jsx'
import { SearchView } from './components/SearchView.jsx'
import { DataView } from './components/DataView.jsx'
import { Mirrorball, Icon } from './components/ui.jsx'
import { allWeeks } from './data/selectors.js'

// Recharts is by far the heaviest thing here and the entry screen is the one she
// opens every week, so the charts load only when she asks for them.
const ChartsView = lazy(() => import('./components/ChartsView.jsx')
  .then((m) => ({ default: m.ChartsView })))

const TABS = [
  { id: 'entry', label: 'Entry', icon: 'clipboard' },
  { id: 'board', label: 'Board', icon: 'trophy' },
  { id: 'trends', label: 'Trends', icon: 'chart' },
  { id: 'dances', label: 'Dances', icon: 'search' },
  { id: 'backup', label: 'Backup', icon: 'shield' },
]

function Splash({ children }) {
  return (
    <div className="splash">
      <div className="splash__inner">
        <Mirrorball size={72} spin title="Loading" />
        {children}
      </div>
    </div>
  )
}

export default function App() {
  const data = useSeasonData()
  const [tab, setTab] = useState('entry')
  const [week, setWeek] = useState(1)

  const weeks = useMemo(() => allWeeks(data.settings.totalWeeks), [data.settings.totalWeeks])

  // Open on the last week she actually touched — usually the one she is filling in.
  const [jumped, setJumped] = useState(false)
  useEffect(() => {
    if (jumped || data.status !== 'ready') return
    const latest = data.entries.reduce((max, e) => Math.max(max, e.week), 0)
    if (latest > 0) setWeek(latest)
    setJumped(true)
  }, [data.status, data.entries, jumped])

  const addWeek = () => data.updateSettings({ totalWeeks: data.settings.totalWeeks + 1 })

  if (data.status === 'loading') {
    return <div className="app"><Splash><p>Warming up the ballroom…</p></Splash></div>
  }

  if (data.status === 'error') {
    const blocked = /BLOCKED|TIMEOUT/.test(data.error?.message ?? '')
    return (
      <div className="app">
        <Splash>
          <div>
            <h2 style={{ marginBottom: 8 }}>The ledger could not open</h2>
            <p style={{ maxWidth: '44ch' }}>
              {blocked
                ? 'Another tab has the season open and is holding onto it. Close the other tabs, then reload this page.'
                : 'This browser blocked local storage — private browsing usually does. Try a normal window, and the season will be waiting.'}
            </p>
            <button
              type="button"
              className="btn btn--primary"
              style={{ marginTop: 18 }}
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        </Splash>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="masthead">
        <span className="masthead__ball"><Mirrorball size={42} /></span>
        <div>
          <div className="wordmark">Kayla’s DWTS Ledger</div>
          <div className="masthead__sub">Season {data.settings.seasonNumber}</div>
        </div>
      </header>

      <nav className="nav" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="nav__item"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'entry' && (
          <WeeklyEntryView
            data={data}
            week={week}
            setWeek={setWeek}
            weeks={weeks}
            onAddWeek={addWeek}
          />
        )}
        {tab === 'board' && <LeaderboardView data={data} />}
        {tab === 'trends' && (
          <Suspense fallback={<Splash><p>Polishing the mirrorball…</p></Splash>}>
            <ChartsView data={data} />
          </Suspense>
        )}
        {tab === 'dances' && <SearchView data={data} />}
        {tab === 'backup' && <DataView data={data} />}
      </main>
    </div>
  )
}
