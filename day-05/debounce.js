import { validateTimingArgs } from "./validate.js";

export function debounce(fn, wait, { leading = false, trailing = true } = {}) {
  validateTimingArgs(fn, wait, leading, trailing);

  let timerId = null;
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
    result = fn.apply(context, args);
    return result;
  };

  const runSaved = () => run(lastThis, lastArgs);

  const onWaitEnd = () => {
    timerId = null;
    if (lastArgs !== null) runSaved();
  };

  function debounced(...args) {
    const isFirstCallOfBurst = timerId === null;
    clearTimer();
    timerId = setTimeout(onWaitEnd, wait);

    if (leading && isFirstCallOfBurst) return run(this, args);

    if (trailing) {
      lastArgs = args;
      lastThis = this;
    }
    return result;
  }

  debounced.cancel = () => {
    clearTimer();
    clearSaved();
  };

  debounced.flush = () => {
    if (timerId === null) return result;
    clearTimer();
    return lastArgs !== null ? runSaved() : result;
  };

  debounced.pending = () => timerId !== null;

  return debounced;
}
