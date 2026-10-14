<script lang="ts">
import { computeDays, computeHours, formatHour } from "./time-grid/date-utils";
import { getCellCoordFromPoint } from "./time-grid/grid-utils";
import TimeGridCell from "./time-grid/TimeGridCell.svelte";
import TimeGridDaysHeader from "./time-grid/TimeGridDaysHeader.svelte";
import TimeGridHeader from "./time-grid/TimeGridHeader.svelte";
import { TimeGridState } from "./time-grid/time-grid-state.svelte";
import type { CalendarEvent, SelectedCells } from "./time-grid/types";

/**
 * How long a touch must be held before it becomes a paint drag. It has to be
 * long enough that a deliberate swipe always starts scrolling first, and short
 * enough that holding doesn't feel like waiting.
 */
const LONG_PRESS_MS = 300;

/**
 * Movement that hands the gesture back to the scroller. Matches the platform's
 * tap slop — below this the finger is still considered stationary.
 */
const SCROLL_SLOP_PX = 8;

interface Props {
	events?: CalendarEvent[];
	selected?: SelectedCells;
	onchange?: (selected: SelectedCells) => void;
}

let { events = [], selected = $bindable({}), onchange }: Props = $props();

const state = new TimeGridState({
	getSelected: () => selected,
	setSelected: (next) => {
		selected = next;
		onchange?.(next);
	},
	getDays: () => days,
});

let days = $derived(computeDays(events));
let hours = $derived(computeHours(events));

// Gesture bookkeeping deliberately uses plain variables rather than runes: none
// of it is rendered, and reading reactive state inside the scroll-guard
// attachment would make that attachment tear down and re-register mid-gesture.
let activePointerId: number | null = null;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let startPoint = { x: 0, y: 0 };
/** True once this gesture is ours, which is when the browser must stop scrolling. */
let ownsGesture = false;

function clearLongPress() {
	if (longPressTimer !== null) {
		clearTimeout(longPressTimer);
		longPressTimer = null;
	}
}

function resetPointer() {
	clearLongPress();
	activePointerId = null;
	ownsGesture = false;
	state.setPressing(null);
}

function handlePointerDown(event: PointerEvent) {
	// One gesture at a time — a second finger must not yank an in-flight drag.
	if (!event.isPrimary || activePointerId !== null) return;

	// Cells are resolved from the point rather than from the event target, so a
	// single handler on the grid covers every cell and ignores the headers.
	const coord = getCellCoordFromPoint(event.clientX, event.clientY);
	if (!coord) return;

	if (event.pointerType === "mouse") {
		if (event.button !== 0) return;
		// Suppress the native text-selection drag that would otherwise start.
		event.preventDefault();
		activePointerId = event.pointerId;
		ownsGesture = true;
		state.beginDrag(coord);
		return;
	}

	// Touch and pen: hold to paint, swipe to scroll. The drag only begins once
	// the press has survived long enough that a scroll can no longer be in play —
	// by then the browser hasn't started panning, so the guard below can still
	// cancel it.
	activePointerId = event.pointerId;
	startPoint = { x: event.clientX, y: event.clientY };
	state.setPressing(coord);

	longPressTimer = setTimeout(() => {
		longPressTimer = null;
		ownsGesture = true;
		if (typeof navigator.vibrate === "function") navigator.vibrate(10);
		state.beginDrag(coord);
	}, LONG_PRESS_MS);
}

function handlePointerMove(event: PointerEvent) {
	if (event.pointerId !== activePointerId) return;

	if (!state.isDragging) {
		// Still disambiguating between a tap and a scroll.
		if (longPressTimer !== null) {
			const moved = Math.hypot(
				event.clientX - startPoint.x,
				event.clientY - startPoint.y,
			);
			if (moved > SCROLL_SLOP_PX) {
				// It's a scroll. Drop the press affordance and let the browser have it.
				clearLongPress();
				state.setPressing(null);
			}
		}
		return;
	}

	const coord = getCellCoordFromPoint(event.clientX, event.clientY);
	if (coord) state.updateDrag(coord);
}

function handlePointerUp(event: PointerEvent) {
	if (event.pointerId !== activePointerId) return;

	const pending = state.pressingCell;
	const wasPending = longPressTimer !== null;
	resetPointer();

	if (state.isDragging) {
		state.endDrag();
		return;
	}

	// A tap that never grew into a drag toggles the one cell under the finger.
	if (wasPending && pending) state.toggleCell(pending);
}

function handlePointerCancel(event: PointerEvent) {
	if (event.pointerId !== activePointerId) return;
	resetPointer();
	state.cancelDrag();
}

function handleKeyDown(event: KeyboardEvent) {
	if (event.key !== "Escape") return;
	resetPointer();
	state.cancelDrag();
}

function handleWindowBlur() {
	resetPointer();
	state.endDrag();
}

/**
 * Stops the scroller while a long-press has turned into a paint drag.
 *
 * Registered non-passively and up-front: a scroll can only be cancelled on the
 * first move, while the browser is still undecided about what the gesture is.
 * Touch-action can't do this job — narrowing it to `none` would block scrolling
 * for the entire grid, including when the user is just trying to get to later hours.
 */
function preventScrollWhilePainting(node: HTMLElement) {
	function onTouchMove(event: TouchEvent) {
		if (ownsGesture && event.cancelable) event.preventDefault();
	}

	node.addEventListener("touchmove", onTouchMove, { passive: false });
	return () => node.removeEventListener("touchmove", onTouchMove);
}
</script>

<svelte:window
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerCancel}
	onkeydown={handleKeyDown}
	onblur={handleWindowBlur}
/>

<div class="p-4">
	<TimeGridHeader
		selectedCount={state.selectedCount}
		onClear={() => state.clearSelection()}
	/>

	<div
		class="max-h-[70dvh] overflow-auto overscroll-contain rounded-lg border border-gray-200"
	>
		<div
			class="grid min-w-150 select-none"
			role="grid"
			tabindex="0"
			style="grid-template-columns: 60px repeat({days.length}, 1fr); grid-auto-rows: 40px;"
			onpointerdown={handlePointerDown}
			{@attach preventScrollWhilePainting}
		>
			<TimeGridDaysHeader {days} />

			{#each hours as currentHour (currentHour)}
				<div
					class="sticky left-0 z-10 flex items-center justify-center border-r border-b border-gray-200 bg-gray-50 text-gray-500 text-xs"
					role="rowheader"
				>
					{formatHour(currentHour)}
				</div>

				{#each days as day, dayIndex (day.getTime())}
					<TimeGridCell
						{dayIndex}
						date={day}
						hour={currentHour}
						visualState={state.getCellVisualState(day, currentHour)}
					/>
				{/each}
			{/each}
		</div>
	</div>
</div>
