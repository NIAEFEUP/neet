<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	interface CalendarEvent {
		id: string;
		title: string;
		start: Date;
		end: Date;
	}

	let { events = [] }: { events: CalendarEvent[] } = $props();

	let days = $derived.by(() => {
		if (events.length === 0) {
			const today = new Date();
			const startOfWeek = new Date(today);
			startOfWeek.setDate(today.getDate() - today.getDay());
			startOfWeek.setHours(0, 0, 0, 0);
			return Array.from({ length: 7 }, (_, i) => {
				const d = new Date(startOfWeek);
				d.setDate(startOfWeek.getDate() + i);
				return d;
			});
		}

		const minTime = Math.min(...events.map((e) => e.start.getTime()));
		const maxTime = Math.max(...events.map((e) => e.end.getTime()));
		const minDate = new Date(minTime);
		const maxDate = new Date(maxTime);
		minDate.setHours(0, 0, 0, 0);
		maxDate.setHours(0, 0, 0, 0);

		const result: Date[] = [];
		const current = new Date(minDate);
		while (current <= maxDate) {
			result.push(new Date(current));
			current.setDate(current.getDate() + 1);
		}
		return result;
	});

	let hours = $derived.by(() => {
		if (events.length === 0) {
			return Array.from({ length: 24 }, (_, i) => i);
		}

		const minHour = Math.max(0, Math.min(...events.map((e) => e.start.getHours())) - 1);
		const maxHour = Math.min(23, Math.max(...events.map((e) => e.end.getHours())) + 1);

		return Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
	});

	let selectedCells = new SvelteSet<string>();
	let isDragging = $state(false);
	let paintMode = $state(true);
	let dragStartCell = $state<{ dayIndex: number; hour: number } | null>(null);
	let dragEndCell = $state<{ dayIndex: number; hour: number } | null>(null);
	let paintedCells = new SvelteSet<string>();

	let selectionRect = $derived.by(() => {
		if (!dragStartCell || !dragEndCell) return null;

		const minDay = Math.min(dragStartCell.dayIndex, dragEndCell.dayIndex);
		const maxDay = Math.max(dragStartCell.dayIndex, dragEndCell.dayIndex);
		const minHour = Math.min(dragStartCell.hour, dragEndCell.hour);
		const maxHour = Math.max(dragStartCell.hour, dragEndCell.hour);

		const cells: string[] = [];
		for (let d = minDay; d <= maxDay; d++) {
			for (let h = minHour; h <= maxHour; h++) {
				cells.push(`${d}-${h}`);
			}
		}
		return cells;
	});

	let selectedCount = $derived(selectedCells.size);

	function cellKey(dayIndex: number, hour: number) {
		return `${dayIndex}-${hour}`;
	}

	function getCellFromPoint(clientX: number, clientY: number) {
		const element = document.elementFromPoint(clientX, clientY);
		const cell = element?.closest('[data-cell]');
		if (!cell) return null;

		const dayIndex = Number(cell.getAttribute('data-day'));
		const hour = Number(cell.getAttribute('data-hour'));

		if (Number.isNaN(dayIndex) || Number.isNaN(hour)) return null;

		return { dayIndex, hour };
	}

	function toggleCell(dayIndex: number, hour: number) {
		const key = cellKey(dayIndex, hour);
		if (selectedCells.has(key)) {
			selectedCells.delete(key);
		} else {
			selectedCells.add(key);
		}
	}

	function isSelected(dayIndex: number, hour: number) {
		return selectedCells.has(cellKey(dayIndex, hour));
	}

	function isInDragSelection(dayIndex: number, hour: number) {
		return selectionRect?.includes(cellKey(dayIndex, hour)) ?? false;
	}

	function handleMouseDown(e: MouseEvent) {
		const cell = getCellFromPoint(e.clientX, e.clientY);
		if (!cell) return;

		isDragging = true;
		paintMode = !selectedCells.has(cellKey(cell.dayIndex, cell.hour));
		dragStartCell = cell;
		dragEndCell = cell;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		const cell = getCellFromPoint(e.clientX, e.clientY);
		if (!cell) return;
		dragEndCell = cell;
	}

	function handleMouseUp() {
		if (!isDragging) return;

		if (selectionRect) {
			for (const key of selectionRect) {
				if (paintMode) {
					selectedCells.add(key);
				} else {
					selectedCells.delete(key);
				}
			}
		}

		isDragging = false;
		dragStartCell = null;
		dragEndCell = null;
	}

	function handleTouchStart(e: TouchEvent) {
		const touch = e.touches[0];
		if (!touch) return;

		const cell = getCellFromPoint(touch.clientX, touch.clientY);
		if (!cell) return;

		isDragging = true;
		paintMode = !selectedCells.has(cellKey(cell.dayIndex, cell.hour));
		paintedCells.clear();
		if (paintMode) {
			selectedCells.add(cellKey(cell.dayIndex, cell.hour));
		} else {
			selectedCells.delete(cellKey(cell.dayIndex, cell.hour));
		}
		paintedCells.add(cellKey(cell.dayIndex, cell.hour));
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging) return;
		e.preventDefault();

		const touch = e.touches[0];
		if (!touch) return;

		const cell = getCellFromPoint(touch.clientX, touch.clientY);
		if (!cell) return;

		const key = cellKey(cell.dayIndex, cell.hour);
		if (!paintedCells.has(key)) {
			if (paintMode) {
				selectedCells.add(key);
			} else {
				selectedCells.delete(key);
			}
			paintedCells.add(key);
		}
	}

	function handleTouchEnd() {
		isDragging = false;
		paintedCells.clear();
	}

	function clearSelection() {
		selectedCells.clear();
	}

	function formatDayShort(date: Date) {
		return date.toLocaleDateString('en-US', { weekday: 'short' });
	}

	function formatDayNumber(date: Date) {
		return date.getDate().toString();
	}

	function formatHour(hour: number) {
		return `${hour.toString().padStart(2, '0')}:00`;
	}
