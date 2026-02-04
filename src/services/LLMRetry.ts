export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  shouldRetry: (error: any) => boolean;
}

export const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('LLM request timeout')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]) as T;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

export const withRetry = async <T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions
): Promise<T> => {
  let lastError: any;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= options.retries || !options.shouldRetry(error)) {
        throw lastError;
      }
      const delay = options.baseDelayMs * (attempt + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};
