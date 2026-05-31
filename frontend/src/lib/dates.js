// Date helpers built on native Date + ISO `YYYY-MM-DD` strings.
// We compare DATE strings (not Date objects) for "past" checks to avoid timezone
// drift — local calendar day is what matters for meal planning.

// Local calendar today as ISO YYYY-MM-DD (NOT UTC).
export function todayISO() {
  return toISO(new Date())
}

// Format a Date as local YYYY-MM-DD.
export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Parse an ISO YYYY-MM-DD into a local Date (midnight local).
export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// True if the ISO date is strictly before today's local date.
export function isPastISO(iso) {
  return iso < todayISO()
}

// Add `n` days to an ISO date, returning a new ISO date.
export function addDaysISO(iso, n) {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

// Start of the week (Monday) for a given ISO date, returned as ISO.
export function startOfWeekISO(iso) {
  const d = fromISO(iso)
  const day = d.getDay() // 0=Sun..6=Sat
  const diff = (day + 6) % 7 // days since Monday
  d.setDate(d.getDate() - diff)
  return toISO(d)
}

// Inclusive list of ISO dates between two ISO dates (start..end).
export function rangeISO(startIso, endIso) {
  const out = []
  let cur = startIso
  while (cur <= endIso) {
    out.push(cur)
    cur = addDaysISO(cur, 1)
  }
  return out
}

// Human-friendly short label, e.g. "Mon, May 31".
export function formatHuman(iso) {
  const d = fromISO(iso)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
