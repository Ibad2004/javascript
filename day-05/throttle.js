import { validateTimingArgs } from "./validate.js";

export function throttle(fn, wait, { leading = true, trailing = true } = {}) {
  validateTimingArgs(fn, wait, leading, trailing);

  let timerId = null;
  let windowStart = null;
  let lastArgs = null;
  let lastThis = null;
  let result;

  const clearTimer = () => {
    clearTimeout(timerId);
    timerId = null;
  };

  const clearSaved = () => {
    lastArgs = null;
    lastThis = null;
  };

  const run = (context, args) => {
    clearSaved();
    windowStart = Date.now();
    result = fn.apply(context, args);
    return result;
  };

  const runSaved = () => run(lastThis, lastArgs);

  const isNewWindow = (now) =>
    windowStart === null || now - windowStart >= wait || now < windowStart;

  const onWindowEnd = () => {
    timerId = null;
    if (lastArgs !== null) runSaved();
  };

  function throttled(...args) {
    const now = Date.now();

    if (isNewWindow(now)) {
      clearTimer();
      if (leading) return run(this, args);
      windowStart = now;
    }

    if (trailing) {
      lastArgs = args;
      lastThis = this;
      if (timerId === null) {
        timerId = setTimeout(onWindowEnd, windowStart + wait - now);
      }
    }
    return result;
  }

  throttled.cancel = () => {
    clearTimer();
    clearSaved();
    windowStart = null;
  };

  throttled.flush = () => {
    if (timerId === null) return result;
    clearTimer();
    return runSaved();
  };

  throttled.pending = () => timerId !== null;

  return throttled;
}
