const IP_MAX = 64;

/**
 * The first x-forwarded-for value, or "unknown". Vercel sets this header itself. On a host
 * that passes on the caller's own header, it could be faked.
 */
export function clientIp(forwardedFor: string | null): string {
  const first = (forwardedFor ?? "").split(",")[0]?.trim() ?? "";
  return first === "" ? "unknown" : first.slice(0, IP_MAX);
}
