export function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function ahead(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function daysAgo(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function daysAhead(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
