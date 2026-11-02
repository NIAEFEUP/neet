import { Temporal } from "temporal-polyfill";
import { cellKey, parseCellKey } from "./grid-utils";
import type { CellMode, SelectedCells } from "./types";

/** The values stored in the database, mirroring the contract enum. */
export type AvailabilityStatus = "yes" | "if_need_be";

export interface AvailabilityBlock {
	startTime: Temporal.Instant;
	endTime: Temporal.Instant;
	status: AvailabilityStatus;
}

/** A block as read back from the ORM, where the status is just a string. */
export interface StoredAvailabilityBlock {
	startTime: Temporal.Instant;
	endTime: Temporal.Instant;
	status: string;
}

const MODE_TO_STATUS: Record<CellMode, AvailabilityStatus> = {
	yes: "yes",
	maybe: "if_need_be",
};

const STATUS_TO_MODE: Record<AvailabilityStatus, CellMode> = {
	yes: "yes",
	if_need_be: "maybe",
};

export function isCellMode(value: unknown): value is CellMode {
	return value === "yes" || value === "maybe";
}

export function modeToStatus(mode: CellMode): AvailabilityStatus {
	return MODE_TO_STATUS[mode];
}

export function statusToMode(status: string): CellMode | null {
	return STATUS_TO_MODE[status as AvailabilityStatus] ?? null;
}

function instantAt(
	date: string,
	hour: number,
	timeZone: string,
): Temporal.Instant {
	const plainDate = Temporal.PlainDate.from(date).add({
		days: Math.floor(hour / 24),
	});

	return plainDate
		.toZonedDateTime({
			timeZone,
			plainTime: Temporal.PlainTime.from({ hour: hour % 24 }),
		})
		.toInstant();
}

/**
 * Collapses the per-hour cells into the contiguous ranges the database stores,
 * in the event's timezone. Two modes are never merged into one range, and a
 * run that crosses midnight becomes two ranges because the date changes.
 */
export function selectedToAvailability(
	selected: SelectedCells,
	timeZone: string,
): AvailabilityBlock[] {
	// Group hour numbers by day and mode first, so grouping consecutive hours is
	// a simple scan.
	const days = new Map<string, Map<CellMode, number[]>>();

	for (const [key, mode] of Object.entries(selected)) {
		const parsed = parseCellKey(key);
		if (!parsed || !isCellMode(mode)) continue;

		let byMode = days.get(parsed.date);
		if (!byMode) {
			byMode = new Map();
			days.set(parsed.date, byMode);
		}

		const hours = byMode.get(mode) ?? [];
		hours.push(parsed.hour);
		byMode.set(mode, hours);
	}

	const blocks: AvailabilityBlock[] = [];

	for (const [date, byMode] of days) {
		for (const [mode, hours] of byMode) {
			const unique = [...new Set(hours)].sort((a, b) => a - b);
			let start = unique[0];
			let previous = unique[0];

			for (let i = 1; i < unique.length; i++) {
				const hour = unique[i];
				if (hour === previous + 1) {
					previous = hour;
					continue;
				}

				blocks.push({
					startTime: instantAt(date, start, timeZone),
					endTime: instantAt(date, previous + 1, timeZone),
					status: modeToStatus(mode),
				});
				start = hour;
				previous = hour;
			}

			blocks.push({
				startTime: instantAt(date, start, timeZone),
				endTime: instantAt(date, previous + 1, timeZone),
				status: modeToStatus(mode),
			});
		}
	}

	return blocks;
}

/**
 * Expands stored ranges back into editable hour cells. Walks absolute hours so
 * a range that crosses midnight (or a DST boundary) still lands on the wall
 * clock the grid shows.
 */
export function availabilityToSelected(
	blocks: StoredAvailabilityBlock[],
	timeZone: string,
): SelectedCells {
	const selected: SelectedCells = {};

	for (const block of blocks) {
		const mode = statusToMode(block.status);
		if (!mode) continue;

		let cursor = block.startTime.toZonedDateTimeISO(timeZone);
		const end = block.endTime.toZonedDateTimeISO(timeZone);

		while (Temporal.ZonedDateTime.compare(cursor, end) < 0) {
			selected[cellKey(cursor.toPlainDate().toString(), cursor.hour)] = mode;
			cursor = cursor.add({ hours: 1 });
		}
	}

	return selected;
}

/**
 * Parses the hidden form field the grid writes. Returns `null` for anything
 * that is not a plain object of `CellKey -> CellMode` pairs.
 */
export function parseSelectedCells(
	raw: FormDataEntryValue | null,
): SelectedCells | null {
	if (typeof raw !== "string" || raw.trim() === "") return null;

	try {
		const value: unknown = JSON.parse(raw);
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			return null;
		}

		const selected: SelectedCells = {};
		for (const [key, mode] of Object.entries(value)) {
			if (!isCellMode(mode) || !parseCellKey(key)) return null;
			selected[key] = mode;
		}

		return selected;
	} catch {
		return null;
	}
}

/**
 * Rejects cells that fall outside the event's dates or daily hour bounds, so a
 * tampered form cannot write availability for a day the organizer never offered.
 */
export function validateSelectedCells(
	selected: SelectedCells,
	dates: string[],
	startHour: number,
	endHour: number,
): string | null {
	const allowedDates = new Set(dates);

	for (const key of Object.keys(selected)) {
		const parsed = parseCellKey(key);
		if (!parsed) return "That time selection could not be read.";
		if (!allowedDates.has(parsed.date)) {
			return "That selection includes a day this event does not cover.";
		}
		if (parsed.hour < startHour || parsed.hour >= endHour) {
			return "That selection includes an hour outside the event's daily hours.";
		}
	}

	return null;
}
