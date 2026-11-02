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
 * How strongly the guest can make a block. Kept separate from the database
 * enum (`available` / `if_need_be`) so the UI can use a shorter, friendlier
 * word for the second one.
 */
export type CellMode = "available" | "maybe";

export type CellVisualState =
	| "idle"
	/** Held down, before a long-press has been confirmed into a drag. */
	| "pressing"
	/** The drag is applying the current brush. */
	| "active-available"
	| "active-maybe"
	/** The drag is clearing a block that is already entirely in the brush. */
	| "active-clearing"
	| "available"
	| "maybe";

export type SelectedCells = Record<CellKey, CellMode>;
