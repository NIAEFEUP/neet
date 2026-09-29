<script lang="ts">
	import { computeDays, computeHours, formatHour } from './time-grid/date-utils';
	import { getCellCoordFromPoint } from './time-grid/grid-utils';
	import { TimeGridState } from './time-grid/time-grid-state.svelte';
	import TimeGridCell from './time-grid/TimeGridCell.svelte';
	import TimeGridDaysHeader from './time-grid/TimeGridDaysHeader.svelte';
	import TimeGridHeader from './time-grid/TimeGridHeader.svelte';
	import type { CalendarEvent, SelectedCells } from './time-grid/types';

	interface Props {
		events?: CalendarEvent[];
		selected?: SelectedCells;
		onchange?: (selected: SelectedCells) => void;
	}

	let {
		events = [],
		selected = $bindable({}),
		onchange
	}: Props = $props();

	const state = new TimeGridState({
		initialSelected: selected,
		getDays: () => days,
		onSelectionChange: (newSelected) => {
			selected = newSelected;
			onchange?.(newSelected);
		}
	});

	$effect(() => {
		if (selected !== state.selectedCells) {
			state.setSelectedCells(selected);
		}
	});

	let days = $derived(computeDays(events));
	let hours = $derived(computeHours(events));

	function handleMouseMove(e: MouseEvent) {
		if (!state.isDragging) return;
		const cell = getCellCoordFromPoint(e.clientX, e.clientY);
		if (!cell) return;
		state.updateMouseDrag(cell);
	}

	function handleMouseUp() {
		state.endMouseDrag();
	}

	function handleTouchMove(e: TouchEvent) {
		if (!state.isDragging) return;
		e.preventDefault();

		const touch = e.touches[0];
		if (!touch) return;

		const cell = getCellCoordFromPoint(touch.clientX, touch.clientY);
		if (!cell) return;
		state.updateTouchDrag(cell);
	}

	function handleTouchEnd() {
		state.endTouchDrag();
	}
</script>

<svelte:window
	onmousemove={handleMouseMove}
	onmouseup={handleMouseUp}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
/>

<div class="p-4">
	<TimeGridHeader
		selectedCount={state.selectedCount}
		onClear={() => state.clearSelection()}
	/>

	<div class="overflow-auto border border-gray-200 rounded-lg max-h-[70vh]">
		<div
			class="grid select-none min-w-150 cursor-crosshair"
			role="grid"
			style="grid-template-columns: 60px repeat({days.length}, 1fr); grid-auto-rows: 40px;"
		>
			<TimeGridDaysHeader {days} />

			{#each hours as currentHour (currentHour)}
				<div
					class="sticky left-0 z-10 bg-gray-50 border-r border-b border-gray-200 flex items-center justify-center text-xs text-gray-500"
					role="rowheader"
				>
					{formatHour(currentHour)}
				</div>

				{#each days as day, dayIndex (dayIndex)}
					<TimeGridCell
						{dayIndex}
						date={day}
						hour={currentHour}
						visualState={state.getCellVisualState(day, currentHour)}
						onmousedown={() => state.startMouseDrag({ dayIndex, hour: currentHour })}
						ontouchstart={() => state.startTouchDrag({ dayIndex, hour: currentHour })}
					/>
				{/each}
			{/each}
		</div>
	</div>
</div>
