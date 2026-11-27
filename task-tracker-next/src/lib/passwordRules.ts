// bcrypt reads only the first 72 BYTES of a password and silently ignores the rest.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX_BYTES = 72;

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
