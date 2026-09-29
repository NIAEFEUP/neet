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
	| 'idle'
	| 'actively-painting'
	| 'painted'
	| 'actively-unpainting';
