<script lang="ts">
import { formatDayNumber, formatDayShort, isTodayDate } from "./date-utils";
import { columnId } from "./grid-utils";

interface Props {
	days: Date[];
	/** First day index of the full range that `days` starts at, for stable ids. */
	startIndex: number;
	/** Unique per grid instance, so two grids on a page never share ids. */
	idPrefix: string;
}

let { days, startIndex, idPrefix }: Props = $props();
</script>

<!-- `contents` keeps the wrapper out of the CSS grid while giving assistive
     technology the row it needs. -->
<div role="row" class="contents">
	<!-- Corner spacer: keeps the sticky day labels aligned with the hour column. -->
	<div class="sticky top-0 left-0 z-30 bg-white" aria-hidden="true"></div>
	{#each days as day, index (day.getTime())}
		{@const today = isTodayDate(day)}
		<!-- One line per day instead of two stacked ones: the column is labelled and
		     the header stays shorter than the rows it describes. -->
		<div
			class="sticky top-0 z-20 flex items-center justify-center bg-white px-1 pb-2"
			role="columnheader"
			id={columnId(idPrefix, startIndex + index)}
		>
			<span
				class={[
					"flex items-baseline gap-1 rounded-lg px-2 py-0.5 text-[11px] [corner-shape:squircle]",
					today ? "bg-gray-900 text-white" : "text-gray-400",
				]}
			>
				<span>{formatDayShort(day)}</span>
				<span class={today ? "font-semibold" : "font-medium text-gray-500"}>
					{formatDayNumber(day)}
				</span>
			</span>
		</div>
	{/each}
</div>
