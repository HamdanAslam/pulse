const env = import.meta.env || {};

function normalizeApiBase(rawBase) {
  if (!rawBase) return "/api";
  return rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
}

const API_BASE = normalizeApiBase(env.VITE_API_URL);

function looksLikeHtmlDocument(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("<!doctype html") || normalized.startsWith("<html");
}

function normalizeHtmlErrorMessage(status, path) {
  if (status === 404) {
    return `API route not found: ${API_BASE}${path}. The deployed frontend is likely hitting a server or proxy that does not expose this backend route.`;
  }
  return `Expected an API response from ${API_BASE}${path}, but received an HTML page instead. Check the deployed API origin and reverse proxy configuration.`;
}

function normalizeErrorMessage(payload, status) {
  if (!payload) return `HTTP ${status}`;
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) {
    const messages = payload.map((item) => normalizeErrorMessage(item, status)).filter(Boolean);
    return messages[0] || `HTTP ${status}`;
  }
  if (typeof payload === "object") {
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      return normalizeErrorMessage(payload.errors, status);
    }
  }
  return `HTTP ${status}`;
}

async function request(path, options = {}) {
  const { body, headers, ...rest } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let payload = text;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (looksLikeHtmlDocument(payload)) {
      throw new Error(normalizeHtmlErrorMessage(response.status, path));
    }

    throw new Error(normalizeErrorMessage(payload, response.status));
  }
  if (response.status === 204) return undefined;
  return response.json();
}

export const http = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};
