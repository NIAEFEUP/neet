<script lang="ts">
import { formatDateISO, isTodayDate } from "./date-utils";
import { getCellClass } from "./grid-utils";
import type { CellVisualState } from "./types";

interface Props {
	dayIndex: number;
	hour: number;
	date?: Date | string;
	visualState: CellVisualState;
}

let { dayIndex, hour, date, visualState }: Props = $props();

let dateStr = $derived(
	date ? (typeof date === "string" ? date : formatDateISO(date)) : undefined,
);
let cellClass = $derived(
	getCellClass(visualState, date ? isTodayDate(date) : false),
);
</script>

<div
	class={cellClass}
	role="gridcell"
	tabindex="0"
	data-cell
	data-day={dayIndex}
	data-date={dateStr}
	data-hour={hour}
></div>
