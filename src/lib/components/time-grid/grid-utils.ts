import type { CellCoord, CellVisualState } from './types';

/**
 * Serializes a cell's coordinates to a unique string key.
 */
export function cellKey(dayIndex: number, hour: number): string {
	return `${dayIndex}-${hour}`;
}

/**
 * Parses a serialized cell key back into coordinates.
 */
export function parseCellKey(key: string): CellCoord | null {
	const parts = key.split('-');
	if (parts.length !== 2) return null;
	const dayIndex = Number(parts[0]);
	const hour = Number(parts[1]);
	if (Number.isNaN(dayIndex) || Number.isNaN(hour)) return null;
	return { dayIndex, hour };
}

/**
 * Computes all cell keys included in the 2D bounding rectangle between two cells.
 */
export function getCellsInRect(start: CellCoord, end: CellCoord): string[] {
	const minDay = Math.min(start.dayIndex, end.dayIndex);
	const maxDay = Math.max(start.dayIndex, end.dayIndex);
	const minHour = Math.min(start.hour, end.hour);
	const maxHour = Math.max(start.hour, end.hour);

	const cells: string[] = [];
	for (let d = minDay; d <= maxDay; d++) {
		for (let h = minHour; h <= maxHour; h++) {
			cells.push(cellKey(d, h));
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
