<script lang="ts">
	import { formatDateISO } from './date-utils';
	import { getCellClass } from './grid-utils';
	import type { CellVisualState } from './types';

	interface Props {
		dayIndex: number;
		hour: number;
		date?: Date | string;
		visualState: CellVisualState;
		onmousedown: (e: MouseEvent) => void;
		ontouchstart: (e: TouchEvent) => void;
	}

	let { dayIndex, hour, date, visualState, onmousedown, ontouchstart }: Props = $props();

	let cellClass = $derived(getCellClass(visualState));
	let dateStr = $derived(date ? (typeof date === 'string' ? date : formatDateISO(date)) : undefined);
</script>

<div
	class={cellClass}
	role="gridcell"
	tabindex="0"
	data-cell
	data-day={dayIndex}
	data-date={dateStr}
	data-hour={hour}
	{onmousedown}
	{ontouchstart}
></div>
