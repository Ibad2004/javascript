import { setTimeout as delay } from "node:timers/promises";
import { config } from "./config.js";
import { messageOf } from "./guards.js";

export interface RetryInfo {
  readonly url: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly reason: string;
  readonly delayMs: number;
}

export type FetchFn = (url: string, init: { readonly signal: AbortSignal }) => Promise<Response>;
export type SleepFn = (ms: number) => Promise<unknown>;
export type RetryListener = (info: RetryInfo) => void;

export interface RetryOptions {
  readonly maxAttempts?: number;
  readonly timeoutMs?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly fetchFn?: FetchFn;
  readonly sleep?: SleepFn;
  readonly onRetry?: RetryListener;
}

export type Settings = Required<RetryOptions>;

type NumberOption = "maxAttempts" | "timeoutMs" | "baseDelayMs" | "maxDelayMs";
type FunctionOption = "fetchFn" | "sleep" | "onRetry";

const RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504] as const;
type RetryableStatus = (typeof RETRYABLE_STATUSES)[number];
const MAX_ATTEMPTS_LIMIT = 10;
const MAX_TIMER_MS = 2147483647;

const isRetryableStatus = (status: number): status is RetryableStatus =>
  RETRYABLE_STATUSES.some((code) => code === status);

const describe = (value: unknown): string => (typeof value === "string" ? `"${value}"` : String(value));

function checkUrl(url: unknown): string {
  if (typeof url !== "string" || !URL.canParse(url)) {
    throw new TypeError(`url must be a valid http(s) URL, got ${describe(url)}`);
  }
  const { protocol } = new URL(url);
  if (protocol !== "http:" && protocol !== "https:") {
    throw new TypeError(`url must start with http:// or https://, got ${describe(url)}`);
  }
  return url;
}

