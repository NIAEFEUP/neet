<script lang="ts">
import { formatDateISO } from "./date-utils";
import { getCellClass } from "./grid-utils";
import type { CellVisualState } from "./types";

interface Props {
	id: string;
	/** Space-separated column and row header ids, used as the accessible name. */
	labelledBy: string;
	dayIndex: number;
	hour: number;
	date?: Date | string;
	visualState: CellVisualState;
	/** Corner radii in TL TR BR BL order, computed from the painted region. */
	radius: string;
	selected: boolean;
	/** True when the keyboard cursor is on this cell. */
	focused: boolean;
}

let {
	id,
	labelledBy,
	dayIndex,
	hour,
	date,
	visualState,
	radius,
	selected,
	focused,
}: Props = $props();

let cellClass = $derived(getCellClass(visualState, focused));
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
	{id}
	class={cellClass}
	style={shape}
	role="gridcell"
	aria-labelledby={labelledBy}
	aria-selected={selected}
	data-cell
	data-day={dayIndex}
	data-date={dateStr}
	data-hour={hour}
></div>
