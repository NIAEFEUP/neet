/**
 * A day column. Pass a local `Date`, or an ISO calendar date (`'YYYY-MM-DD'`).
 * Strings are preferred when the data comes from the server: they carry no
 * timezone, so the column always shows the date the organizer picked.
 */
export type DayInput = Date | string;

export interface CellCoord {
	dayIndex: number;
	hour: number;
}

export type CellKey = string;

/**
 * How a guest can make a block: a plain yes, or if they are needed. Mirrors the
 * database `AvailabilityStatus` enum (`yes` / `if_need_be`).
 */
export type CellMode = "yes" | "maybe";

export type CellVisualState =
	| "idle"
	/** Held down, before a long-press has been confirmed into a drag. */
	| "pressing"
	/** The drag is applying the current brush. */
	| "active-yes"
	| "active-maybe"
	/** The drag is clearing a block that is already entirely in the brush. */
	| "active-clearing"
	| "yes"
	| "maybe";

export type SelectedCells = Record<CellKey, CellMode>;
