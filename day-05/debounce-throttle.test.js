import { describe, test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { debounce } from "./debounce.js";
import { throttle } from "./throttle.js";

beforeEach(() => {
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
});

afterEach(() => {
  mock.timers.reset();
});

function advance(ms) {
  for (let passed = 0; passed < ms; passed += 10) {
    mock.timers.tick(10);
  }
}

function recorder() {
  const calls = [];
  const fn = function (...args) {
    calls.push({ time: Date.now(), args, context: this });
    if (args[0] === "bad") throw new Error("boom");
    return args[0];
  };
  return { fn, calls };
}

const argsOf = (calls) => calls.map((call) => call.args);
const timesOf = (calls) => calls.map((call) => call.time);

const badInputCases = (create) => {
  const noop = () => {};

  test("rejects a missing or non-function fn with TypeError", () => {
    for (const fn of [undefined, null, "text", 123, {}, []]) {
      assert.throws(() => create(fn, 100), TypeError);
    }
  });

  test("rejects a negative, NaN, infinite, non-number or missing wait with TypeError", () => {
    for (const wait of [-1, -0.5, NaN, Infinity, -Infinity, "100", null, undefined, [100]]) {
      assert.throws(() => create(noop, wait), TypeError);
    }
  });

  test("rejects wait above 2147483647 (the setTimeout maximum) with TypeError", () => {
    assert.throws(() => create(noop, 2147483648), TypeError);
    assert.doesNotThrow(() => create(noop, 2147483647));
  });

  test("rejects being called with no arguments at all", () => {
    assert.throws(() => create(), TypeError);
  });

  test("rejects non-boolean leading or trailing with TypeError", () => {
    assert.throws(() => create(noop, 100, { leading: "yes" }), TypeError);
    assert.throws(() => create(noop, 100, { trailing: 1 }), TypeError);
  });

  test("rejects null options with TypeError", () => {
    assert.throws(() => create(noop, 100, null), TypeError);
  });

  test("rejects leading and trailing both false with RangeError", () => {
    assert.throws(() => create(noop, 100, { leading: false, trailing: false }), RangeError);
  });

  test("accepts wait 0", () => {
    assert.doesNotThrow(() => create(noop, 0));
  });
};

describe("debounce", () => {
  test("runs once with the latest args after calls stop", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100);

    debounced("a");
    advance(50);
    debounced("b");
    advance(50);
    debounced("c");
    advance(200);

    assert.deepEqual(argsOf(calls), [["c"]]);
    assert.deepEqual(timesOf(calls), [200]);
  });

  test("does not run before wait has passed", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100);

    debounced("a");
    mock.timers.tick(99);
    assert.equal(calls.length, 0);
    assert.equal(debounced.pending(), true);
    mock.timers.tick(1);
    assert.equal(calls.length, 1);
    assert.equal(debounced.pending(), false);
  });

  test("starts a new cycle after firing", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100);

    debounced("a");
    advance(100);
    debounced("b");
    advance(100);

    assert.deepEqual(argsOf(calls), [["a"], ["b"]]);
    assert.deepEqual(timesOf(calls), [100, 200]);
  });

  test("forwards this and all arguments", () => {
    const { fn, calls } = recorder();
    const form = { name: "Signup", save: debounce(fn, 100) };

    form.save(1, "two", { three: 3 });
    advance(100);

    assert.equal(calls[0].context, form);
    assert.deepEqual(calls[0].args, [1, "two", { three: 3 }]);
  });

  test("works when called with no arguments", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100);

    debounced();
    advance(100);

    assert.deepEqual(argsOf(calls), [[]]);
  });

  test("uses this of the latest call", () => {
    const { fn, calls } = recorder();
    const shared = debounce(fn, 100);
    const first = { save: shared };
    const second = { save: shared };

    first.save("x");
    second.save("y");
    advance(100);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].context, second);
    assert.deepEqual(calls[0].args, ["y"]);
  });

  test("leading only runs immediately and ignores the rest of the burst", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100, { leading: true, trailing: false });

    debounced("a");
    assert.deepEqual(argsOf(calls), [["a"]]);
    debounced("b");
    advance(200);
    assert.deepEqual(argsOf(calls), [["a"]]);

    debounced("c");
    assert.deepEqual(argsOf(calls), [["a"], ["c"]]);
  });

  test("leading only restarts the wait on each call", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100, { leading: true, trailing: false });

    debounced("a");
    advance(50);
    debounced("b");
    advance(60);
    debounced("c");
    assert.deepEqual(argsOf(calls), [["a"]]);

    advance(100);
    debounced("d");
    assert.deepEqual(argsOf(calls), [["a"], ["d"]]);
    assert.deepEqual(timesOf(calls), [0, 210]);
  });

  test("leading + trailing: a single call runs once", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100, { leading: true });

    debounced("a");
    advance(300);

    assert.deepEqual(argsOf(calls), [["a"]]);
    assert.deepEqual(timesOf(calls), [0]);
  });

  test("leading + trailing: a burst runs at the start and at the end", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100, { leading: true });

    debounced("a");
    advance(50);
    debounced("b");
    advance(200);

    assert.deepEqual(argsOf(calls), [["a"], ["b"]]);
    assert.deepEqual(timesOf(calls), [0, 150]);
  });

  test("leading + trailing: a single call after a burst still runs once", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100, { leading: true });

    debounced("a");
    debounced("b");
    advance(200);
    debounced("c");
    advance(200);

    assert.deepEqual(argsOf(calls), [["a"], ["b"], ["c"]]);
  });

  test("cancel stops the pending run", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100);

    debounced("a");
    debounced.cancel();
    advance(200);

    assert.equal(calls.length, 0);
    assert.equal(debounced.pending(), false);
  });

  test("cancel with nothing pending does nothing", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100);

    assert.doesNotThrow(() => debounced.cancel());
    assert.equal(debounced.pending(), false);

    debounced("a");
    advance(100);
    assert.deepEqual(argsOf(calls), [["a"]]);
  });

  test("cancel then call again: the old timer does not fire early", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100);

    debounced("a");
    advance(50);
    debounced.cancel();
    debounced("b");
    advance(90);
    assert.equal(calls.length, 0);

    advance(10);
    assert.deepEqual(argsOf(calls), [["b"]]);
    assert.deepEqual(timesOf(calls), [150]);
  });

  test("flush runs now and only once", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100);

    debounced("a");
    assert.equal(debounced.flush(), "a");
    assert.deepEqual(timesOf(calls), [0]);
    assert.equal(debounced.pending(), false);

    advance(200);
    assert.equal(calls.length, 1);
  });

  test("flush then call again: the old timer does not fire early", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100);

    debounced("a");
    advance(50);
    debounced.flush();
    debounced("b");
    advance(90);
    assert.deepEqual(argsOf(calls), [["a"]]);

    advance(10);
    assert.deepEqual(argsOf(calls), [["a"], ["b"]]);
    assert.deepEqual(timesOf(calls), [50, 150]);
  });

  test("flush with nothing pending does nothing", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100);

    assert.equal(debounced.flush(), undefined);
    assert.equal(calls.length, 0);
  });

  test("flush in leading-only mode does not run again", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100, { leading: true, trailing: false });

    debounced("a");
    debounced("b");
    assert.equal(debounced.flush(), "a");
    assert.deepEqual(argsOf(calls), [["a"]]);
    assert.equal(debounced.pending(), false);
  });

  test("returns the result of the last real run", () => {
    const debounced = debounce((x) => x * 2, 100);

    assert.equal(debounced(1), undefined);
    advance(100);
    assert.equal(debounced(5), 2);
    advance(100);
    assert.equal(debounced(7), 10);
  });

  test("wait 0 still runs asynchronously", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 0);

    debounced("a");
    assert.equal(calls.length, 0);
    mock.timers.tick(0);
    assert.deepEqual(argsOf(calls), [["a"]]);
  });

  test("keeps working after fn throws on a leading call", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100, { leading: true, trailing: false });

    assert.throws(() => debounced("bad"), /boom/);
    advance(100);
    assert.equal(debounced("ok"), "ok");
    assert.deepEqual(argsOf(calls), [["bad"], ["ok"]]);
  });

  test("keeps working after fn throws during flush", () => {
    const { fn, calls } = recorder();
    const debounced = debounce(fn, 100);

    debounced("bad");
    assert.throws(() => debounced.flush(), /boom/);
    assert.equal(debounced.pending(), false);

    debounced("ok");
    advance(100);
    assert.deepEqual(argsOf(calls), [["bad"], ["ok"]]);
  });

  test("separate instances do not share state", () => {
    const first = recorder();
    const second = recorder();
    const debouncedFirst = debounce(first.fn, 100);
    const debouncedSecond = debounce(second.fn, 100);

    debouncedFirst("a");
    debouncedSecond("b");
    debouncedFirst.cancel();
    advance(100);

    assert.equal(first.calls.length, 0);
    assert.deepEqual(argsOf(second.calls), [["b"]]);
  });

  badInputCases(debounce);
});

