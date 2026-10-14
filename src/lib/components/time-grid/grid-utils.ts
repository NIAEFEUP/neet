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

const BASE_CELL_CLASS = [
	// The cell is a control, not content: holding it must not select text or pop
	// the iOS callout.
	"[-webkit-touch-callout:none]",
	// `touch-action` is resolved along the ancestor chain, so anything narrow
	// here (`none`) would kill scrolling for the whole grid. The browser keeps
	// the vertical axis — that is what makes a swipe scroll natively and
	// reliably — and we take horizontal movement for ourselves, because
	// `pan-y` means it can never be mistaken for a scroll.
	// Pinch-zoom stays enabled; blocking it would be an accessibility failure.
	"[touch-action:pan-y_pinch-zoom]",
	"cursor-crosshair",
].join(" ");

/**
 * Only the empty grid is ruled. A painted cell drops its hairlines, so a
 * selection reads as one continuous band of time rather than a run of squares —
 * "free 2 to 5" instead of three adjacent boxes.
 */
const RULED = "border-r border-b border-gray-100";

/**
 * The settle. A committed change eases in over 150ms with a strong ease-out, so
 * the block lands instead of snapping. Deliberately kept off the in-progress
 * states: a fade there trails behind the finger while dragging. Colour (rather
 * than movement) is also what makes it safe to keep under reduced motion.
 */
const SETTLE =
	"transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]";

const STATE_CLASSES: Record<Exclude<CellVisualState, "idle">, string> = {
	// Filled the instant the finger lands, so the hold visibly registers before
	// it is known to be a drag. No transition: this must track 1:1.
	pressing: "bg-green-200",
	"actively-painting": "bg-green-300",
	"actively-unpainting": "bg-green-300",
	painted: `bg-green-500 hover:bg-green-600 ${SETTLE}`,
};

/**
 * Today's column carries a neutral tint rather than a second green: green means
 * "selected" everywhere else, and one colour should not mean two things.
 */
const TODAY_TINT = "bg-gray-100/70 hover:bg-gray-200/70";

/**
 * Returns the Tailwind class list for a cell.
 *
 * `today` only affects empty cells — a tinted column still has to give way to
 * whatever the user has actually marked.
 */
export function getCellClass(state: CellVisualState, today = false): string {
	if (state === "idle") {
		const tint = today ? TODAY_TINT : "bg-transparent hover:bg-gray-100";
		return `${BASE_CELL_CLASS} ${RULED} ${tint} ${SETTLE}`;
	}

	return `${BASE_CELL_CLASS} ${STATE_CLASSES[state]}`;
}
