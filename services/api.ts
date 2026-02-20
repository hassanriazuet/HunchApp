/**
 * Central network client for Hunch.
 *
 * - Exports a BASE_URL and small helpers: apiGet/apiPost/apiPut/apiDelete
 * - Provides a `fetchMarkets` helper that calls `/api/markets` and returns
 *   a normalized array of Market objects (falls back to MOCK_MARKETS if the
 *   response is unexpected).
 *
 * This file is intended to be the single place to add new API calls. It's
 * small, well-typed, and easy to extend when you reach ~100 endpoints.
 */

import { Market } from "../types";

export const BASE_URL = "https://hunch-backend-production.up.railway.app";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const defaultTimeout = 10_000; // 10s

function formatDurationUntil(endIso: any): string {
  if (!endIso) return "TBD";
  const end = new Date(endIso);
  if (isNaN(end.getTime())) return String(endIso ?? "TBD");
  const now = new Date();
  let delta = Math.floor((end.getTime() - now.getTime()) / 1000); // seconds
  if (delta <= 0) return "Closed";

  // Always show total days (no years/months). Then remaining h/m/s.
  const days = Math.floor(delta / (24 * 3600));
  delta -= days * 24 * 3600;
  const hours = Math.floor(delta / 3600);
  delta -= hours * 3600;
  const minutes = Math.floor(delta / 60);
  const seconds = delta - minutes * 60;

  const parts: string[] = [];
  // compact format: '70days 4hr 5min 3sec'
  if (days) parts.push(`${days}days`);
  if (hours) parts.push(`${hours}hr`);
  if (minutes) parts.push(`${minutes}min`);
  if (seconds) parts.push(`${seconds}sec`);

  return parts.join(" ") || "0sec";
}

function buildUrl(path: string) {
  // allow passing absolute URL or path starting with '/'
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function timeoutFetch(input: RequestInfo, init: RequestInit = {}, timeout = defaultTimeout) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function apiFetch(path: string, method: HttpMethod = "GET", body?: any, token?: string) {
  const url = buildUrl(path);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const init: RequestInit = {
    method,
    headers,
  };
  if (body != null) init.body = JSON.stringify(body);

  const res = await timeoutFetch(url, init);

  const contentType = res.headers.get("content-type") || "";
  let data: any = null;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const err: any = new Error(`API request failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export async function apiGet(path: string, token?: string) {
  return apiFetch(path, "GET", undefined, token);
}

export async function apiPost(path: string, body: any, token?: string) {
  return apiFetch(path, "POST", body, token);
}

export async function apiPut(path: string, body: any, token?: string) {
  return apiFetch(path, "PUT", body, token);
}

export async function apiDelete(path: string, token?: string) {
  return apiFetch(path, "DELETE", undefined, token);
}

/**
 * Fetch markets from backend and normalize to the local Market type.
 * Falls back to MOCK_MARKETS on error or unexpected shape.
 */
export async function fetchMarkets(limit = 20, offset = 0): Promise<{ cards: Market[]; eventsFetched: number }> {
  const qs = `?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`;

  // Try primary endpoint first, then fallback to alternative endpoint(s)
  const endpoints = [`/api/markets${qs}`, `/apiu/markets${qs}`];
  for (const ep of endpoints) {
    try {
      console.log(`services/api.fetchMarkets: trying ${ep}`);
      const data = await apiGet(ep);

      // Backend may return array or { markets: [] } or { data: [] } or { success: true, markets: [] }
      let raw: any[] = [];
      if (Array.isArray(data)) raw = data;
      else if (Array.isArray(data.markets)) raw = data.markets;
      else if (Array.isArray(data.data)) raw = data.data;
      else if (Array.isArray(data.results)) raw = data.results;
      else if (Array.isArray((data && data.markets && data.markets.data) ? data.markets.data : null)) raw = data.markets.data;

      if (!raw || raw.length === 0) {
        console.warn(`services/api.fetchMarkets: ${ep} returned empty or unexpected shape`);
        continue; // try next endpoint
      }

      // Map backend shapes to our Market shape conservatively
      // NOTE: do not slice here — return all items the backend provided so the
      // caller can decide how to paginate or display them.
      const cards: Market[] = raw.map((s: any) => ({
        id: String(s.id ?? s._id ?? s.slug ?? s.marketId ?? s.polymarket_id ?? ""),
        question: s.question ?? s.title ?? s.name ?? "Untitled",
        category: s.category ?? s.tags ?? s.topic ?? "General",
        yesPercent: (() => {
          const p = s.yesPercent ?? s.yes_price ?? s.probability ?? s.lastPrice ?? 0;
          if (p <= 1) return Math.round(Number(p) * 100);
          return Math.round(Number(p));
        })(),
  // convert end_date into a human-friendly duration from now using local timezone
  closingIn: formatDurationUntil(s.end_date ?? s.closingIn ?? s.time_to_close ?? s.expires ?? s.closes_in ?? null),
  // keep the raw ISO for live countdowns in the UI
  closingAt: s.end_date ?? s.closingIn ?? s.time_to_close ?? s.expires ?? s.closes_in ?? null,
        volume: typeof s.volume === "string" ? s.volume : `$${String(s.volume ?? s.volume_usd ?? 0)}`,
        price: Number(s.price ?? s.stake ?? s.lastPrice ?? 100),
        highlightWords: s.highlightWords ?? s.highlights ?? [],
      } as Market));

  return { cards, eventsFetched: raw.length };
    } catch (err) {
      console.warn(`services/api.fetchMarkets: ${ep} failed`, err);
      // try next endpoint
    }
  }

  // all endpoints failed or returned empty shape
  console.warn("fetchMarkets: all endpoints failed or returned unexpected data; returning empty list");
  return { cards: [], eventsFetched: 0 };
}

export default {
  BASE_URL,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  fetchMarkets,
};
