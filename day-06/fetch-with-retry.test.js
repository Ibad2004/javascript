import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { fetchJsonWithRetry } from "./fetch-with-retry.js";

const TEST_URL = "https://api.test/users";

const ok = (data) => () => Response.json(data);
const status = (code, headers = {}) => () => new Response("error", { status: code, headers });
const body = (text) => () => new Response(text, { status: 200 });
const networkError = () => () => {
  throw new TypeError("fetch failed");
};
const hangUntilAborted = () => (init) =>
  new Promise((resolve, reject) => {
    const keepAlive = setTimeout(() => {}, 60_000);
    init.signal.addEventListener("abort", () => {
      clearTimeout(keepAlive);
      reject(init.signal.reason);
    });
  });

function setup(steps, options = {}) {
  const calls = [];
  const delays = [];
  const retries = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return steps[Math.min(calls.length, steps.length) - 1](init);
  };
  const sleep = async (ms) => {
    delays.push(ms);
  };
  const run = () =>
    fetchJsonWithRetry(TEST_URL, { fetchFn, sleep, onRetry: (info) => retries.push(info), ...options });
  return { run, calls, delays, retries };
}

describe("fetchJsonWithRetry: success and retries", () => {
  test("success on the first try: one call, no waiting", async () => {
    const { run, calls, delays, retries } = setup([ok({ id: 1 })]);
    assert.deepEqual(await run(), { id: 1 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, TEST_URL);
    assert.deepEqual(delays, []);
    assert.deepEqual(retries, []);
  });

  test("503 then 200: retried once after 500 ms", async () => {
    const { run, calls, delays, retries } = setup([status(503), ok([1, 2])]);
    assert.deepEqual(await run(), [1, 2]);
    assert.equal(calls.length, 2);
    assert.deepEqual(delays, [500]);
    assert.deepEqual(retries, [{ url: TEST_URL, attempt: 1, maxAttempts: 3, reason: "HTTP 503", delayMs: 500 }]);
  });

  test("network error then 200: retried", async () => {
    const { run, calls, retries } = setup([networkError(), ok("done")]);
    assert.equal(await run(), "done");
    assert.equal(calls.length, 2);
    assert.equal(retries[0].reason, "network error: fetch failed");
  });

  test("timeout then 200: the AbortSignal fires and the request is retried", async () => {
    const { run, calls, retries } = setup([hangUntilAborted(), ok("late")], { timeoutMs: 20 });
    assert.equal(await run(), "late");
    assert.equal(calls.length, 2);
    assert.equal(retries[0].reason, "timeout after 20 ms");
  });

  test("passes a fresh AbortSignal to every attempt", async () => {
    const { run, calls } = setup([status(500), ok(1)]);
    await run();
    assert.ok(calls[0].init.signal instanceof AbortSignal);
    assert.ok(calls[1].init.signal instanceof AbortSignal);
    assert.notEqual(calls[0].init.signal, calls[1].init.signal);
  });

  test("retries every retryable status: 408, 429, 500, 502, 503, 504", async () => {
    for (const code of [408, 429, 500, 502, 503, 504]) {
      const { run, calls } = setup([status(code), ok(code)]);
      assert.equal(await run(), code);
      assert.equal(calls.length, 2, `status ${code} should be retried`);
    }
  });
});

describe("fetchJsonWithRetry: errors that are not retried", () => {
  for (const code of [400, 401, 403, 404, 422]) {
    test(`${code} is not retried`, async () => {
      const { run, calls, delays } = setup([status(code), ok("never")]);
      await assert.rejects(run(), (error) => {
        assert.equal(error.message, `GET ${TEST_URL} failed (not retried): HTTP ${code}`);
        assert.equal(error.cause.status, code);
        return true;
      });
      assert.equal(calls.length, 1);
      assert.deepEqual(delays, []);
    });
  }

  test("invalid JSON is not retried", async () => {
    const { run, calls } = setup([body("{not json"), ok("never")]);
    await assert.rejects(run(), /failed \(not retried\): invalid JSON: /);
    assert.equal(calls.length, 1);
  });

  test("an empty or blank body gives a clear error", async () => {
    for (const text of ["", "   \n"]) {
      const { run, calls } = setup([body(text), ok("never")]);
      await assert.rejects(run(), /failed \(not retried\): empty response body$/);
      assert.equal(calls.length, 1);
    }
  });

  test("valid JSON null, 0 and false are returned, not treated as empty", async () => {
    for (const text of ["null", "0", "false"]) {
      const { run } = setup([body(text)]);
      assert.equal(await run(), JSON.parse(text));
    }
  });
});

describe("fetchJsonWithRetry: all attempts fail", () => {
  test("error says the URL, the number of attempts and the last reason, and keeps the cause", async () => {
    const { run, calls, delays } = setup([status(503), networkError(), status(502)]);
    await assert.rejects(run(), (error) => {
      assert.equal(error.message, `GET ${TEST_URL} failed after 3 attempts. Last reason: HTTP 502`);
      assert.equal(error.cause.message, "HTTP 502");
      assert.equal(error.cause.status, 502);
      return true;
    });
    assert.equal(calls.length, 3);
    assert.deepEqual(delays, [500, 1000]);
  });

  test("maxAttempts 1 means no retry and says '1 attempt'", async () => {
    const { run, calls, delays } = setup([status(503)], { maxAttempts: 1 });
    await assert.rejects(run(), /failed after 1 attempt\. Last reason: HTTP 503$/);
    assert.equal(calls.length, 1);
    assert.deepEqual(delays, []);
  });

  test("last reason is a timeout and the cause keeps the TimeoutError", async () => {
    const { run } = setup([hangUntilAborted()], { maxAttempts: 2, timeoutMs: 10 });
    await assert.rejects(run(), (error) => {
      assert.match(error.message, /failed after 2 attempts\. Last reason: timeout after 10 ms$/);
      assert.equal(error.cause.cause.name, "TimeoutError");
      return true;
    });
  });
});

describe("fetchJsonWithRetry: backoff delays", () => {
  test("exact delays are 500, 1000 with the default config", async () => {
    const { run, delays } = setup([status(500)]);
    await assert.rejects(run());
    assert.deepEqual(delays, [500, 1000]);
  });

  test("delays double each time: 500, 1000, 2000, 4000", async () => {
    const { run, delays } = setup([status(500)], { maxAttempts: 5 });
    await assert.rejects(run());
    assert.deepEqual(delays, [500, 1000, 2000, 4000]);
  });

  test("delays are capped at maxDelayMs", async () => {
    const { run, delays } = setup([status(500)], { maxAttempts: 6, maxDelayMs: 3000 });
    await assert.rejects(run());
    assert.deepEqual(delays, [500, 1000, 2000, 3000, 3000]);
  });

  test("baseDelayMs 0 retries without waiting", async () => {
    const { run, delays } = setup([status(500)], { baseDelayMs: 0 });
    await assert.rejects(run());
    assert.deepEqual(delays, [0, 0]);
  });
});

describe("fetchJsonWithRetry: 429 and Retry-After", () => {
  test("Retry-After in seconds is honoured", async () => {
    const { run, delays, retries } = setup([status(429, { "Retry-After": "2" }), ok("ok")]);
    assert.equal(await run(), "ok");
    assert.deepEqual(delays, [2000]);
    assert.equal(retries[0].reason, "HTTP 429");
  });

  test("Retry-After 0 means retry right away", async () => {
    const { run, delays } = setup([status(429, { "Retry-After": "0" }), ok("ok")]);
    await run();
    assert.deepEqual(delays, [0]);
  });

  test("Retry-After is capped at maxDelayMs", async () => {
    const { run, delays } = setup([status(429, { "Retry-After": "120" }), ok("ok")]);
    await run();
    assert.deepEqual(delays, [5000]);
  });

  test("invalid or missing Retry-After falls back to normal backoff", async () => {
    for (const value of ["soon", "-1", "1.5", "", "Wed, 21 Oct 2026 07:28:00 GMT", null]) {
      const headers = value === null ? {} : { "Retry-After": value };
      const { run, delays } = setup([status(429, headers), ok("ok")]);
      await run();
      assert.deepEqual(delays, [500], `Retry-After ${JSON.stringify(value)}`);
    }
  });

  test("Retry-After on a 503 is ignored (only 429 uses it)", async () => {
    const { run, delays } = setup([status(503, { "Retry-After": "3" }), ok("ok")]);
    await run();
    assert.deepEqual(delays, [500]);
  });
});

describe("fetchJsonWithRetry: option validation", () => {
  const rejectsWith = async (url, options, ErrorType, pattern) => {
    let fetchCalled = false;
    const fetchFn = async () => {
      fetchCalled = true;
    };
    await assert.rejects(fetchJsonWithRetry(url, { fetchFn, ...options }), (error) => {
      assert.ok(error instanceof ErrorType, `expected ${ErrorType.name}, got ${error.name}: ${error.message}`);
      assert.match(error.message, pattern);
      return true;
    });
    assert.equal(fetchCalled, false);
  };

  test("rejects a bad url with TypeError", async () => {
    for (const url of [undefined, null, "", "not a url", "/users", "ftp://x.com/file", 123, new URL(TEST_URL)]) {
      await rejectsWith(url, {}, TypeError, /url must/);
    }
  });

  test("accepts http and https urls", async () => {
    for (const url of ["http://localhost:3000/users", TEST_URL]) {
      const fetchFn = async () => Response.json("ok");
      assert.equal(await fetchJsonWithRetry(url, { fetchFn }), "ok");
    }
  });

  test("rejects maxAttempts 0, 11 and 1.5 with RangeError", async () => {
    for (const maxAttempts of [0, 11, 1.5, -1]) {
      await rejectsWith(TEST_URL, { maxAttempts }, RangeError, /maxAttempts must/);
    }
  });

  test("rejects maxAttempts '3', NaN, Infinity and null with TypeError", async () => {
    for (const maxAttempts of ["3", NaN, Infinity, null, [3]]) {
      await rejectsWith(TEST_URL, { maxAttempts }, TypeError, /maxAttempts must be a finite number/);
    }
  });

  test("rejects timeoutMs 0, negative or NaN", async () => {
    await rejectsWith(TEST_URL, { timeoutMs: 0 }, RangeError, /timeoutMs must be from 1/);
    await rejectsWith(TEST_URL, { timeoutMs: -5 }, RangeError, /timeoutMs/);
    await rejectsWith(TEST_URL, { timeoutMs: NaN }, TypeError, /timeoutMs must be a finite number/);
  });

  test("rejects a negative or NaN delay", async () => {
    await rejectsWith(TEST_URL, { baseDelayMs: -1 }, RangeError, /baseDelayMs must be from 0/);
    await rejectsWith(TEST_URL, { baseDelayMs: NaN }, TypeError, /baseDelayMs/);
    await rejectsWith(TEST_URL, { maxDelayMs: -1 }, RangeError, /maxDelayMs/);
  });

  test("rejects maxDelayMs smaller than baseDelayMs", async () => {
    await rejectsWith(TEST_URL, { baseDelayMs: 1000, maxDelayMs: 999 }, RangeError, /maxDelayMs must be from 1000/);
  });

  test("rejects non-function fetchFn, sleep and onRetry", async () => {
    await rejectsWith(TEST_URL, { fetchFn: "fetch" }, TypeError, /fetchFn must be a function/);
    await rejectsWith(TEST_URL, { sleep: 100 }, TypeError, /sleep must be a function/);
    await rejectsWith(TEST_URL, { onRetry: true }, TypeError, /onRetry must be a function/);
  });

  test("rejects null or non-object options", async () => {
    for (const options of [null, "fast", 3]) {
      await assert.rejects(fetchJsonWithRetry(TEST_URL, options), /options must be an object/);
    }
  });

  test("an option set to undefined uses the config default", async () => {
    const { run, delays } = setup([status(500)], { maxAttempts: undefined, baseDelayMs: undefined });
    await assert.rejects(run(), /after 3 attempts/);
    assert.deepEqual(delays, [500, 1000]);
  });
});
