function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status) {
  return status === 429 || status >= 500;
}

export async function fetchJson(url, options = {}, settings = {}) {
  const {
    fetchImpl = fetch,
    notFoundReturnsNull = false,
    retries = 2,
    retryDelayMs = 300,
    timeoutMs = 10000
  } = settings;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (notFoundReturnsNull && response.status === 404) {
        return null;
      }

      if (!response.ok) {
        if (shouldRetry(response.status) && attempt < retries) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }
        throw new Error(`Request to ${url} failed with ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError;
}
