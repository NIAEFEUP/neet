<script lang="ts">
	import { formatDayNumber, formatDayShort } from './date-utils';

	interface Props {
		days: Date[];
	}

	let { days }: Props = $props();
</script>

<div class="sticky top-0 left-0 z-30 bg-gray-50 border-r border-b border-gray-200"></div>
{#each days as day, dayIndex (dayIndex)}
	<div
		class="sticky top-0 z-20 bg-gray-50 border-r border-b border-gray-200 flex flex-col items-center justify-center p-2 text-xs"
		role="columnheader"
	>
		<span class="font-medium text-gray-700">{formatDayShort(day)}</span>
		<span class="text-gray-500">{formatDayNumber(day)}</span>
	</div>
{/each}
