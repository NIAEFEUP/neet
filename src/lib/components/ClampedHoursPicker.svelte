<script lang="ts">
import { Button } from "$lib/components/ui/button";
import { hapticTap, hapticTick } from "$lib/haptics";
import { cn } from "$lib/utils.js";
import { formatHour } from "./time-grid/date-utils";

interface Props {
	/** `[start, end]` hour boundaries, 24h. The end hour is exclusive. */
	value?: number[];
	showHeader?: boolean;
	/** Set false for a comparison copy that should not submit its own fields. */
	submit?: boolean;
	class?: string;
}

let {
	value = $bindable([0, 24]),
	showHeader = true,
	submit = true,
	class: className,
}: Props = $props();

const MAX_HOUR = 24;
const TRACK_INSET = 6;
const EDGE_PX = 30;
/** Below this width the block splits into two halves: resize start / resize end. */
const SMALL_BLOCK_PX = 24;
const AXIS_LABELS = [0, 6, 12, 18, 24];

const MOVE_PINCH_WIDTH = 64;
const MOVE_PINCH_DEPTH = 2;

/** How far a drag may stretch past a bound, in hours, before it stops. */
const MOVE_OVERSHOOT = 0.4;
const RESIZE_OVERSHOOT = 0.8;
const EDGE_RESISTANCE = 0.25;
/** Keep a resized edge from collapsing into the other one while it stretches. */
const MIN_PREVIEW_DURATION = 0.2;

let start = $derived(value[0] ?? 0);
let end = $derived(value[1] ?? MAX_HOUR);
let isWholeDay = $derived(start <= 0 && end >= MAX_HOUR);

/**
 * The block follows the pointer at a fractional hour while a drag is in
 * flight, then settles onto the nearest whole hour on release. The committed
 * value stays on whole hours, so the labels and the form never show a time the
 * event model cannot represent.
 */
type Preview = { start: number; end: number };
let preview = $state<Preview | null>(null);

let shownStart = $derived(preview?.start ?? start);
let shownEnd = $derived(preview?.end ?? end);
let shownDuration = $derived(shownEnd - shownStart);
let shownIsWholeDay = $derived(
	shownStart <= 0.001 && shownEnd >= MAX_HOUR - 0.001,
);

let trackEl = $state<HTMLElement | null>(null);
let blockEl = $state<HTMLElement | null>(null);

function trackAttachment(node: HTMLElement) {
	trackEl = node;
	return () => {
		trackEl = null;
	};
}

function blockAttachment(node: HTMLElement) {
	blockEl = node;
	return () => {
		blockEl = null;
	};
}

function clamp(hour: number, min: number, max: number) {
	return Math.min(max, Math.max(min, hour));
}

/**
 * A drag past a bound keeps moving, but increasingly slowly. Released, it
 * springs back to the bound.
 */
function resist(hour: number, min: number, max: number, overshoot: number) {
	if (hour < min) {
		return min - Math.min((min - hour) * EDGE_RESISTANCE, overshoot);
	}

	if (hour > max) {
		return max + Math.min((hour - max) * EDGE_RESISTANCE, overshoot);
	}

	return hour;
}

function setWindow(nextStart: number, nextEnd: number, withHaptic = false) {
	const safeStart = clamp(Math.round(nextStart), 0, MAX_HOUR - 1);
	const safeEnd = clamp(Math.round(nextEnd), safeStart + 1, MAX_HOUR);

	if (safeStart !== start || safeEnd !== end) {
		value = [safeStart, safeEnd];
		if (withHaptic) hapticTick();
	}
}

let blockLeft = $derived(
	`calc(${TRACK_INSET}px + (100% - ${TRACK_INSET * 2}px) * ${shownStart / MAX_HOUR})`,
);
let blockWidth = $derived(
	`calc((100% - ${TRACK_INSET * 2}px) * ${shownDuration / MAX_HOUR})`,
);

type Mode = "move" | "start" | "end";

type Drag = {
	pointerId: number;
	mode: Mode;
	startX: number;
	startY: number;
	startHour: number;
	endHour: number;
	usableWidth: number;
	moved: boolean;
};

let drag = $state<Drag | null>(null);
/** The point the block pinches toward while pressed. */
let squeezeOrigin = $state("50% 50%");
/** The whole-window pinch follows the point where the block was picked up. */
let pinchLeft = $state("50%");
let pinchWidth = $state(MOVE_PINCH_WIDTH);
let pinchDepth = $state(MOVE_PINCH_DEPTH);

function usableWidth() {
	const track = trackEl;
	if (!track) return 0;
	return Math.max(0, track.getBoundingClientRect().width - TRACK_INSET * 2);
}

