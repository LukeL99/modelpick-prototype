/**
 * Adaptive exponential backoff with jitter for rate-limited API calls.
 *
 * Handles 429 (Too Many Requests) responses by:
 * - Respecting Retry-After header when present
 * - Using exponential backoff with jitter when no header
 * - Capping delay at maxDelayMs
 * - Retrying up to maxRetries times
 */

export interface BackoffOptions {
  /** Maximum number of retries (default: 5) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
}

interface RateLimitError {
  status?: number;
  headers?: Map<string, string> | Headers | Record<string, string>;
}

/**
 * Extract Retry-After value from various header formats.
 */
function getRetryAfterMs(error: RateLimitError): number | null {
  const headers = error.headers;
  if (!headers) return null;

  let value: string | null = null;

  if (headers instanceof Map) {
    value = headers.get("retry-after") ?? null;
  } else if (typeof (headers as Headers).get === "function") {
    value = (headers as Headers).get("retry-after");
  } else if (typeof headers === "object") {
    value = (headers as Record<string, string>)["retry-after"] ?? null;
  }

  if (value === null) return null;

  const seconds = parseFloat(value);
  if (isNaN(seconds)) return null;

  return seconds * 1000;
}

/**
 * Check if an error is a 429 rate limit error.
 */
function is429(error: unknown): error is RateLimitError {
  if (error && typeof error === "object" && "status" in error) {
    return (error as RateLimitError).status === 429;
  }
  return false;
}

/**
 * Wait for a specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with automatic retry on 429 rate limit errors.
 *
 * On 429 response:
 * - If Retry-After header present, wait that many seconds
 * - Otherwise, wait: min(baseDelay * 2^attempt + random(0, 1000), maxDelay)
 * - Retry up to maxRetries times
 *
 * Non-429 errors are thrown immediately without retry.
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  options?: BackoffOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 5;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 30000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Only retry on 429 errors
      if (!is429(error)) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        break;
      }

      // Calculate delay
      const retryAfterMs = getRetryAfterMs(error);
      let delay: number;

      if (retryAfterMs !== null) {
        delay = retryAfterMs;
      } else {
        // Exponential backoff with jitter
        const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        delay = Math.min(exponentialDelay + jitter, maxDelayMs);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}
