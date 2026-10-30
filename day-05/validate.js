const MAX_TIMEOUT = 2147483647;

export function validateTimingArgs(fn, wait, leading, trailing) {
  if (typeof fn !== "function") {
    throw new TypeError("fn must be a function");
  }
  if (!Number.isFinite(wait) || wait < 0 || wait > MAX_TIMEOUT) {
    throw new TypeError(`wait must be a finite number from 0 to ${MAX_TIMEOUT}`);
  }
  if (typeof leading !== "boolean" || typeof trailing !== "boolean") {
    throw new TypeError("leading and trailing must be true or false");
  }
  if (!leading && !trailing) {
    throw new RangeError("leading and trailing cannot both be false");
  }
}
