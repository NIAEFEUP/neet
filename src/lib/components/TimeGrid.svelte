<script lang="ts">
import { tick } from "svelte";
import {
	formatDayRange,
	formatHour,
	hoursBetween,
	normalizeDays,
} from "./time-grid/date-utils";
import {
	columnId,
	getCellCoordFromPoint,
	gridCellId,
	rowId,
} from "./time-grid/grid-utils";
import TimeGridCell from "./time-grid/TimeGridCell.svelte";
import TimeGridDaysHeader from "./time-grid/TimeGridDaysHeader.svelte";
import TimeGridHeader from "./time-grid/TimeGridHeader.svelte";
import { TimeGridState } from "./time-grid/time-grid-state.svelte";
import type {
	CellCoord,
	CellMode,
	DayInput,
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
	/** The day columns to render. ISO dates ('YYYY-MM-DD') or local `Date`s. */
	dates: DayInput[];
	/** First hour row, inclusive. Defaults to midnight. */
	startHour?: number;
	/** Last hour boundary, exclusive. Defaults to the end of the day. */
	endHour?: number;
	/** The brush new drags apply. */
	mode?: CellMode;
	selected?: SelectedCells;
	onchange?: (selected: SelectedCells) => void;
	/** Accessible name for the grid. */
	label?: string;
}

let {
	dates,
	startHour = 0,
	endHour = 24,
	mode = "yes",
	selected = $bindable({}),
	onchange,
	label = "Availability",
}: Props = $props();

/** Hydration-safe per-instance prefix for the ids the ARIA grid needs. */
const idPrefix = $props.id();

let days = $derived(normalizeDays(dates));
let hours = $derived(hoursBetween(startHour, endHour));

const gridState = new TimeGridState({
	getSelected: () => selected,
	setSelected: (next) => {
		selected = next;
		onchange?.(next);
	},
	getDays: () => days,
	getMode: () => mode,
});

// Paging. The page index is clamped on read rather than corrected in an effect,
// so a range that shrinks underneath the user can never leave the grid blank.
let page = $state(0);
let pageCount = $derived(Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE)));
let currentPage = $derived(Math.min(page, pageCount - 1));
let pageStart = $derived(currentPage * DAYS_PER_PAGE);
/** The columns on screen. Indices stay relative to the full range. */
let visibleDays = $derived(days.slice(pageStart, pageStart + DAYS_PER_PAGE));
let rangeLabel = $derived(formatDayRange(visibleDays));

// Keyboard cursor. The grid itself is the single tab stop; arrows move this
// cursor and `aria-activedescendant` tells assistive technology which cell it is
// on, so a screen reader is not forced through every hour of every day.
let focusedCell = $state<CellCoord | null>(null);
let gridFocused = $state(false);
let hintId = $derived(`${idPrefix}-hint`);

// Clamped on read, so a range that shrinks under the cursor can never leave the
// active cell pointing outside the grid. Nothing has to correct the stored
// coordinate in an effect.
let activeCell = $derived.by<CellCoord | null>(() => {
	if (!focusedCell || !days.length || !hours.length) return null;

	return {
		dayIndex: Math.min(focusedCell.dayIndex, days.length - 1),
		hour: hours.includes(focusedCell.hour) ? focusedCell.hour : hours[0],
	};
});

let activeDescendant = $derived(
	activeCell
		? gridCellId(idPrefix, activeCell.dayIndex, activeCell.hour)
		: undefined,
);

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

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

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

function cellAt(x: number, y: number): CellCoord | null {
	return getCellCoordFromPoint(x, y);
}

function handlePointerDown(event: PointerEvent) {
	// One gesture at a time — a second finger must not yank an in-flight drag.
	if (!event.isPrimary || activePointerId !== null) return;

	// Cells are resolved from the point rather than from the event target, so a
	// single handler on the grid covers every cell and ignores the headers.
	const coord = cellAt(event.clientX, event.clientY);
	if (!coord) return;

	// Pointer input is not keyboard input: the next Tab puts the cursor back.
	gridFocused = false;

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
		const coord = cellAt(event.clientX, event.clientY);
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
		const coord = cellAt(event.clientX, event.clientY);
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
	gridState.cancelDrag();
}

function handleGridFocus() {
	gridFocused = true;

	if (!visibleDays.length || !hours.length) return;

	const lastVisibleDay = pageStart + visibleDays.length - 1;
	if (
		!activeCell ||
		activeCell.dayIndex < pageStart ||
		activeCell.dayIndex > lastVisibleDay
	) {
		focusedCell = { dayIndex: pageStart, hour: hours[0] };
		scrollCellIntoView(focusedCell);
	}
}

function handleGridBlur() {
	gridFocused = false;
	resetPointer();
	gridState.cancelDrag();
}

