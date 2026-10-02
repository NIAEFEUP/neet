import type { CalendarEvent } from './types';

/**
 * Computes the list of dates to display in the grid based on events,
 * or defaults to the current week (Sunday through Saturday).
 */
export function computeDays(events: CalendarEvent[]): Date[] {
	if (events.length === 0) {
		const today = new Date();
		const startOfWeek = new Date(today);
		startOfWeek.setDate(today.getDate() - today.getDay());
		startOfWeek.setHours(0, 0, 0, 0);

		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(startOfWeek);
			d.setDate(startOfWeek.getDate() + i);
			return d;
		});
	}

	const minTime = Math.min(...events.map((e) => e.start.getTime()));
	const maxTime = Math.max(...events.map((e) => e.end.getTime()));
	const minDate = new Date(minTime);
	const maxDate = new Date(maxTime);
	minDate.setHours(0, 0, 0, 0);
	maxDate.setHours(0, 0, 0, 0);

	const result: Date[] = [];
	const current = new Date(minDate);
	while (current <= maxDate) {
		result.push(new Date(current));
		current.setDate(current.getDate() + 1);
	}
	return result;
}

/**
 * Computes the list of hour intervals (0-23) based on events,
 * or defaults to all 24 hours.
 */
export function computeHours(events: CalendarEvent[]): number[] {
	if (events.length === 0) {
		return Array.from({ length: 24 }, (_, i) => i);
	}

	const minHour = Math.max(0, Math.min(...events.map((e) => e.start.getHours())) - 1);
	const maxHour = Math.min(23, Math.max(...events.map((e) => e.end.getHours())) + 1);

	return Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
}

/**
 * Formats a Date to a short weekday string (e.g., 'Mon').
 */
export function formatDayShort(date: Date): string {
	return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Formats a Date to day of month (e.g., '14').
 */
export function formatDayNumber(date: Date): string {
	return date.getDate().toString();
}

/**
 * Formats an hour number to 24h display (e.g., '09:00').
 */
export function formatHour(hour: number): string {
	return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Formats a Date to ISO date string (YYYY-MM-DD) in local time.
 */
export function formatDateISO(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

