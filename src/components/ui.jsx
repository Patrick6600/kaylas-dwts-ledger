import { useEffect, useRef } from 'react'

/* The mirrorball. Used in three places only — the masthead, the loading state
   and the section divider — so it stays a motif rather than wallpaper. */
export function Mirrorball({ size = 34, spin = false, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={spin ? 'mirrorball--spin' : undefined}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <radialGradient id="bl-ball" cx="34%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#c9ccd8" />
          <stop offset="100%" stopColor="#4b4e66" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="17" fill="url(#bl-ball)" />
      <g stroke="#1a1033" strokeWidth="1" opacity="0.45" fill="none">
        <path d="M7 24h34M24 7v34" />
        <ellipse cx="24" cy="24" rx="8.5" ry="17" />
        <ellipse cx="24" cy="24" rx="17" ry="8.5" />
        <path d="M9 15.5h30M9 32.5h30" />
      </g>
      <circle cx="18" cy="17" r="3.4" fill="#ffffff" opacity="0.85" />
      <circle cx="30" cy="30" r="2" fill="#d7c2ff" opacity="0.55" />
    </svg>
  )
}

export function Divider() {
  return (
    <div className="divider" aria-hidden="true">
      <Mirrorball size={18} />
    </div>
  )
}

const ICON = {
  clipboard: 'M9 3h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2V4a1 1 0 0 1 1-1Zm0 4h6V5H9v2Z',
  trophy: 'M7 4h10v2h3v3a5 5 0 0 1-4 4.9V16h2.5a1 1 0 0 1 0 2h-7a1 1 0 0 1 0-2H14v-2.1A5 5 0 0 1 10 9V6H7V4Zm-3 2h2v3a3 3 0 0 1-2-2.8V6Zm14 0h2v.2A3 3 0 0 1 18 9V6Z',
  chart: 'M4 20V4h2v14h14v2H4Zm4-3V9h2v8H8Zm4 0V5h2v12h-2Zm4 0v-6h2v6h-2Z',
  search: 'M10.5 3a7.5 7.5 0 1 1-4.6 13.4l-3.2 3.2-1.4-1.4 3.2-3.2A7.5 7.5 0 0 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z',
  shield: 'M12 2l8 3.2v6c0 5-3.4 9.3-8 10.8-4.6-1.5-8-5.8-8-10.8v-6L12 2Z',
  chevron: 'M6.7 8.8 12 14l5.3-5.2 1.4 1.4-6.7 6.6-6.7-6.6 1.4-1.4Z',
}

export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={ICON[name]} />
    </svg>
  )
}

/* A confirm step in front of anything that destroys data. Traps nothing fancy —
   it focuses the safe button and closes on Escape. */
export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    cancelRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title">{title}</h3>
        <p>{body}</p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" ref={cancelRef} onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className={danger ? 'btn btn--danger' : 'btn btn--primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SectionHead({ title, subtitle, children }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
    </div>
  )
}