</script>

<svelte:window
	onmousemove={handleMouseMove}
	onmouseup={handleMouseUp}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
/>

<div class="time-grid-wrapper">
	<div class="time-grid-header">
		<h2>Time Grid</h2>
		<div class="time-grid-actions">
			<span class="selected-count">{selectedCount} blocks selected</span>
			<button onclick={clearSelection} disabled={selectedCount === 0}>Clear</button>
		</div>
	</div>

	<div class="time-grid-container">
		<div
			class="time-grid"
			class:dragging={isDragging}
			role="grid"
			style="grid-template-columns: 60px repeat({days.length}, 1fr); grid-auto-rows: 40px;"
		>
			<div class="grid-corner"></div>
			{#each days as day, dayIndex (dayIndex)}
				<div class="grid-header" role="columnheader">
					<span class="day-name">{formatDayShort(day)}</span>
					<span class="day-number">{formatDayNumber(day)}</span>
				</div>
			{/each}

			{#each hours as hour (hour)}
				<div class="grid-hour-label" role="rowheader">{formatHour(hour)}</div>
				{#each days as _, dayIndex (dayIndex)}
					<div
						class="grid-cell"
						role="gridcell"
						tabindex="0"
						data-cell
						data-day={dayIndex}
						data-hour={hour}
						class:selected={isSelected(dayIndex, hour)}
						class:drag-selected={isInDragSelection(dayIndex, hour)}
						onmousedown={handleMouseDown}
						ontouchstart={handleTouchStart}
					></div>
				{/each}
			{/each}
		</div>
	</div>
</div>

<style>
	.time-grid-wrapper {
		padding: 1rem;
	}

	.time-grid-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.time-grid-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	.time-grid-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.selected-count {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.time-grid-actions button {
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.time-grid-actions button:hover:not(:disabled) {
		background-color: #f3f4f6;
	}

	.time-grid-actions button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.time-grid-container {
		overflow: auto;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		max-height: 70vh;
	}

	.time-grid {
		display: grid;
		user-select: none;
		-webkit-user-select: none;
		min-width: 600px;
	}

	.time-grid.dragging {
		cursor: crosshair;
	}

	.grid-corner {
		position: sticky;
		top: 0;
		left: 0;
		z-index: 30;
		background: #f9fafb;
		border-right: 1px solid #e5e7eb;
		border-bottom: 1px solid #e5e7eb;
	}

	.grid-header {
		position: sticky;
		top: 0;
		z-index: 20;
		background: #f9fafb;
		border-right: 1px solid #e5e7eb;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		font-size: 0.75rem;
	}

	.day-name {
		font-weight: 500;
		color: #374151;
	}

	.day-number {
		color: #6b7280;
	}

	.grid-hour-label {
		position: sticky;
		left: 0;
		z-index: 10;
		background: #f9fafb;
		border-right: 1px solid #e5e7eb;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.grid-cell {
		border-right: 1px solid #f3f4f6;
		border-bottom: 1px solid #f3f4f6;
		cursor: pointer;
		transition: background-color 0.15s ease;
		touch-action: none;
		-webkit-touch-callout: none;
	}

	.grid-cell:hover {
		background-color: #f3f4f6;
	}

	.grid-cell.selected {
		background-color: #3b82f6;
	}

	.grid-cell.drag-selected {
		background-color: #93c5fd;
	}

	.grid-cell.selected:hover {
		background-color: #2563eb;
	}
</style>