function scrollCellIntoView(coord: CellCoord) {
	document
		.getElementById(gridCellId(idPrefix, coord.dayIndex, coord.hour))
		?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function setFocus(coord: CellCoord) {
	focusedCell = coord;
	gridFocused = true;
	scrollCellIntoView(coord);
}

function moveFocus(base: CellCoord, dayDelta: number, hourDelta: number) {
	const lastVisibleDay = pageStart + visibleDays.length - 1;
	const dayIndex = clamp(base.dayIndex + dayDelta, pageStart, lastVisibleDay);
	const hourIndex = clamp(
		hours.indexOf(base.hour) + hourDelta,
		0,
		hours.length - 1,
	);

	setFocus({ dayIndex, hour: hours[hourIndex] });
}

function handleGridKeyDown(event: KeyboardEvent) {
	if (event.altKey || event.ctrlKey || event.metaKey) return;
	if (!visibleDays.length || !hours.length) return;

	const base = activeCell ?? { dayIndex: pageStart, hour: hours[0] };

	switch (event.key) {
		case "ArrowLeft":
			event.preventDefault();
			moveFocus(base, -1, 0);
			return;
		case "ArrowRight":
			event.preventDefault();
			moveFocus(base, 1, 0);
			return;
		case "ArrowUp":
			event.preventDefault();
			moveFocus(base, 0, -1);
			return;
		case "ArrowDown":
			event.preventDefault();
			moveFocus(base, 0, 1);
			return;
		case "Home":
			event.preventDefault();
			setFocus({ dayIndex: base.dayIndex, hour: hours[0] });
			return;
		case "End":
			event.preventDefault();
			setFocus({
				dayIndex: base.dayIndex,
				hour: hours[hours.length - 1],
			});
			return;
		case "PageUp":
			event.preventDefault();
			void changePage(-1);
			return;
		case "PageDown":
			event.preventDefault();
			void changePage(1);
			return;
		case "Enter":
		case " ":
			event.preventDefault();
			focusedCell = base;
			gridFocused = true;
			gridState.toggleCell(base);
			return;
		default:
			return;
	}
}

async function changePage(delta: number) {
	const target = clamp(currentPage + delta, 0, pageCount - 1);
	if (target === currentPage) return;

	page = target;

	const current = activeCell;
	if (current) {
		const lastPageDay = Math.min(
			days.length - 1,
			target * DAYS_PER_PAGE + DAYS_PER_PAGE - 1,
		);
		focusedCell = {
			dayIndex: clamp(current.dayIndex, target * DAYS_PER_PAGE, lastPageDay),
			hour: current.hour,
		};

		// The new page's cells do not exist until the update flushes.
		await tick();
		scrollCellIntoView(focusedCell);
	}
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
		onPrevious={() => void changePage(-1)}
		onNext={() => void changePage(1)}
		selectedCount={gridState.selectedCount}
		onClear={() => gridState.clearSelection()}
	/>

	{#if visibleDays.length === 0 || hours.length === 0}
		<p class="px-2 py-6 text-center text-gray-400 text-sm">
			There are no dates to show for this event.
		</p>
	{:else}
		<!-- No card, no canvas, no gutter: the grid sits on the page. What separated
		     tiles before was a 2px gap on every edge — 170-odd little voids. Now the
		     only structure is the hour rules, and the only colour is what you chose. -->
		<div class="max-h-[70dvh] overflow-auto overscroll-none">
			<!-- Nothing caps a `1fr` column, so on a wide screen a two-day range turned
			     each hour into a 7:1 plank. A capped column keeps every tile the same
			     shape no matter how many days are on screen. -->
			<div
				class="grid select-none outline-none"
				role="grid"
				tabindex="0"
				aria-label={label}
				aria-describedby={hintId}
				aria-rowcount={hours.length + 1}
				aria-colcount={visibleDays.length + 1}
				aria-activedescendant={activeDescendant}
				style="grid-template-columns: 44px repeat({visibleDays.length}, minmax(0, 120px)); grid-auto-rows: 36px; column-gap: 2px;"
				onpointerdown={handlePointerDown}
				oncontextmenu={handleContextMenu}
				onfocus={handleGridFocus}
				onblur={handleGridBlur}
				onkeydown={handleGridKeyDown}
				{@attach preventScrollWhilePainting}
			>
				<TimeGridDaysHeader
					days={visibleDays}
					startIndex={pageStart}
					{idPrefix}
				/>

				{#each hours as currentHour (currentHour)}
					<div role="row" class="contents">
						<div
							class="sticky left-0 z-10 flex items-center justify-end bg-white pr-2 text-[11px] text-gray-400 tabular-nums"
							role="rowheader"
							id={rowId(idPrefix, currentHour)}
						>
							{formatHour(currentHour)}
						</div>

						{#each visibleDays as day, index (day.getTime())}
							{@const dayIndex = pageStart + index}
							<TimeGridCell
								id={gridCellId(idPrefix, dayIndex, currentHour)}
								labelledBy={`${columnId(idPrefix, dayIndex)} ${rowId(idPrefix, currentHour)}`}
								{dayIndex}
								hour={currentHour}
								date={day}
								visualState={gridState.getCellVisualState(dayIndex, currentHour)}
								radius={gridState.getCellRadius(dayIndex, currentHour)}
								selected={gridState.isSelected(dayIndex, currentHour)}
								focused={gridFocused &&
									activeCell?.dayIndex === dayIndex &&
									activeCell?.hour === currentHour}
							/>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<p id={hintId} class="sr-only">
		Use the arrow keys to move between hours, and Enter or Space to mark or
		clear one.
	</p>

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
