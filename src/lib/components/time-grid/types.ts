export interface CalendarEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
}

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
