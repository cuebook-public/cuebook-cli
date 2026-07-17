const TRANSIENT_NETWORK_CODES = new Set([
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
])

interface ErrorLike {
  code?: unknown
  cause?: unknown
  message?: unknown
}

export function isTransientNetworkError(error: unknown): boolean {
  const seen = new Set<unknown>()
  let current: unknown = error

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current)
    const candidate = current as ErrorLike
    if (typeof candidate.code === "string" && TRANSIENT_NETWORK_CODES.has(candidate.code)) {
      return true
    }
    if (
      typeof candidate.message === "string" &&
      /fetch failed|network connection was lost|socket hang up/i.test(candidate.message)
    ) {
      return true
    }
    current = candidate.cause
  }

  return false
}

interface RetryOptions {
  attempts?: number
  baseDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
  wait?: (milliseconds: number) => Promise<void>
}

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, Math.floor(options.attempts ?? 3))
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 150)
  const shouldRetry = options.shouldRetry ?? isTransientNetworkError
  const waitForRetry = options.wait ?? wait

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === attempts || !shouldRetry(error)) throw error
      await waitForRetry(baseDelayMs * attempt)
    }
  }

  throw new Error("Retry attempts exhausted")
}
