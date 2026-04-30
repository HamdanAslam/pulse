import { env } from "../config/env.js";

const URL_RE = /\b((https?:\/\/|www\.)[^\s<]+)/gi;
const MAX_URLS_PER_MESSAGE = 2;
const REQUEST_TIMEOUT_MS = 3500;
const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0$|::1$|fc00:|fd00:)/i;

function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const candidate = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : `https://${rawUrl}`;
  try {
    return new URL(candidate).href;
  } catch {
    return "";
  }
}

function isPrivateHostname(hostname) {
  if (!hostname) return true;
  if (PRIVATE_HOST_RE.test(hostname)) return true;
  const match = hostname.match(/^172\.(\d{1,3})\./);
  if (!match) return false;
  const segment = Number(match[1]);
  return Number.isFinite(segment) && segment >= 16 && segment <= 31;
}

function isSafePublicUrl(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    return !isPrivateHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function extractMetaContent(html, key, attribute = "property") {
  const pattern = new RegExp(
    `<meta[^>]+${attribute}=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${key}["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1] || match?.[2] || "";
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() || "";
}

function decodeEntities(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absoluteUrl(baseUrl, candidate) {
  if (!candidate) return "";
  try {
    return new URL(candidate, baseUrl).href;
  } catch {
    return "";
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": "PulseBot/1.0",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseGiphyId(url) {
  try {
    const parsed = new URL(url);
    if (!/giphy\.com$/i.test(parsed.hostname) && !/giphy\.com$/i.test(parsed.hostname.replace(/^media\./i, ""))) {
      return "";
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    const mediaIndex = segments.findIndex((segment) => segment === "media");
    if (mediaIndex !== -1 && segments[mediaIndex + 1]) {
      return segments[mediaIndex + 1];
    }
    const last = segments[segments.length - 1] || "";
    if (last.includes("-")) return last.split("-").pop() || "";
    return "";
  } catch {
    return "";
  }
}

function mapGiphyGif(gif, sourceUrl) {
  if (!gif) return null;
  const image = gif.images?.fixed_width || gif.images?.downsized_medium || gif.images?.original;
  if (!image?.url) return null;
  return {
    type: "gif",
    sourceUrl,
    url: gif.url || sourceUrl,
    title: gif.title || "GIF",
    description: "",
    siteName: "GIPHY",
    imageUrl: image.url,
    width: Number(image.width) || 0,
    height: Number(image.height) || 0,
  };
}

async function resolveGiphyEmbed(url) {
  const gifId = parseGiphyId(url);
  if (!gifId || !env.giphy.apiKey) return null;
  const response = await fetchWithTimeout(
    `https://api.giphy.com/v1/gifs/${encodeURIComponent(gifId)}?api_key=${encodeURIComponent(env.giphy.apiKey)}`,
    { headers: { accept: "application/json" } },
  ).catch(() => null);
  if (!response?.ok) return null;
  const payload = await response.json().catch(() => null);
  return mapGiphyGif(payload?.data, url);
}

async function resolveGenericEmbed(url) {
  if (!isSafePublicUrl(url)) return null;
  const response = await fetchWithTimeout(url, {
    headers: { accept: "text/html,application/xhtml+xml" },
  }).catch(() => null);
  if (!response?.ok) return null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    return {
      type: "link",
      sourceUrl: url,
      url: response.url || url,
      title: "",
      description: "",
      siteName: new URL(response.url || url).hostname,
      imageUrl: response.url || url,
      width: 0,
      height: 0,
    };
  }
  if (!contentType.includes("text/html")) return null;
  const html = await response.text().catch(() => "");
  if (!html) return null;
  const finalUrl = response.url || url;
  const title = decodeEntities(
    extractMetaContent(html, "og:title") || extractMetaContent(html, "twitter:title", "name") || extractTitle(html),
  );
  const description = decodeEntities(
    extractMetaContent(html, "og:description") ||
      extractMetaContent(html, "description", "name") ||
      extractMetaContent(html, "twitter:description", "name"),
  );
  const siteName = decodeEntities(
    extractMetaContent(html, "og:site_name") || new URL(finalUrl).hostname.replace(/^www\./i, ""),
  );
  const imageUrl = absoluteUrl(
    finalUrl,
    extractMetaContent(html, "og:image") || extractMetaContent(html, "twitter:image", "name"),
  );
  if (!title && !description && !imageUrl) return null;
  return {
    type: "link",
    sourceUrl: url,
    url: finalUrl,
    title,
    description,
    siteName,
    imageUrl,
    width: 0,
    height: 0,
  };
}

export function extractUrls(content = "") {
  const matches = content.match(URL_RE) || [];
  const unique = [];
  const seen = new Set();
  for (const match of matches) {
    const url = normalizeUrl(match);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    unique.push(url);
    if (unique.length >= MAX_URLS_PER_MESSAGE) break;
  }
  return unique;
}

export async function resolveEmbeds(content = "") {
  const urls = extractUrls(content);
  if (!urls.length) return [];
  const embeds = await Promise.all(
    urls.map(async (url) => {
      if (/giphy\.com/i.test(url)) {
        return resolveGiphyEmbed(url).catch(() => null);
      }
      return resolveGenericEmbed(url).catch(() => null);
    }),
  );
  return embeds.filter(Boolean);
}

export async function searchGifs(query = "") {
  if (!env.giphy.apiKey) return [];
  const trimmed = query.trim();
  const endpoint = trimmed ? "search" : "trending";
  const params = new URLSearchParams({
    api_key: env.giphy.apiKey,
    limit: "12",
    rating: "pg-13",
  });
  if (trimmed) params.set("q", trimmed);
  const response = await fetchWithTimeout(`https://api.giphy.com/v1/gifs/${endpoint}?${params.toString()}`, {
    headers: { accept: "application/json" },
  }).catch(() => null);
  if (!response?.ok) return [];
  const payload = await response.json().catch(() => null);
  return (payload?.data || [])
    .map((gif) => {
      const preview = gif.images?.fixed_width_small || gif.images?.fixed_width || gif.images?.downsized_medium;
      if (!preview?.url || !gif.url) return null;
      return {
        id: gif.id,
        url: gif.url,
        title: gif.title || "GIF",
        previewUrl: preview.url,
        width: Number(preview.width) || 0,
        height: Number(preview.height) || 0,
      };
    })
    .filter(Boolean);
}
