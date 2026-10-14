<script lang="ts">
import { formatDayNumber, formatDayShort, isTodayDate } from "./date-utils";

interface Props {
	days: Date[];
}

let { days }: Props = $props();
</script>

<!-- The chrome shares the canvas colour, so it reads as one continuous strip
     rather than as a row of cells with a background. -->
<div class="sticky top-0 left-0 z-30 bg-gray-100"></div>
{#each days as day (day.getTime())}
	{@const today = isTodayDate(day)}
	<div
		class="sticky top-0 z-20 flex flex-col items-center gap-1 bg-gray-100 px-1 py-2"
		role="columnheader"
	>
		<span class="font-medium text-[10px] text-gray-400 uppercase tracking-widest">
			{formatDayShort(day)}
		</span>
		<!-- Today's date sits in a squircle. The chip is the same 24px box either
		     way, so the column never falls out of line with its neighbours. -->
		<span
			class={[
				"flex h-6 w-6 items-center justify-center rounded-lg font-semibold text-sm [corner-shape:squircle]",
				today ? "bg-gray-900 text-white" : "font-medium text-gray-500",
			]}
		>
			{formatDayNumber(day)}
		</span>
	</div>
{/each}
