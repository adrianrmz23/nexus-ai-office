/**
 * Returns an ISO-8601 timestamp relative to the current server time.
 * Keep clock access outside React render modules so server components stay pure.
 */
export function getIsoTimestampDaysAgo(days: number): string {
  if (!Number.isFinite(days) || days < 0) {
    throw new RangeError("days must be a finite, non-negative number");
  }

  const timestamp = new Date();
  timestamp.setUTCDate(timestamp.getUTCDate() - Math.trunc(days));
  return timestamp.toISOString();
}
