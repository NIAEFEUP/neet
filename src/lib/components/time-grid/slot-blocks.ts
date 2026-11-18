import { cellKey } from "./grid-utils";
import type { PublicResponse, SlotBlock } from "./types";

interface AvailabilitySignature {
	yes: string[];
	maybe: string[];
}

function buildSignature(
	responses: PublicResponse[],
	day: Date,
	hour: number,
): AvailabilitySignature {
	const key = cellKey(day, hour);
	const yes: string[] = [];
	const maybe: string[] = [];

	for (const response of responses) {
		const mode = response.selected[key];
		if (mode === "yes") {
			yes.push(response.id);
		} else if (mode === "maybe") {
			maybe.push(response.id);
		}
	}

	yes.sort((a, b) => a.localeCompare(b));
	maybe.sort((a, b) => a.localeCompare(b));

	return { yes, maybe };
}

function sameSignature(
	a: AvailabilitySignature,
	b: AvailabilitySignature,
): boolean {
	if (a.yes.length !== b.yes.length || a.maybe.length !== b.maybe.length) {
		return false;
	}

	for (let i = 0; i < a.yes.length; i++) {
		if (a.yes[i] !== b.yes[i]) return false;
	}

	for (let i = 0; i < a.maybe.length; i++) {
		if (a.maybe[i] !== b.maybe[i]) return false;
	}

	return true;
}

/**
 * Merges consecutive hours on the same day that have identical availability
 * into vertical blocks. Empty blocks (no one available) are omitted because
 * they do not need a border.
 */
export function computeSlotBlocks(
	responses: PublicResponse[],
	days: Date[],
	hours: number[],
): SlotBlock[] {
	const blocks: SlotBlock[] = [];

	for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
		const day = days[dayIndex];
		let current: SlotBlock | null = null;

		for (const hour of hours) {
			const signature = buildSignature(responses, day, hour);

			if (
				current &&
				sameSignature(
					{ yes: current.yesIds, maybe: current.maybeIds },
					signature,
				)
			) {
				current.endHour = hour + 1;
				continue;
			}

			if (current) {
				blocks.push(current);
			}

			if (signature.yes.length === 0 && signature.maybe.length === 0) {
				current = null;
			} else {
				current = {
					dayIndex,
					day,
					startHour: hour,
					endHour: hour + 1,
					key: `${dayIndex}:${hour}`,
					yesIds: signature.yes,
					maybeIds: signature.maybe,
				};
			}
		}

		if (current) {
			blocks.push(current);
		}
	}

	// Stable keys: each block is uniquely identified by its day and hour range.
	for (const block of blocks) {
		block.key = `${block.dayIndex}:${block.startHour}-${block.endHour}`;
	}

	return blocks;
}

/**
 * Finds the block that contains the given cell. Returns `null` for empty cells.
 */
export function findSlotBlock(
	blocks: SlotBlock[],
	dayIndex: number,
	hour: number,
): SlotBlock | null {
	for (const block of blocks) {
		if (
			block.dayIndex === dayIndex &&
			block.startHour <= hour &&
			block.endHour > hour
		) {
			return block;
		}
	}

	return null;
}
