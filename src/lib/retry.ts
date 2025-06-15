
/**
 * Retries an async function with exponential backoff.
 *
 * @param fn The async function to retry.
 * @param options Configuration for retries, delay, and a callback on each retry.
 * @returns The result of the async function if it succeeds.
 * @throws The last error if all retries fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, delay = 1000, onRetry }: { retries?: number; delay?: number; onRetry?: (error: Error, attempt: number) => void } = {}
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (onRetry) {
        onRetry(error, i + 1);
      }
      if (i < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s, ...
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}
