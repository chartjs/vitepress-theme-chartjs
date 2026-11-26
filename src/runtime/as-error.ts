/** What was thrown, as an `Error`: samples and Chart.js may throw anything. */
export function asError(thrown: unknown): Error {
  return thrown instanceof Error ? thrown : new Error(String(thrown))
}
