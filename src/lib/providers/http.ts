export async function fetchText(
  url: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 15000);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        accept: "*/*",
        ...init?.headers
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const text = await fetchText(url, init);
  return JSON.parse(text) as T;
}