function hourAt(clientX: number) {
	const track = trackEl;
	if (!track) return start;

	const rect = track.getBoundingClientRect();
	const usable = rect.width - TRACK_INSET * 2;
	if (usable <= 0) return start;

	const x = clientX - rect.left - TRACK_INSET;
	return clamp(Math.round((x / usable) * MAX_HOUR), 0, MAX_HOUR);
}

function beginBlockDrag(event: PointerEvent) {
	if (event.pointerType === "mouse" && event.button !== 0) return;

	const block = blockEl;
	const width = usableWidth();
	if (!block || width === 0) return;

	// The block sits on top of the track: its gesture must not also count as
	// a track click.
	event.stopPropagation();
	hapticTap();

	const rect = block.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const edge =
		rect.width < SMALL_BLOCK_PX
			? rect.width / 2
			: Math.min(EDGE_PX, rect.width / 3);
	const mode: Mode =
		x <= edge ? "start" : x >= rect.width - edge ? "end" : "move";
	const grabPercent = clamp((x / rect.width) * 100, 0, 100);

	if (mode === "move") {
		pinchLeft = `${grabPercent}%`;
		pinchWidth = Math.min(MOVE_PINCH_WIDTH, 2 * Math.min(x, rect.width - x));
		pinchDepth = MOVE_PINCH_DEPTH;
	}

	squeezeOrigin =
		mode === "start"
			? "0% 50%"
			: mode === "end"
				? "100% 50%"
				: `${grabPercent}% 50%`;

	preview = { start, end };
	drag = {
		pointerId: event.pointerId,
		mode,
		startX: event.clientX,
		startY: event.clientY,
		startHour: start,
		endHour: end,
		usableWidth: width,
		moved: false,
	};

	if (mode !== "move") {
		const grip = block.querySelector<HTMLElement>(
			mode === "start" ? ".grip-bar-start" : ".grip-bar-end",
		);
		grip?.focus({ preventScroll: true });
	}

	try {
		block.setPointerCapture(event.pointerId);
	} catch {
		// Capture can fail for a pointer that is already gone; the drag still
		// works while the pointer stays over the block.
	}
}

function moveBlockDrag(event: PointerEvent) {
	const current = drag;
	if (!current || current.pointerId !== event.pointerId) return;

	const deltaX = event.clientX - current.startX;
	const deltaY = event.clientY - current.startY;

	if (!current.moved) {
		if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return;

		// A mostly vertical gesture belongs to the page, not the block.
		if (Math.abs(deltaY) > Math.abs(deltaX)) {
			finishBlockDrag(event);
			return;
		}

		current.moved = true;
	}

	const deltaHours = (deltaX / current.usableWidth) * MAX_HOUR;

	if (current.mode === "move") {
		const width = current.endHour - current.startHour;
		if (width >= MAX_HOUR) return;

		const rawStart = current.startHour + deltaHours;
		const overshoot = Math.min(MOVE_OVERSHOOT, width * 0.35);
		const shown = resist(rawStart, 0, MAX_HOUR - width, overshoot);

		preview = { start: shown, end: shown + width };

		// Keep the window's length while it is clamped: clamping the rounded
		// start and adding the original width avoids shrinking it against an edge.
		const nextStart = clamp(Math.round(rawStart), 0, MAX_HOUR - width);
		setWindow(nextStart, nextStart + width, true);
	} else if (current.mode === "start") {
		const rawStart = current.startHour + deltaHours;
		const maxStart = current.endHour - 1;
		const shown = clamp(
			resist(rawStart, 0, maxStart, RESIZE_OVERSHOOT),
			-RESIZE_OVERSHOOT,
			current.endHour - MIN_PREVIEW_DURATION,
		);

		preview = { start: shown, end: current.endHour };
		setWindow(rawStart, current.endHour, true);
	} else {
		const rawEnd = current.endHour + deltaHours;
		const minEnd = current.startHour + 1;
		const shown = clamp(
			resist(rawEnd, minEnd, MAX_HOUR, RESIZE_OVERSHOOT),
			current.startHour + MIN_PREVIEW_DURATION,
			MAX_HOUR + RESIZE_OVERSHOOT,
		);

		preview = { start: current.startHour, end: shown };
		setWindow(current.startHour, rawEnd, true);
	}
}

function finishBlockDrag(event?: PointerEvent) {
	const current = drag;
	if (!current) return;

	if (event) {
		// A fast release can arrive without a final pointermove. Fold that last
		// position in before switching back to the snapped window.
		if (current.moved && event.type === "pointerup") {
			moveBlockDrag(event);
		}

		const block = event.currentTarget as HTMLElement | null;
		if (block?.hasPointerCapture(current.pointerId)) {
			block.releasePointerCapture(current.pointerId);
		}
	}

	drag = null;
	preview = null;
}