function readNumber(name: NumberOption, value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number, got ${describe(value)}`);
  }
  if (value < min || value > max) {
    throw new RangeError(`${name} must be from ${min} to ${max}, got ${value}`);
  }
  return value;
}

function readMaxAttempts(value: unknown): number {
  const maxAttempts = readNumber("maxAttempts", value, 1, MAX_ATTEMPTS_LIMIT);
  if (!Number.isInteger(maxAttempts)) {
    throw new RangeError(`maxAttempts must be a whole number, got ${maxAttempts}`);
  }
  return maxAttempts;
}

const functionError = (name: FunctionOption, value: unknown): TypeError =>
  new TypeError(`${name} must be a function, got ${describe(value)}`);

const isFetchFn = (value: unknown): value is FetchFn => typeof value === "function";
const isSleepFn = (value: unknown): value is SleepFn => typeof value === "function";
const isRetryListener = (value: unknown): value is RetryListener => typeof value === "function";

const orDefault = (value: unknown, fallback: unknown): unknown => (value === undefined ? fallback : value);

function rawOptions(options: object) {
  return {
    maxAttempts: "maxAttempts" in options ? options.maxAttempts : undefined,
    timeoutMs: "timeoutMs" in options ? options.timeoutMs : undefined,
    baseDelayMs: "baseDelayMs" in options ? options.baseDelayMs : undefined,
    maxDelayMs: "maxDelayMs" in options ? options.maxDelayMs : undefined,
    fetchFn: "fetchFn" in options ? options.fetchFn : undefined,
    sleep: "sleep" in options ? options.sleep : undefined,
    onRetry: "onRetry" in options ? options.onRetry : undefined,
  };
}

type RawOptions = ReturnType<typeof rawOptions>;

function resolveNumbers(raw: RawOptions) {
  const maxAttempts = readMaxAttempts(orDefault(raw.maxAttempts, config.maxAttempts));
  const timeoutMs = readNumber("timeoutMs", orDefault(raw.timeoutMs, config.timeoutMs), 1, MAX_TIMER_MS);
  const baseDelayMs = readNumber("baseDelayMs", orDefault(raw.baseDelayMs, config.baseDelayMs), 0, MAX_TIMER_MS);
  const maxDelayMs = readNumber("maxDelayMs", orDefault(raw.maxDelayMs, config.maxDelayMs), baseDelayMs, MAX_TIMER_MS);
  return { maxAttempts, timeoutMs, baseDelayMs, maxDelayMs };
}

function resolveFunctions(raw: RawOptions) {
  const fetchFn = orDefault(raw.fetchFn, fetch);
  if (!isFetchFn(fetchFn)) throw functionError("fetchFn", fetchFn);
  const sleep = orDefault(raw.sleep, delay);
  if (!isSleepFn(sleep)) throw functionError("sleep", sleep);
  const onRetry = orDefault(raw.onRetry, () => {});
  if (!isRetryListener(onRetry)) throw functionError("onRetry", onRetry);
  return { fetchFn, sleep, onRetry };
}

export function resolveOptions(url: unknown, options: unknown): Settings {
  checkUrl(url);
  if (typeof options !== "object" || options === null) {
    throw new TypeError(`options must be an object, got ${describe(options)}`);
  }
  const raw = rawOptions(options);
  return { ...resolveNumbers(raw), ...resolveFunctions(raw) };
}

interface RequestErrorDetails {
  readonly retryable: boolean;
  readonly status?: number | null;
  readonly retryAfterMs?: number | null;
  readonly cause?: unknown;
}

export class RequestError extends Error {
  readonly retryable: boolean;
  readonly status: number | null;
  readonly retryAfterMs: number | null;

  constructor(reason: string, { retryable, status = null, retryAfterMs = null, cause }: RequestErrorDetails) {
    super(reason, { cause });
    this.retryable = retryable;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (headerValue === null || !/^\d+$/.test(headerValue.trim())) return null;
  return Number(headerValue.trim()) * 1000;
}

function httpError(response: Response): RequestError {
  const retryAfterMs = response.status === 429 ? parseRetryAfterMs(response.headers.get("retry-after")) : null;
  return new RequestError(`HTTP ${response.status}`, {
    retryable: isRetryableStatus(response.status),
    status: response.status,
    retryAfterMs,
  });
}

function networkError(error: unknown, timeoutMs: number): RequestError {
  const isTimeout = error instanceof Error && error.name === "TimeoutError";
  const reason = isTimeout ? `timeout after ${timeoutMs} ms` : `network error: ${messageOf(error)}`;
  return new RequestError(reason, { retryable: true, cause: error });
}

function parseJson(text: string): unknown {
  if (text.trim() === "") {
    throw new RequestError("empty response body", { retryable: false });
  }
  try {
    const data: unknown = JSON.parse(text);
    return data;
  } catch (error) {
    throw new RequestError(`invalid JSON: ${messageOf(error)}`, { retryable: false, cause: error });
  }
}

async function requestText(url: string, { timeoutMs, fetchFn }: Settings): Promise<string> {
  let response: Response;
  try {
    response = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (response.ok) return await response.text();
  } catch (error) {
    throw networkError(error, timeoutMs);
  }
  throw httpError(response);
}

const attemptOnce = async (url: string, settings: Settings): Promise<unknown> =>
  parseJson(await requestText(url, settings));

const backoffDelay = (attempt: number, { baseDelayMs }: Settings): number => baseDelayMs * 2 ** (attempt - 1);

const retryDelay = (error: RequestError, attempt: number, settings: Settings): number =>
  Math.min(error.retryAfterMs ?? backoffDelay(attempt, settings), settings.maxDelayMs);

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

function retryableOrThrow(url: string, error: unknown): RequestError {
  if (error instanceof RequestError && error.retryable) return error;
  throw new Error(`GET ${url} failed (not retried): ${messageOf(error)}`, { cause: error });
}

export async function fetchJsonWithRetry(url: string, options: RetryOptions = {}): Promise<unknown> {
  const settings = resolveOptions(url, options);
  const { maxAttempts } = settings;

  for (let attempt = 1; ; attempt++) {
    try {
      return await attemptOnce(url, settings);
    } catch (error) {
      const failure = retryableOrThrow(url, error);
      if (attempt === maxAttempts) {
        throw new Error(`GET ${url} failed after ${plural(maxAttempts, "attempt")}. Last reason: ${failure.message}`, {
          cause: failure,
        });
      }
      const delayMs = retryDelay(failure, attempt, settings);
      settings.onRetry({ url, attempt, maxAttempts, reason: failure.message, delayMs });
      await settings.sleep(delayMs);
    }
  }
}
