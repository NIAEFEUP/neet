<script lang="ts">
import {
	computeDays,
	computeHours,
	formatDayRange,
	formatHour,
} from "./time-grid/date-utils";
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
 * Days shown at once. A week keeps a column wide enough to tap on a phone, and
 * it is the unit people think in when picking times.
 */
const DAYS_PER_PAGE = 7;

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

const gridState = new TimeGridState({
	getSelected: () => selected,
	setSelected: (next) => {
		selected = next;
		onchange?.(next);
	},
	getDays: () => days,
});

let days = $derived(computeDays(events));
let hours = $derived(computeHours(events));

// Paging. The page index is clamped on read rather than corrected in an effect,
// so a range that shrinks underneath the user can never leave the grid blank.
let page = $state(0);
let pageCount = $derived(Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE)));
let currentPage = $derived(Math.min(page, pageCount - 1));
let pageStart = $derived(currentPage * DAYS_PER_PAGE);
/** The columns on screen. Indices stay relative to the full range. */
let visibleDays = $derived(days.slice(pageStart, pageStart + DAYS_PER_PAGE));
let rangeLabel = $derived(formatDayRange(visibleDays));

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
/** True while a touch press is in flight — used to scope the context-menu guard. */
let touchGesture = false;

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
	touchGesture = false;
	pendingCoord = null;
	gridState.setPressing(null);
}

function startDrag(coord: CellCoord, haptics = false) {
	clearLongPress();
	ownsGesture = true;
	// Confirms the moment the gesture is committed, on the same frame as the
	// first painted cell. Android only; other platforms simply ignore it.
	if (haptics && typeof navigator.vibrate === "function") navigator.vibrate(10);
	gridState.beginDrag(coord);
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
	touchGesture = true;
	startPoint = { x: event.clientX, y: event.clientY };
	pendingCoord = coord;
	gridState.setPressing(coord);

	longPressTimer = setTimeout(() => {
		longPressTimer = null;
		if (pendingCoord) startDrag(pendingCoord, true);
	}, LONG_PRESS_MS);
}

function handlePointerMove(event: PointerEvent) {
	if (event.pointerId !== activePointerId) return;

	if (gridState.isDragging) {
		const coord = getCellCoordFromPoint(event.clientX, event.clientY);
		if (coord) gridState.updateDrag(coord);
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
		if (coord) gridState.updateDrag(coord);
	}
}

function handlePointerUp(event: PointerEvent) {
	if (event.pointerId !== activePointerId) return;

	const pending = pendingCoord;
	resetPointer();

	if (gridState.isDragging) {
		gridState.endDrag();
		return;
	}

	// Nothing moved, so this was a tap: toggle the one cell under the finger.
	if (pending) gridState.toggleCell(pending);
}

function handlePointerCancel(event: PointerEvent) {
	if (event.pointerId !== activePointerId) return;
	resetPointer();
	gridState.cancelDrag();
}

function handleKeyDown(event: KeyboardEvent) {
	if (event.key !== "Escape") return;
	resetPointer();
	gridState.cancelDrag();
}

function handleWindowBlur() {
	resetPointer();
	gridState.endDrag();
}

/**
 * A long-press on Android raises the browser's context menu in the middle of a
 * paint drag, which cancels it. Suppressed only while a touch press is actually
 * in flight: the menu from a long-press always arrives with the finger still
 * down, so this is reliable, and desktop right-click has nothing to do with us
 * and keeps working.
 */
function handleContextMenu(event: MouseEvent) {
	if (touchGesture) event.preventDefault();
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

<div class="w-fit max-w-full p-4">
	<TimeGridHeader
		{rangeLabel}
		showNavigation={pageCount > 1}
		canGoPrevious={currentPage > 0}
		canGoNext={currentPage < pageCount - 1}
		onPrevious={() => (page = currentPage - 1)}
		onNext={() => (page = currentPage + 1)}
		selectedCount={gridState.selectedCount}
		onClear={() => gridState.clearSelection()}
	/>

	<!-- No card, no canvas, no gutter: the grid sits on the page. What separated
	     tiles before was a 2px gap on every edge — 170-odd little voids. Now the
	     only structure is the hour rules, and the only colour is what you chose. -->
	<div class="max-h-[70dvh] overflow-auto overscroll-none">
		<!-- Nothing caps a `1fr` column, so on a wide screen a two-day range turned
		     each hour into a 7:1 plank. A capped column keeps every tile the same
		     shape no matter how many days are on screen. -->
		<div
			class="grid select-none"
			role="grid"
			tabindex="0"
			style="grid-template-columns: 44px repeat({visibleDays.length}, minmax(0, 120px)); grid-auto-rows: 36px;"
			onpointerdown={handlePointerDown}
			oncontextmenu={handleContextMenu}
			{@attach preventScrollWhilePainting}
		>
			<TimeGridDaysHeader days={visibleDays} />

			{#each hours as currentHour (currentHour)}
				<div
					class="sticky left-0 z-10 flex items-center justify-end bg-white pr-2 text-[11px] text-gray-400 tabular-nums"
					role="rowheader"
				>
					{formatHour(currentHour)}
				</div>

				{#each visibleDays as day, index (day.getTime())}
					{@const dayIndex = pageStart + index}
					<TimeGridCell
						{dayIndex}
						date={day}
						hour={currentHour}
						visualState={gridState.getCellVisualState(day, currentHour)}
					/>
				{/each}
			{/each}
		</div>
	</div>

	<!-- The empty state doubles as the help text: it answers "what do I do here"
	     exactly when that question exists, and gets out of the way afterwards. -->
	{#if gridState.selectedCount === 0}
		<p class="mt-3 text-center text-gray-400 text-xs">
			<span class="[@media(pointer:coarse)]:hidden">
				Drag across to mark when you're free
			</span>
			<span class="hidden [@media(pointer:coarse)]:inline">
				Tap to mark · drag sideways or hold to paint
			</span>
		</p>
	{/if}
</div>
