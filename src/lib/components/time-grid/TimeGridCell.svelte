<script lang="ts">
	import { getCellClass } from './grid-utils';
	import type { CellVisualState } from './types';

	interface Props {
		dayIndex: number;
		hour: number;
		visualState: CellVisualState;
		onmousedown: (e: MouseEvent) => void;
		ontouchstart: (e: TouchEvent) => void;
	}

	let { dayIndex, hour, visualState, onmousedown, ontouchstart }: Props = $props();

	let cellClass = $derived(getCellClass(visualState));
</script>

<div
	class={cellClass}
	role="gridcell"
	tabindex="0"
	data-cell
	data-day={dayIndex}
	data-hour={hour}
	{onmousedown}
	{ontouchstart}
></div>
