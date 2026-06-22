export function formatCurrency(value: number, currency = "INR"): string {
  // Indian grouping (lakh/crore) for INR; locale-default grouping otherwise.
  const locale = currency === "INR" ? "en-IN" : undefined;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPct(value: number): string {
  return `${value.toFixed(0)}%`;
}

/** First and last day of a given month, formatted yyyy-MM-dd. */
export function monthBounds(year: number, monthIndex0: number) {
  const from = new Date(Date.UTC(year, monthIndex0, 1));
  const to = new Date(Date.UTC(year, monthIndex0 + 1, 0));
  return { from: isoDate(from), to: isoDate(to) };
}

/** A trailing window of N months ending with the given month. */
export function trailingMonths(year: number, monthIndex0: number, months: number) {
  const from = new Date(Date.UTC(year, monthIndex0 - (months - 1), 1));
  const to = new Date(Date.UTC(year, monthIndex0 + 1, 0));
  return { from: isoDate(from), to: isoDate(to) };
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return isoDate(new Date());
}

/** Human-friendly range label, e.g. "Jun 1 – Jun 20, 2026". */
export function formatRangeLabel(from: string, to: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const f = new Date(`${from}T00:00:00Z`).toLocaleDateString(undefined, opts);
  const t = new Date(`${to}T00:00:00Z`).toLocaleDateString(undefined, opts);
  return `${f} – ${t}`;
}
