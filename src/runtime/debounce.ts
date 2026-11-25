export interface Debounced<A extends unknown[]> {
  (...args: A): void
  /** Drops the pending call, if any. */
  cancel(): void
}

/** Calls `fn` `ms` after the last call, with that call's arguments. With no delay it calls at once. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> {
  let timeout: ReturnType<typeof setTimeout> | undefined

  function cancel() {
    if (timeout !== undefined) {
      clearTimeout(timeout)
      timeout = undefined
    }
  }

  function debounced(...args: A) {
    cancel()
    if (!ms) {
      fn(...args)
      return
    }
    timeout = setTimeout(() => {
      timeout = undefined
      fn(...args)
    }, ms)
  }

  return Object.assign(debounced, { cancel })
}
