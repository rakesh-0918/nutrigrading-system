export const IST_TZ = 'Asia/Kolkata';

export function startOfIstDay(date: Date): Date {
  // Convert 'date' to IST day bucket 00:00 by formatting parts.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !d) throw new Error('DATE_FORMAT_FAILED');

  // Create a UTC date at 00:00 IST by constructing a date string with timezone offset.
  // IST is UTC+05:30.
  return new Date(`${y}-${m}-${d}T00:00:00+05:30`);
}

export function startOfNextIstDay(date: Date): Date {
  const s = startOfIstDay(date);
  return new Date(s.getTime() + 24 * 60 * 60 * 1000);
}


