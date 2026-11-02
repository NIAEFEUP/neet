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

export type CellVisualState =
	| "idle"
	/** Held down, before a long-press has been confirmed into a drag. */
	| "pressing"
	| "actively-painting"
	| "painted"
	| "actively-unpainting";

export type SelectedCells = Record<CellKey, boolean>;
