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

/**
 * One selectable block per hour. Inspection is hour-granular, so consecutive
 * hours with identical answers deliberately stay separate instead of merging
 * into a single longer range.
 */
export function computeSlotBlocks(
	responses: PublicResponse[],
	days: Date[],
	hours: number[],
): SlotBlock[] {
	const blocks: SlotBlock[] = [];

	for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
		const day = days[dayIndex];

		for (const hour of hours) {
			const signature = buildSignature(responses, day, hour);
			if (signature.yes.length === 0 && signature.maybe.length === 0) {
				continue;
			}

			blocks.push({
				dayIndex,
				day,
				startHour: hour,
				endHour: hour + 1,
				key: `${dayIndex}:${hour}`,
				yesIds: signature.yes,
				maybeIds: signature.maybe,
			});
		}
	}

	return blocks;
}

/**
 * Finds the hour that contains the given cell. Returns `null` for empty cells.
 */
export function findSlotBlock(
	blocks: SlotBlock[],
	dayIndex: number,
	hour: number,
): SlotBlock | null {
	return (
		blocks.find(
			(block) =>
				block.dayIndex === dayIndex &&
				block.startHour <= hour &&
				block.endHour > hour,
		) ?? null
	);
}