function handleTrackPointerDown(event: PointerEvent) {
	if (event.pointerType === "mouse" && event.button !== 0) return;

	const hour = hourAt(event.clientX);
	const midpoint = (start + end) / 2;

	if (hour < midpoint) {
		setWindow(Math.min(hour, end - 1), end, true);
	} else {
		setWindow(start, Math.max(hour, start + 1), true);
	}
}

function moveStart(to: number) {
	setWindow(clamp(to, 0, end - 1), end);
}

function moveEnd(to: number) {
	setWindow(start, clamp(to, start + 1, MAX_HOUR));
}

function handleGripKeyDown(event: KeyboardEvent, edge: "start" | "end") {
	const keys = [
		"ArrowLeft",
		"ArrowRight",
		"ArrowUp",
		"ArrowDown",
		"Home",
		"End",
	];
	if (!keys.includes(event.key)) return;

	event.preventDefault();

	const step = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : -1;

	if (edge === "start") {
		if (event.key === "Home") moveStart(0);
		else if (event.key === "End") moveStart(end - 1);
		else moveStart(start + step);
	} else {
		if (event.key === "Home") moveEnd(start + 1);
		else if (event.key === "End") moveEnd(MAX_HOUR);
		else moveEnd(end + step);
	}
}

function reset() {
	hapticTap();
	preview = null;
	value = [0, MAX_HOUR];
}
</script>

