import { useEffect, useRef, useState } from 'react'

/**
 * A numeric input that survives being typed in.
 *
 * Parsing on every keystroke and echoing the number back would eat a trailing
 * "." or a lone "-", so the raw string is held locally and only re-synced when
 * the stored value changes from somewhere else (an import, a reset).
 */
export function NumField({
  id, label, value, onChange, min, max, step = 1, integer = false,
  placeholder = '—', className = '', suffix, inputMode = 'decimal',
}) {
  const [raw, setRaw] = useState(value === null || value === undefined ? '' : String(value))
  const lastCommitted = useRef(value)

  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value
      setRaw(value === null || value === undefined ? '' : String(value))
    }
  }, [value])

  const commit = (text) => {
    if (text.trim() === '') {
      lastCommitted.current = null
      onChange(null)
      return
    }
    const n = Number(text)
    if (!Number.isFinite(n)) return
    let out = integer ? Math.round(n) : n
    if (min !== undefined) out = Math.max(min, out)
    if (max !== undefined) out = Math.min(max, out)
    lastCommitted.current = out
    onChange(out)
  }

  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}{suffix ? <span aria-hidden="true"> {suffix}</span> : null}</label>}
      <input
        id={id}
        className={`input num ${className}`}
        type="number"
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        value={raw}
        placeholder={placeholder}
        onChange={(e) => { setRaw(e.target.value); commit(e.target.value) }}
        onBlur={() => {
          // Snap the displayed text to whatever was actually stored.
          const v = lastCommitted.current
          setRaw(v === null || v === undefined ? '' : String(v))
        }}
      />
    </div>
  )
}