describe("throttle", () => {
  test("calls every 10 ms for 250 ms with wait 100 run at 0, 100, 200, 300", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100);

    for (let time = 0; time < 250; time += 10) {
      throttled(time);
      advance(10);
    }
    advance(100);

    assert.deepEqual(timesOf(calls), [0, 100, 200, 300]);
    assert.deepEqual(argsOf(calls), [[0], [90], [190], [240]]);
  });

  test("a single call runs once", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100);

    throttled("a");
    advance(300);

    assert.deepEqual(argsOf(calls), [["a"]]);
    assert.equal(throttled.pending(), false);
  });

  test("spaced-out calls all run immediately", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100);

    throttled("a");
    advance(150);
    throttled("b");
    advance(150);
    throttled("c");

    assert.deepEqual(argsOf(calls), [["a"], ["b"], ["c"]]);
    assert.deepEqual(timesOf(calls), [0, 150, 300]);
  });

  test("a call exactly wait ms after the last run runs immediately", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100);

    throttled("a");
    advance(100);
    throttled("b");

    assert.deepEqual(timesOf(calls), [0, 100]);
    assert.equal(throttled.pending(), false);
  });

  test("forwards this and all args on the leading and the trailing run", () => {
    const { fn, calls } = recorder();
    const shared = throttle(fn, 100);
    const first = { fire: shared };
    const second = { fire: shared };

    first.fire(1, 2);
    second.fire(3, 4);
    advance(100);

    assert.equal(calls[0].context, first);
    assert.deepEqual(calls[0].args, [1, 2]);
    assert.equal(calls[1].context, second);
    assert.deepEqual(calls[1].args, [3, 4]);
  });

  test("leading only ignores calls inside the window", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100, { trailing: false });

    throttled("a");
    advance(50);
    throttled("b");
    assert.equal(throttled.pending(), false);
    advance(150);
    assert.deepEqual(argsOf(calls), [["a"]]);

    throttled("c");
    assert.deepEqual(argsOf(calls), [["a"], ["c"]]);
  });

  test("trailing only runs at the end of the window with the latest args", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100, { leading: false });

    throttled("a");
    assert.equal(calls.length, 0);
    advance(50);
    throttled("b");
    advance(50);
    assert.deepEqual(argsOf(calls), [["b"]]);
    assert.deepEqual(timesOf(calls), [100]);

    advance(200);
    throttled("c");
    assert.equal(calls.length, 1);
    advance(100);
    assert.deepEqual(argsOf(calls), [["b"], ["c"]]);
    assert.deepEqual(timesOf(calls), [100, 400]);
  });

  test("cancel stops the trailing run and resets the window", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100);

    throttled("a");
    advance(10);
    throttled("b");
    throttled.cancel();
    assert.equal(throttled.pending(), false);

    throttled("c");
    advance(200);

    assert.deepEqual(argsOf(calls), [["a"], ["c"]]);
    assert.deepEqual(timesOf(calls), [0, 10]);
  });

  test("cancel then call again: the old timer does not fire early", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100, { leading: false });

    throttled("a");
    advance(50);
    throttled.cancel();
    throttled("b");
    advance(90);
    assert.equal(calls.length, 0);

    advance(10);
    assert.deepEqual(argsOf(calls), [["b"]]);
    assert.deepEqual(timesOf(calls), [150]);
  });

  test("cancel right after creation does nothing", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100);

    assert.doesNotThrow(() => throttled.cancel());
    assert.equal(throttled.pending(), false);
    throttled("a");
    assert.deepEqual(argsOf(calls), [["a"]]);
  });

  test("flush runs the pending call now and only once", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100);

    throttled("a");
    advance(30);
    throttled("b");
    assert.equal(throttled.flush(), "b");
    assert.equal(throttled.pending(), false);
    advance(200);

    assert.deepEqual(argsOf(calls), [["a"], ["b"]]);
    assert.deepEqual(timesOf(calls), [0, 30]);
  });

  test("flush then call again: the old timer does not fire early", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100, { leading: false });

    throttled("a");
    advance(50);
    throttled.flush();
    throttled("b");
    advance(90);
    assert.deepEqual(argsOf(calls), [["a"]]);

    advance(10);
    assert.deepEqual(argsOf(calls), [["a"], ["b"]]);
    assert.deepEqual(timesOf(calls), [50, 150]);
  });

  test("flush with nothing pending does nothing", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100);

    assert.equal(throttled.flush(), undefined);
    assert.equal(calls.length, 0);
  });

  test("wait 0 runs every call", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 0);

    throttled(1);
    throttled(2);
    throttled(3);

    assert.deepEqual(argsOf(calls), [[1], [2], [3]]);
    assert.equal(throttled.pending(), false);
  });

  test("a clock that goes backwards starts a new window", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100);

    mock.timers.setTime(1000);
    throttled("a");
    mock.timers.setTime(500);
    throttled("b");

    assert.deepEqual(argsOf(calls), [["a"], ["b"]]);
    assert.deepEqual(timesOf(calls), [1000, 500]);
  });

  test("returns the result of the last real run", () => {
    const throttled = throttle((x) => x * 2, 100);

    assert.equal(throttled(1), 2);
    assert.equal(throttled(5), 2);
    advance(100);
    assert.equal(throttled(7), 10);
  });

  test("keeps working after fn throws", () => {
    const { fn, calls } = recorder();
    const throttled = throttle(fn, 100);

    assert.throws(() => throttled("bad"), /boom/);
    throttled("ok");
    assert.equal(throttled.pending(), true);
    advance(100);
    assert.deepEqual(argsOf(calls), [["bad"], ["ok"]]);
    assert.deepEqual(timesOf(calls), [0, 100]);

    throttled("bad");
    assert.throws(() => throttled.flush(), /boom/);
    advance(200);
    assert.equal(throttled("last"), "last");
  });

  test("separate instances do not share state", () => {
    const first = recorder();
    const second = recorder();
    const throttledFirst = throttle(first.fn, 100);
    const throttledSecond = throttle(second.fn, 100);

    throttledFirst("a");
    throttledSecond("b");

    assert.deepEqual(argsOf(first.calls), [["a"]]);
    assert.deepEqual(argsOf(second.calls), [["b"]]);
  });

  badInputCases(throttle);
});
