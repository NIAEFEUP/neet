<script lang="ts">
import { formatDayNumber, formatDayShort, isTodayDate } from "./date-utils";

interface Props {
	days: Date[];
}

let { days }: Props = $props();
</script>

<div class="sticky top-0 left-0 z-30 bg-gray-50 border-r border-b border-gray-200"></div>
{#each days as day (day.getTime())}
	{@const today = isTodayDate(day)}
	<div
		class="sticky top-0 z-20 flex flex-col items-center gap-0.5 border-r border-b border-gray-200 bg-gray-50 px-1 py-2"
		role="columnheader"
	>
		<span class="font-medium text-[10px] text-gray-500 uppercase tracking-wider">
			{formatDayShort(day)}
		</span>
		<!-- Both branches are the same size so today's chip stays in line with the
		     plain numbers either side of it. -->
		<span
			class={[
				"flex h-6 w-6 items-center justify-center rounded-full font-medium text-sm",
				today ? "bg-gray-900 text-white" : "text-gray-700",
			]}
		>
			{formatDayNumber(day)}
		</span>
	</div>
{/each}
