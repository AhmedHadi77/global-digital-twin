export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function isBackendAwake() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function waitForBackend(
  options: {
    timeoutMs?: number;
    intervalMs?: number;
    onRetry?: (attempt: number, elapsedMs: number) => void;
  } = {}
) {
  const { timeoutMs = 65000, intervalMs = 2500, onRetry } = options;
  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < timeoutMs) {
    attempt += 1;

    if (await isBackendAwake()) {
      return true;
    }

    onRetry?.(attempt, Date.now() - start);
    await sleep(intervalMs);
  }

  return false;
}
