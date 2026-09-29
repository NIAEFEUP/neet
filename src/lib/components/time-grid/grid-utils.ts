import { formatDateISO } from './date-utils';
import type { CellCoord, CellVisualState } from './types';

/**
 * Serializes a cell's coordinates to a unique string key.
 * Can accept a Date object, an ISO date string ('YYYY-MM-DD'), or dayIndex number for fallback.
 */
export function cellKey(dateOrDay: Date | string | number, hour: number): string {
	if (typeof dateOrDay === 'number') {
		return `${dateOrDay}-${hour}`;
	}
	const dateStr = typeof dateOrDay === 'string' ? dateOrDay : formatDateISO(dateOrDay);
	const hourStr = String(hour).padStart(2, '0');
	return `${dateStr}T${hourStr}:00`;
}

/**
 * Parses a serialized cell key back into date string and hour number, or dayIndex.
 */
export function parseCellKey(
	key: string
): { date: string; hour: number } | { dayIndex: number; hour: number } | null {
	const isoMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}):00$/.exec(key);
	if (isoMatch) {
		return {
			date: isoMatch[1],
			hour: parseInt(isoMatch[2], 10)
		};
	}

	const indexMatch = /^(\d+)-(\d+)$/.exec(key);
	if (indexMatch) {
		return {
			dayIndex: parseInt(indexMatch[1], 10),
			hour: parseInt(indexMatch[2], 10)
		};
	}

	return null;
}

/**
 * Converts a cell key directly to a JavaScript Date object in local time.
 */
export function cellKeyToDate(key: string): Date | null {
	const parsed = parseCellKey(key);
	if (!parsed || !('date' in parsed)) return null;
	const [year, month, day] = parsed.date.split('-').map(Number);
	return new Date(year, month - 1, day, parsed.hour, 0, 0, 0);
}

/**
 * Converts a JavaScript Date object directly to a cell key.
 */
export function dateToCellKey(date: Date): string {
	return cellKey(date, date.getHours());
}

/**
 * Computes all cell keys included in the 2D bounding rectangle between two cells.
 */
export function getCellsInRect(start: CellCoord, end: CellCoord, days?: Date[]): string[] {
	const minDay = Math.min(start.dayIndex, end.dayIndex);
	const maxDay = Math.max(start.dayIndex, end.dayIndex);
	const minHour = Math.min(start.hour, end.hour);
	const maxHour = Math.max(start.hour, end.hour);

	const cells: string[] = [];
	for (let d = minDay; d <= maxDay; d++) {
		const dayRef = days?.[d] ?? d;
		for (let h = minHour; h <= maxHour; h++) {
			cells.push(cellKey(dayRef, h));
		}
	}
	return cells;
}

/**
 * Resolves DOM element under point to cell coordinate if it has data-cell attributes.
 */
export function getCellCoordFromPoint(clientX: number, clientY: number): CellCoord | null {
	const element = document.elementFromPoint(clientX, clientY);
	const cell = element?.closest('[data-cell]');
	if (!cell) return null;

	const dayIndex = Number(cell.getAttribute('data-day'));
	const hour = Number(cell.getAttribute('data-hour'));

	if (Number.isNaN(dayIndex) || Number.isNaN(hour)) return null;

	return { dayIndex, hour };
}

const BASE_CELL_CLASS =
	'border-r border-b border-gray-100 cursor-pointer transition-colors duration-150 [touch-action:none] [-webkit-touch-callout:none]';

const STATE_CLASSES: Record<CellVisualState, string> = {
	'actively-painting': 'bg-blue-300 hover:bg-blue-300',
	'actively-unpainting': 'bg-blue-300 hover:bg-blue-300',
	'painted': 'bg-blue-500 hover:bg-blue-600',
	'idle': 'bg-transparent hover:bg-gray-100'
};

/**
 * Returns Tailwind class list for a given cell visual state.
 */
export function getCellClass(state: CellVisualState): string {
	return `${BASE_CELL_CLASS} ${STATE_CLASSES[state]}`;
}
