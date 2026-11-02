import { formatDateISO } from "./date-utils";
import type { CellCoord, CellVisualState, DayInput } from "./types";

/**
 * Serializes a cell's coordinates to a unique string key.
 * Accepts the same day values as the grid: a local `Date` or `'YYYY-MM-DD'`.
 */
export function cellKey(day: DayInput, hour: number): string {
	const dateStr =
		typeof day === "string" ? day.slice(0, 10) : formatDateISO(day);
	const hourStr = String(hour).padStart(2, "0");
	return `${dateStr}T${hourStr}:00`;
}

/**
 * Parses a serialized cell key back into its ISO date and hour.
 */
export function parseCellKey(
	key: string,
): { date: string; hour: number } | null {
	const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):00$/.exec(key);
	if (!match) return null;

	return {
		date: match[1],
		hour: Number.parseInt(match[2], 10),
	};
}

/**
 * Converts a cell key directly to a JavaScript Date object in local time.
 */
export function cellKeyToDate(key: string): Date | null {
	const parsed = parseCellKey(key);
	if (!parsed) return null;

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
	days: DayInput[],
): string[] {
	const minDay = Math.min(start.dayIndex, end.dayIndex);
	const maxDay = Math.max(start.dayIndex, end.dayIndex);
	const minHour = Math.min(start.hour, end.hour);
	const maxHour = Math.max(start.hour, end.hour);

	const cells: string[] = [];
	for (let d = minDay; d <= maxDay; d++) {
		const day = days[d];
		if (!day) continue;

		for (let h = minHour; h <= maxHour; h++) {
			cells.push(cellKey(day, h));
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
 * DOM ids for the ARIA grid. The prefix keeps two grids on one page distinct,
 * and column/row ids give each cell an accessible name built from its headers.
 */
export function columnId(prefix: string, dayIndex: number): string {
	return `${prefix}-col-${dayIndex}`;
}

export function rowId(prefix: string, hour: number): string {
	return `${prefix}-row-${hour}`;
}

export function gridCellId(
	prefix: string,
	dayIndex: number,
	hour: number,
): string {
	return `${prefix}-cell-${dayIndex}-${hour}`;
}

/**
 * The cell has no border, no radius and no background of its own: it is a
 * target, and the only thing that should be visible is what the user put there.
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
	// The radius itself is set inline per cell, because it depends on the shape
	// of the painted region around it. This softens whatever radius it is given
	// into continuous curvature, and browsers without it fall back to a plain
	// rounded corner.
	"[corner-shape:squircle]",
	"cursor-crosshair",
].join(" ");

/**
 * The keyboard cursor. Drawn as an outline so it follows the cell's shape
 * without changing its size, and lifted above its neighbours so the ring is
 * never clipped by the next cell.
 */
const FOCUSED = "relative z-20 outline-2 -outline-offset-2 outline-gray-900";

/**
 * Hours are the axis you scan repeatedly, so they get a rule. Days are named
 * directly above the column they belong to and do not need one — dropping the
 * verticals is what takes this from a table back to a surface.
 *
 * The rule sits on the empty cell, which is also why a selection reads as one
 * uninterrupted block: nothing inside it draws lines.
 */
const RULED = "border-b border-black/5";

/**
 * Two hues, each revealed by degrees. The colour never changes while painting,
 * only how much of it is present.
 *
 * Committed is a *deep* tone rather than a bright one: it is calmer across a
 * large area, and it reaches 5:1 (green) / 3:1 (yellow) against white where the
 * lighter tones managed only 2.2:1 — under the 3:1 a state indicator needs.
 *
 * Each state carries its own complete transition and exactly one state class is
 * ever applied, so they cannot fight: what the finger is driving must be
 * instant, and only committed change gets to ease.
 */
const STATE_CLASSES: Record<Exclude<CellVisualState, "idle">, string> = {
	// Held, before it is known to be a drag.
	pressing: "bg-gray-900/10",
	// Actively sweeping with a brush: tracks the pointer 1:1, so no transition.
	"active-yes": "bg-green-700/35",
	"active-maybe": "bg-yellow-600/40",
	// Clearing a block that is already entirely in the active brush.
	"active-clearing": "bg-gray-900/25",
	// Committed: the only change the user is not currently dragging. No hover
	// fill, deliberately — the pointer always comes to rest on the last cell it
	// crossed, and a darker tile inside a selection reads as an inconsistency in
	// the selection rather than as feedback.
	yes: "bg-green-700 transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
	maybe:
		"bg-yellow-600 transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
};

/**
 * Returns the Tailwind class list for a cell.
 */
export function getCellClass(state: CellVisualState, focused = false): string {
	const visual =
		state === "idle"
			? `${BASE_CELL_CLASS} ${RULED} hover:bg-gray-50 transition-colors duration-150 ease-out`
			: `${BASE_CELL_CLASS} ${STATE_CLASSES[state]}`;

	return focused ? `${visual} ${FOCUSED}` : visual;
}
