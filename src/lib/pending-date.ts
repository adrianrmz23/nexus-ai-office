export function formatPendingDate(date: string | null, time: string | null): string {
  if (!date) return "Sin fecha";
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day);
  const formatted = new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: value.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(value);
  return time ? `${formatted} · ${time.slice(0, 5)}` : formatted;
}

export function dateTimeLocalValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function relativePendingLabel(date: string | null, todayOverride?: string): "overdue" | "today" | "tomorrow" | "future" | "none" {
  if (!date) return "none";
  let today = todayOverride;
  if (!today) {
    const now = new Date();
    today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const [year, month, day] = today.split("-").map(Number);
  const tomorrow = new Date(year, month - 1, day + 1, 12);
  const tomorrowString = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (date < today) return "overdue";
  if (date === today) return "today";
  if (date === tomorrowString) return "tomorrow";
  return "future";
}
