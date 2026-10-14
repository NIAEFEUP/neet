<script lang="ts">
import { formatDayNumber, formatDayShort, isTodayDate } from "./date-utils";

interface Props {
	days: Date[];
}

let { days }: Props = $props();
</script>

<div class="sticky top-0 left-0 z-30 bg-white"></div>
{#each days as day (day.getTime())}
	{@const today = isTodayDate(day)}
	<!-- One line per day instead of two stacked ones: the column is labelled and
	     the header stays shorter than the rows it describes. -->
	<div
		class="sticky top-0 z-20 flex items-center justify-center bg-white px-1 pb-2"
		role="columnheader"
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
