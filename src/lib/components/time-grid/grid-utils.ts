import { formatDateISO } from "./date-utils";
import type { CellCoord, CellVisualState } from "./types";

/**
 * Serializes a cell's coordinates to a unique string key.
 * Can accept a Date object, an ISO date string ('YYYY-MM-DD'), or dayIndex number for fallback.
 */
export function cellKey(
	dateOrDay: Date | string | number,
	hour: number,
): string {
	if (typeof dateOrDay === "number") {
		return `${dateOrDay}-${hour}`;
	}
	const dateStr =
		typeof dateOrDay === "string" ? dateOrDay : formatDateISO(dateOrDay);
	const hourStr = String(hour).padStart(2, "0");
	return `${dateStr}T${hourStr}:00`;
}

/**
 * Parses a serialized cell key back into date string and hour number, or dayIndex.
 */
export function parseCellKey(
	key: string,
): { date: string; hour: number } | { dayIndex: number; hour: number } | null {
	const isoMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}):00$/.exec(key);
	if (isoMatch) {
		return {
			date: isoMatch[1],
			hour: parseInt(isoMatch[2], 10),
		};
	}

	const indexMatch = /^(\d+)-(\d+)$/.exec(key);
	if (indexMatch) {
		return {
			dayIndex: parseInt(indexMatch[1], 10),
			hour: parseInt(indexMatch[2], 10),
		};
	}

	return null;
}

/**
 * Converts a cell key directly to a JavaScript Date object in local time.
 */
export function cellKeyToDate(key: string): Date | null {
	const parsed = parseCellKey(key);
	if (!parsed || !("date" in parsed)) return null;
	const [year, month, day] = parsed.date.split("-").map(Number);
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
export function getCellsInRect(
	start: CellCoord,
	end: CellCoord,
	days?: Date[],
): string[] {
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
export function getCellCoordFromPoint(
	clientX: number,
	clientY: number,
): CellCoord | null {
	const element = document.elementFromPoint(clientX, clientY);
	const cell = element?.closest("[data-cell]");
	if (!cell) return null;

	const dayIndex = Number(cell.getAttribute("data-day"));
	const hour = Number(cell.getAttribute("data-hour"));

	if (Number.isNaN(dayIndex) || Number.isNaN(hour)) return null;

	return { dayIndex, hour };
}

/**
 * The tile. Its only job visually is to be a shape: every border in this grid is
 * gone, and what separates one hour from the next is the gutter between tiles,
 * not a line. `corner-shape` softens the corner into a squircle where the
 * browser supports it and is simply ignored where it does not.
 */
const BASE_CELL_CLASS = [
	"[-webkit-touch-callout:none]",
	// `touch-action` is resolved along the ancestor chain, so anything narrow
	// here (`none`) would kill scrolling for the whole grid. The browser keeps
	// the vertical axis — that is what makes a swipe scroll natively and
	// reliably — and we take horizontal movement for ourselves, because
	// `pan-y` means it can never be mistaken for a scroll.
	// Pinch-zoom stays enabled; blocking it would be an accessibility failure.
	"[touch-action:pan-y_pinch-zoom]",
	"rounded-lg [corner-shape:squircle]",
	"cursor-crosshair",
].join(" ");

/**
 * One hue, revealed by degrees. The colour never changes while painting — only
 * how much of it is present. That keeps the whole interaction on a single axis,
 * so a cell reads as lighter or heavier rather than as a different colour.
 *
 * Each state carries its own complete transition, and exactly one state class is
 * ever applied, so these can never fight each other:
 * feedback the finger is actively driving must be instant, and only committed
 * change is allowed to ease.
 */
const EASE = "ease-[cubic-bezier(0.23,1,0.32,1)]";

const STATE_CLASSES: Record<Exclude<CellVisualState, "idle">, string> = {
	// Held, before it is known to be a drag: it shrinks away from its neighbours,
	// which is the whole press cue a tile of this size needs.
	pressing:
		"bg-green-500/20 scale-90 transition-[background-color,scale] duration-100 ease-out",
	// Actively sweeping: the fill snaps 1:1 to the finger, but the tile eases
	// back to full size so releasing or sweeping on never pops.
	"actively-painting":
		"bg-green-500/40 transition-[scale] duration-150 ease-out",
	"actively-unpainting":
		"bg-green-500/40 transition-[scale] duration-150 ease-out",
	// Committed. This is the only change the user is not currently dragging, so
	// it is the only one that gets to fade.
	painted: `bg-green-500 hover:bg-green-600 transition-[background-color,scale] duration-150 ${EASE}`,
};

/**
 * Returns the Tailwind class list for a cell.
 */
export function getCellClass(state: CellVisualState): string {
	if (state === "idle") {
		return `${BASE_CELL_CLASS} bg-white hover:bg-gray-50 transition-colors duration-150 ${EASE}`;
	}

	return `${BASE_CELL_CLASS} ${STATE_CLASSES[state]}`;
}
