import type { DayInput } from "./types";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a day column to a local-midnight `Date`.
 *
 * ISO calendar dates are parsed by hand rather than through `new Date(string)`,
 * which treats a bare `'YYYY-MM-DD'` as UTC and can therefore shift the column
 * back a day west of Greenwich. `Date` inputs keep their local calendar day and
 * drop the time, so a timestamp from the database cannot land on the wrong one.
 */
export function parseDay(value: DayInput): Date | null {
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return null;
		return new Date(value.getFullYear(), value.getMonth(), value.getDate());
	}

	const match = ISO_DATE.exec(value.trim());
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);

	if (Number.isNaN(date.getTime())) return null;
	// Reject impossible calendar dates such as 2026-02-31, which `Date` rolls over.
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null;
	}

	return date;
}

/**
 * Normalizes the days a grid renders: valid local-midnight dates, in input
 * order, with duplicates removed so keyed `{#each}` blocks stay stable.
 */
export function normalizeDays(days: DayInput[]): Date[] {
	const seen = new Set<string>();
	const result: Date[] = [];

	for (const day of days) {
		const date = parseDay(day);
		if (!date) continue;

		const iso = formatDateISO(date);
		if (seen.has(iso)) continue;

		seen.add(iso);
		result.push(date);
	}

	return result;
}

/**
 * The hour rows for a grid, as full hours between `startHour` (inclusive) and
 * `endHour` (exclusive). Both are clamped to a single day; an empty or inverted
 * range falls back to one row rather than rendering nothing.
 */
export function hoursBetween(startHour: number, endHour: number): number[] {
	const start = Number.isFinite(startHour)
		? Math.min(23, Math.max(0, Math.trunc(startHour)))
		: 0;
	const end = Number.isFinite(endHour)
		? Math.min(24, Math.max(start + 1, Math.trunc(endHour)))
		: 24;

	return Array.from({ length: end - start }, (_, i) => start + i);
}

/**
 * Reads an `'HH:MM'` hour boundary (e.g. an event's `startTime`) as a number.
 * Returns `null` for anything that is not a valid hour, so callers can fall
 * back to their own default.
 */
export function parseHour(value?: string | null): number | null {
	if (!value) return null;

	const match = /^(\d{1,2}):\d{2}$/.exec(value.trim());
	if (!match) return null;

	const hour = Number(match[1]);
	return hour >= 0 && hour <= 24 ? hour : null;
}

/**
 * Formats a range of days as a short label, e.g. 'Oct 14 – 20', collapsing the
 * month when the range stays inside one.
 */
export function formatDayRange(days: Date[]): string {
	if (days.length === 0) return "";

	const first = days[0];
	const last = days[days.length - 1];
	const month = (date: Date) =>
		date.toLocaleDateString("en-US", { month: "short" });

	if (
		first.getMonth() === last.getMonth() &&
		first.getFullYear() === last.getFullYear()
	) {
		return `${month(first)} ${first.getDate()} – ${last.getDate()}`;
	}

	return `${month(first)} ${first.getDate()} – ${month(last)} ${last.getDate()}`;
}

/**
 * Whether a date is today. Accepts either a Date or an already-formatted local
 * ISO date ('YYYY-MM-DD'), which is what the grid's data attributes carry.
 */
export function isTodayDate(value: Date | string): boolean {
	const iso = typeof value === "string" ? value : formatDateISO(value);
	return iso === formatDateISO(new Date());
}

/**
 * Formats a Date to a short weekday string (e.g., 'Mon').
 */
export function formatDayShort(date: Date): string {
	return date.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Formats a Date to day of month (e.g., '14').
 */
export function formatDayNumber(date: Date): string {
	return date.getDate().toString();
}

/**
 * Formats a Date to a full weekday and date, e.g. 'Monday, October 14'.
 */
export function formatDayLong(date: Date): string {
	return date.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

/**
 * Formats an hour number to 24h display (e.g., '09:00').
 */
export function formatHour(hour: number): string {
	return `${hour.toString().padStart(2, "0")}:00`;
}

/**
 * Formats the hour-long block starting at `hour`, e.g. '09:00 – 10:00'.
 */
export function formatHourRange(hour: number): string {
	return `${formatHour(hour)} – ${formatHour(Math.min(24, hour + 1))}`;
}

/**
 * Formats a Date to ISO date string (YYYY-MM-DD) in local time.
 */
export function formatDateISO(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
