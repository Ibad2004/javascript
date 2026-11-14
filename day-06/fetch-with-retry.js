import { setTimeout as delay } from "node:timers/promises";
import { config } from "./config.js";

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS_LIMIT = 10;
const MAX_TIMER_MS = 2147483647;

const describe = (value) => (typeof value === "string" ? `"${value}"` : String(value));

function checkUrl(url) {
  if (typeof url !== "string" || !URL.canParse(url)) {
    throw new TypeError(`url must be a valid http(s) URL, got ${describe(url)}`);
  }
  const { protocol } = new URL(url);
  if (protocol !== "http:" && protocol !== "https:") {
    throw new TypeError(`url must start with http:// or https://, got ${describe(url)}`);
  }
}

function checkNumber(name, value, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number, got ${describe(value)}`);
  }
  if (value < min || value > max) {
    throw new RangeError(`${name} must be from ${min} to ${max}, got ${value}`);
  }
}

function checkFunction(name, value) {
  if (typeof value !== "function") {
    throw new TypeError(`${name} must be a function, got ${describe(value)}`);
  }
}

function resolveOptions(url, options) {
  checkUrl(url);
  if (options === null || typeof options !== "object") {
    throw new TypeError(`options must be an object, got ${describe(options)}`);
  }
  const {
    maxAttempts = config.maxAttempts,
    timeoutMs = config.timeoutMs,
    baseDelayMs = config.baseDelayMs,
    maxDelayMs = config.maxDelayMs,
    fetchFn = fetch,
    sleep = delay,
    random = Math.random,
    now = Date.now,
    onRetry = () => {},
  } = options;
  const settings = { maxAttempts, timeoutMs, baseDelayMs, maxDelayMs, fetchFn, sleep, random, now, onRetry };
  checkNumber("maxAttempts", settings.maxAttempts, 1, MAX_ATTEMPTS_LIMIT);
  if (!Number.isInteger(settings.maxAttempts)) {
    throw new RangeError(`maxAttempts must be a whole number, got ${settings.maxAttempts}`);
  }
  checkNumber("timeoutMs", settings.timeoutMs, 1, MAX_TIMER_MS);
  checkNumber("baseDelayMs", settings.baseDelayMs, 0, MAX_TIMER_MS);
  checkNumber("maxDelayMs", settings.maxDelayMs, settings.baseDelayMs, MAX_TIMER_MS);
  checkFunction("fetchFn", settings.fetchFn);
  checkFunction("sleep", settings.sleep);
  checkFunction("random", settings.random);
  checkFunction("now", settings.now);
  checkFunction("onRetry", settings.onRetry);
  return settings;
}

function requestError(reason, { retryable, status = null, retryAfterMs = null, cause } = {}) {
  return Object.assign(new Error(reason, { cause }), { retryable, status, retryAfterMs });
}

export function parseRetryAfterMs(headerValue, now) {
  if (typeof headerValue !== "string") return null;
  const value = headerValue.trim();
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  if (!/[a-z]/i.test(value)) return null;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - now);
}

function httpError(response, now) {
  const retryAfterMs =
    response.status === 429 || response.status === 503
      ? parseRetryAfterMs(response.headers.get("retry-after"), now())
      : null;
  return requestError(`HTTP ${response.status}`, {
    retryable: RETRYABLE_STATUSES.has(response.status),
    status: response.status,
    retryAfterMs,
  });
}

const messageOf = (error) => (error instanceof Error ? error.message : String(error));

function networkError(error, timeoutMs) {
  const reason =
    error?.name === "TimeoutError" ? `timeout after ${timeoutMs} ms` : `network error: ${messageOf(error)}`;
  return requestError(reason, { retryable: true, cause: error });
}

function parseJson(text) {
  if (text.trim() === "") {
    throw requestError("empty response body", { retryable: false });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw requestError(`invalid JSON: ${error.message}`, { retryable: false, cause: error });
  }
}

async function attemptOnce(url, { timeoutMs, fetchFn, now }) {
  let response;
  let text;
  try {
    response = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (response.ok) text = await response.text();
  } catch (error) {
    throw networkError(error, timeoutMs);
  }
  if (!response.ok) throw httpError(response, now);
  return parseJson(text);
}

// "Equal jitter": half of the backoff is fixed, the other half is random (random() is 0 to 1).
function backoffDelay(attempt, { baseDelayMs, random }) {
  const full = baseDelayMs * 2 ** (attempt - 1);
  const factor = random();
  const safeFactor = Number.isFinite(factor) ? Math.min(1, Math.max(0, factor)) : 1;
  return Math.round(full / 2 + (full / 2) * safeFactor);
}

const retryDelay = (error, attempt, settings) =>
  Math.min(error.retryAfterMs ?? backoffDelay(attempt, settings), settings.maxDelayMs);

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

export async function fetchJsonWithRetry(url, options = {}) {
  const settings = resolveOptions(url, options);
  const { maxAttempts } = settings;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await attemptOnce(url, settings);
    } catch (error) {
      if (!error.retryable) {
        throw new Error(`GET ${url} failed (not retried): ${error.message}`, { cause: error });
      }
      lastError = error;
      if (attempt === maxAttempts) break;
      const delayMs = retryDelay(error, attempt, settings);
      settings.onRetry({ url, attempt, maxAttempts, reason: error.message, delayMs });
      await settings.sleep(delayMs);
    }
  }

  throw new Error(`GET ${url} failed after ${plural(maxAttempts, "attempt")}. Last reason: ${lastError.message}`, {
    cause: lastError,
  });
}
