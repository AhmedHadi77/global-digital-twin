const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL = (
  configuredApiBase ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://global-digital-twin-backend.onrender.com")
).replace(/\/$/, "");

const API_REQUEST_TIMEOUT_MS = 12000;

export async function fetchFromApi(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
