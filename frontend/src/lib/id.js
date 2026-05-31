// Centralized ID generation. crypto.randomUUID() is available in modern browsers
// and Node 24 (test env). Keep this the single source so it's trivial to swap.
export function newId() {
  return crypto.randomUUID()
}