<div class={cn("space-y-2.5", className)}>
	{#if showHeader}
		<div class="flex min-h-6 items-center justify-between gap-3">
			<p class="text-sm font-medium">Daily hours</p>
			{#if !isWholeDay}
				<div class="flex items-center gap-2.5">
					<span class="tabular-nums text-sm font-medium text-foreground">
						{formatHour(start)} – {formatHour(end)}
					</span>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						onclick={reset}
						class="text-muted-foreground"
					>
						Reset
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	<div
		{@attach trackAttachment}
		class="relative h-12 w-full cursor-pointer select-none overflow-hidden rounded-[21px] bg-muted ring-1 ring-foreground/5 [corner-shape:squircle]"
		role="group"
		aria-label="Daily hours"
		onpointerdown={handleTrackPointerDown}
	>
		<div
			{@attach blockAttachment}
			class={[
				"clamped-block absolute top-[5px] bottom-[5px] flex items-center rounded-[16px] bg-foreground text-background shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] [corner-shape:squircle]",
				{ "is-dragging": drag !== null },
			]}
			style:left={blockLeft}
			style:width={blockWidth}
			style:transform-origin={squeezeOrigin}
			data-mode={drag?.mode}
			role="presentation"
			onpointerdown={beginBlockDrag}
			onpointermove={moveBlockDrag}
			onpointerup={finishBlockDrag}
			onpointercancel={finishBlockDrag}
		>
			<!-- Cursor feedback for the resize zones. The actual gesture is one
			     pointer handler on the block, driven by where the press landed. -->
			<span
				class="absolute inset-y-0 left-0 z-0 w-[min(30px,33%)] cursor-ew-resize touch-pan-y"
				aria-hidden="true"
			></span>
			<span
				class="absolute inset-y-0 right-0 z-0 w-[min(30px,33%)] cursor-ew-resize touch-pan-y"
				aria-hidden="true"
			></span>

			<!-- Two rounded indents for a whole-window drag, painted in the
			     track colour. They follow the point where the block was picked up. -->
			<span
				class={["pinch pinch-top", { "is-active": drag?.mode === "move" }]}
				style:left={pinchLeft}
				style:top={`${-pinchDepth}px`}
				style:width={`${pinchWidth}px`}
				style:height={`${pinchDepth * 2}px`}
				aria-hidden="true"
			>
				<svg
					viewBox="0 0 100 10"
					preserveAspectRatio="none"
					class="size-full"
					aria-hidden="true"
				>
					<path d="M0 0H100V5C83 5 67 10 50 10C33 10 17 5 0 5Z" fill="currentColor" />
				</svg>
			</span>
			<span
				class={["pinch pinch-bottom", { "is-active": drag?.mode === "move" }]}
				style:left={pinchLeft}
				style:bottom={`${-pinchDepth}px`}
				style:width={`${pinchWidth}px`}
				style:height={`${pinchDepth * 2}px`}
				aria-hidden="true"
			>
				<svg
					viewBox="0 0 100 10"
					preserveAspectRatio="none"
					class="size-full rotate-180"
					aria-hidden="true"
				>
					<path d="M0 0H100V5C83 5 67 10 50 10C33 10 17 5 0 5Z" fill="currentColor" />
				</svg>
			</span>

			{#if shownIsWholeDay}
				<span
					class="pointer-events-none absolute inset-0 grid place-items-center text-xs font-medium"
				>
					Any time
				</span>
			{:else}
				<span
					class="pointer-events-none block-label absolute inset-y-0 left-4 flex items-center text-[11px] font-medium tabular-nums transition-opacity duration-150"
					aria-hidden="true"
				>
					{formatHour(start)}
				</span>
				<span
					class="pointer-events-none block-label absolute inset-y-0 right-4 flex items-center text-[11px] font-medium tabular-nums transition-opacity duration-150"
					aria-hidden="true"
				>
					{formatHour(end)}
				</span>
			{/if}

			<!-- The grips are the keyboard surface for the two ends. They sit inside
			     the block so the visible handle and the accessible handle are one. -->
			<span
				class="grip-bar-start absolute top-1/2 left-[min(3px,20%)] z-10 h-4 w-[3px] -translate-y-1/2 cursor-ew-resize touch-pan-y rounded-full bg-background/35 transition-[width,height,background-color,box-shadow] duration-150 hover:w-[4px] hover:bg-background/60 focus-visible:w-[4px] focus-visible:bg-background/80 focus-visible:ring-2 focus-visible:ring-background/40 focus-visible:outline-none"
				role="slider"
				tabindex="0"
				aria-label="Daily start time"
				aria-orientation="horizontal"
				aria-valuemin={0}
				aria-valuemax={end - 1}
				aria-valuenow={start}
				aria-valuetext={formatHour(start)}
				onkeydown={(event) => handleGripKeyDown(event, "start")}
			></span>
			<span
				class="grip-bar-end absolute top-1/2 right-[min(3px,20%)] z-10 h-4 w-[3px] -translate-y-1/2 cursor-ew-resize touch-pan-y rounded-full bg-background/35 transition-[width,height,background-color,box-shadow] duration-150 hover:w-[4px] hover:bg-background/60 focus-visible:w-[4px] focus-visible:bg-background/80 focus-visible:ring-2 focus-visible:ring-background/40 focus-visible:outline-none"
				role="slider"
				tabindex="0"
				aria-label="Daily end time"
				aria-orientation="horizontal"
				aria-valuemin={start + 1}
				aria-valuemax={MAX_HOUR}
				aria-valuenow={end}
				aria-valuetext={formatHour(end)}
				onkeydown={(event) => handleGripKeyDown(event, "end")}
			></span>
		</div>
	</div>

	<div
		class="flex justify-between px-1 text-[10px] tabular-nums text-muted-foreground/70"
		aria-hidden="true"
	>
		{#each AXIS_LABELS as hour (hour)}
			<span>{hour.toString().padStart(2, "0")}</span>
		{/each}
	</div>

	{#if submit}
		<input
			type="hidden"
			name="startTime"
			value={isWholeDay ? "" : formatHour(start)}
		/>
		<input
			type="hidden"
			name="endTime"
			value={isWholeDay ? "" : formatHour(end)}
		/>
	{/if}
</div>

<style>
	.clamped-block {
		container-type: inline-size;
		touch-action: pan-y;
		cursor: grab;
		transition:
			left 200ms var(--ease-out),
			width 200ms var(--ease-out),
			scale 150ms var(--ease-out);
	}

	/* A small window still needs a comfortable grab area. The visual block
	   stays true to the time scale; this only enlarges the hit surface. */
	.clamped-block::before {
		position: absolute;
		content: "";
		inset: -4px -12px;
		touch-action: pan-y;
	}

	.grip-bar-start::before,
	.grip-bar-end::before {
		position: absolute;
		content: "";
		inset: -6px -10px;
		touch-action: pan-y;
	}

	.clamped-block[data-mode="start"],
	.clamped-block[data-mode="end"] {
		cursor: ew-resize;
	}

	.clamped-block[data-mode="move"] {
		cursor: grabbing;
	}

	.clamped-block.is-dragging {
		scale: 0.985 0.92;
		will-change: left, width, scale;
		transition: scale 150ms var(--ease-out);
	}

	.clamped-block[data-mode="start"] .grip-bar-start,
	.clamped-block[data-mode="end"] .grip-bar-end {
		width: 4px;
		height: 11px;
		background-color: color-mix(in oklab, var(--background) 80%, transparent);
	}

	.pinch {
		position: absolute;
		z-index: 0;
		translate: -50% 0;
		color: var(--muted);
		pointer-events: none;
		opacity: 0;
		scale: 0.55 0.4;
		transition:
			opacity 150ms var(--ease-out),
			scale 150ms var(--ease-out);
	}

	.pinch.is-active {
		opacity: 1;
		scale: 1 1;
	}

	/* Hide the edge labels as soon as the window is too narrow for them,
	   regardless of device width. This is a width query, not a duration guess. */
	@container (max-width: 104px) {
		.block-label {
			opacity: 0;
			transition: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.clamped-block,
		.clamped-block.is-dragging,
		.pinch {
			transition: none;
		}
	}
</style>
