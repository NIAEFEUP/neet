<script lang="ts">
import { formatDateISO } from "./date-utils";
import { getCellClass } from "./grid-utils";
import type { CellVisualState } from "./types";

interface Props {
	dayIndex: number;
	hour: number;
	date?: Date | string;
	visualState: CellVisualState;
	/** Corner radii in TL TR BR BL order, computed from the painted region. */
	radius: string;
}

let { dayIndex, hour, date, visualState, radius }: Props = $props();

let cellClass = $derived(getCellClass(visualState));
let dateStr = $derived(
	date ? (typeof date === "string" ? date : formatDateISO(date)) : undefined,
);

/**
 * The hour rule is a `border-bottom`, and a border follows its element's radius
 * — so rounding an empty cell turns one continuous hour rule into a rounded
 * segment per cell. Rounding is only applied once there is a fill for it to
 * shape; an empty cell is just a rule and a target.
 */
let shape = $derived(
	visualState === "idle" ? undefined : `border-radius: ${radius};`,
);
</script>

<div
	class={cellClass}
	style={shape}
	role="gridcell"
	tabindex="0"
	data-cell
	data-day={dayIndex}
	data-date={dateStr}
	data-hour={hour}
></div>
