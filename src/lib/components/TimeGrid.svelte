<script lang="ts">
import { computeDays, computeHours, formatHour } from "./time-grid/date-utils";
import { getCellCoordFromPoint } from "./time-grid/grid-utils";
import TimeGridCell from "./time-grid/TimeGridCell.svelte";
import TimeGridDaysHeader from "./time-grid/TimeGridDaysHeader.svelte";
import TimeGridHeader from "./time-grid/TimeGridHeader.svelte";
import { TimeGridState } from "./time-grid/time-grid-state.svelte";
import type {
	CalendarEvent,
	CellCoord,
	SelectedCells,
} from "./time-grid/types";

/**
 * How long a touch must be held before it becomes a paint drag. This is the
 * secondary way in — for painting a block that runs *down* the grid — because a
 * downward drag belongs to the scroller.
 */
const LONG_PRESS_MS = 250;

/**
 * Distance that decides what a gesture is. Below it the finger is still
 * considered stationary, which is what keeps a tap from becoming a drag.
 */
const TOUCH_SLOP_PX = 10;

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
/** The cell the finger went down on, held until the gesture declares itself. */
let pendingCoord: CellCoord | null = null;
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
	pendingCoord = null;
	state.setPressing(null);
}

function startDrag(coord: CellCoord, haptics = false) {
	clearLongPress();
	ownsGesture = true;
	// Confirms the moment the gesture is committed, on the same frame as the
	// first painted cell. Android only; other platforms simply ignore it.
	if (haptics && typeof navigator.vibrate === "function") navigator.vibrate(10);
	state.beginDrag(coord);
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
		startDrag(coord);
		return;
	}

	// Touch and pen are ambiguous until the finger moves: the same press could
	// become a paint drag or a scroll. Show the affordance, then decide on the
	// first movement.
	activePointerId = event.pointerId;
	startPoint = { x: event.clientX, y: event.clientY };
	pendingCoord = coord;
	state.setPressing(coord);

	longPressTimer = setTimeout(() => {
		longPressTimer = null;
		if (pendingCoord) startDrag(pendingCoord, true);
	}, LONG_PRESS_MS);
}

function handlePointerMove(event: PointerEvent) {
	if (event.pointerId !== activePointerId) return;

	if (state.isDragging) {
		const coord = getCellCoordFromPoint(event.clientX, event.clientY);
		if (coord) state.updateDrag(coord);
		return;
	}

	if (!pendingCoord) return;

	const dx = event.clientX - startPoint.x;
	const dy = event.clientY - startPoint.y;

	// The vertical axis belongs to the scroller, and it wins outright: once the
	// finger has travelled this far down it is swiping, whatever else it does.
	if (Math.abs(dy) > TOUCH_SLOP_PX) {
		resetPointer();
		return;
	}

	// Sideways movement is ours, and it needs no waiting. `touch-action: pan-y`
	// on the cells means the browser can never claim this axis, so a sideways
	// drag can't turn into a scroll no matter how the container is sized.
	if (Math.abs(dx) > TOUCH_SLOP_PX) {
		startDrag(pendingCoord, true);
		const coord = getCellCoordFromPoint(event.clientX, event.clientY);
		if (coord) state.updateDrag(coord);
	}
}

function handlePointerUp(event: PointerEvent) {
	if (event.pointerId !== activePointerId) return;

	const pending = pendingCoord;
	resetPointer();

	if (state.isDragging) {
		state.endDrag();
		return;
	}

	// Nothing moved, so this was a tap: toggle the one cell under the finger.
	if (pending) state.toggleCell(pending);
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
 * A long-press on Android (and right-click on desktop) raises the browser's
 * context menu, which lands in the middle of a paint drag and cancels it. The
 * grid has nothing to offer in that menu, so it is suppressed for the whole
 * surface rather than only mid-gesture — a press can raise it before the
 * gesture has declared itself a drag, which is exactly when the timer is
 * still running.
 */
function handleContextMenu(event: MouseEvent) {
	event.preventDefault();
}

/**
 * Stops the scroller once a gesture is ours — after a long-press, or after a
 * sideways drag has committed to painting.
 *
 * Registered non-passively and up-front: a scroll can only be cancelled while
 * the browser is still undecided, which is why the gesture never starts with
 * movement it might lose. Touch events keep the target fixed at `touchstart`,
 * so every `touchmove` of the gesture still bubbles here even if the finger
 * leaves the grid.
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
			class="grid min-w-150 select-none [-webkit-touch-callout:none] [@media(pointer:coarse)]:min-w-0"
			role="grid"
			tabindex="0"
			style="grid-template-columns: 60px repeat({days.length}, 1fr); grid-auto-rows: 40px;"
			onpointerdown={handlePointerDown}
			oncontextmenu={handleContextMenu}
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
