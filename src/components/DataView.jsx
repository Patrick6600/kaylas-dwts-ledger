import { useRef, useState } from 'react'
import { ConfirmDialog, SectionHead, Divider } from './ui.jsx'

function downloadJson(bundle) {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kaylas-dwts-ledger-season-${bundle.seasonNumber}-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so Safari has actually started the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function DataView({ data }) {
  const { buildBundle, importBundle, resetSeason, entries, couples, settings, updateSettings } = data
  const fileRef = useRef(null)
  const [pendingImport, setPendingImport] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [message, setMessage] = useState(null)

  const handleFile = async (file) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const count = Array.isArray(parsed.entries) ? parsed.entries.length : 0
      setPendingImport({ parsed, name: file.name, count })
    } catch {
      setMessage({ kind: 'warn', text: 'That file could not be read as JSON.' })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <SectionHead
        title="Backup & season setup"
        subtitle="The season lives in this browser only. The JSON file is the safety net — take one after each episode."
      />

      {message && (
        <div className={`callout callout--${message.kind}`} style={{ marginBottom: 14 }} role="status">
          {message.text}
        </div>
      )}

      <div className="card panel">
        <h3 style={{ fontSize: '1.15rem' }}>Export</h3>
        <p style={{ color: 'var(--ink-3)', fontSize: '0.86rem', margin: '6px 0 14px' }}>
          Downloads everything — {couples.length} couples and {entries.length}{' '}
          {entries.length === 1 ? 'entry' : 'entries'} — as one file you can keep anywhere.
        </p>
        <button type="button" className="btn btn--primary" onClick={() => { downloadJson(buildBundle()); setMessage({ kind: 'ok', text: 'Backup downloaded.' }) }}>
          Export data as JSON
        </button>

        <Divider />

        <h3 style={{ fontSize: '1.15rem' }}>Import</h3>
        <p style={{ color: 'var(--ink-3)', fontSize: '0.86rem', margin: '6px 0 14px' }}>
          Restores from a backup file. This replaces whatever is in the browser right now,
          so it asks first.
        </p>
        <input
          ref={fileRef}
          id="import-file"
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <label className="btn" htmlFor="import-file" style={{ cursor: 'pointer' }}>
          Import from JSON
        </label>
      </div>

      <div className="card panel" style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: '1.15rem' }}>Season</h3>
        <div className="form-grid form-grid--2" style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="season-number">Season number</label>
            <input
              id="season-number"
              className="input num"
              type="number"
              min={1}
              value={settings.seasonNumber}
              onChange={(e) => updateSettings({ seasonNumber: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="total-weeks">Weeks in the season</label>
            <input
              id="total-weeks"
              className="input num"
              type="number"
              min={1}
              max={40}
              value={settings.totalWeeks}
              onChange={(e) => updateSettings({ totalWeeks: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="card panel" style={{ marginTop: 14, borderColor: 'rgba(224, 82, 122, 0.35)' }}>
        <h3 style={{ fontSize: '1.15rem' }}>Start over</h3>
        <p style={{ color: 'var(--ink-3)', fontSize: '0.86rem', margin: '6px 0 14px' }}>
          Clears every entry and puts the roster back the way it started. Export first.
        </p>
        <button type="button" className="btn btn--danger" onClick={() => setConfirmReset(true)}>
          Reset the season
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="Replace the current season?"
        body={`Importing ${pendingImport?.name ?? 'this file'} (${pendingImport?.count ?? 0} entries) overwrites everything stored in this browser. That cannot be undone.`}
        confirmLabel="Import and replace"
        danger
        onCancel={() => setPendingImport(null)}
        onConfirm={async () => {
          try {
            const result = await importBundle(pendingImport.parsed)
            setMessage({ kind: 'ok', text: `Restored ${result.entries} entries for ${result.couples} couples.` })
          } catch (err) {
            setMessage({ kind: 'warn', text: err.message })
          }
          setPendingImport(null)
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Reset the whole season?"
        body={`Every score, note and elimination is deleted and the ${couples.length} couples go back to week one. If you have not exported a backup, do that first.`}
        confirmLabel="Delete everything"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          await resetSeason()
          setConfirmReset(false)
          setMessage({ kind: 'ok', text: 'Season reset. Ready for premiere night.' })
        }}
      />
    </>
  )
}
