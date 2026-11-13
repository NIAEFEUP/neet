<script lang="ts">
import { Slider } from "$lib/components/ui/slider/index.js";
import { cn } from "$lib/utils.js";
import { formatHour } from "./time-grid/date-utils";

interface Props {
	/** `[start, end]` hour boundaries, 24h. The end hour is exclusive. */
	value?: number[];
	nameStart?: string;
	nameEnd?: string;
	class?: string;
}

let {
	value = $bindable([0, 24]),
	nameStart = "startTime",
	nameEnd = "endTime",
	class: className,
}: Props = $props();

const MAX_HOUR = 24;
const AXIS_LABELS = [0, 6, 12, 18, 24];

let start = $derived(value[0] ?? 0);
let end = $derived(value[1] ?? MAX_HOUR);
let isWholeDay = $derived(start <= 0 && end >= MAX_HOUR);

let sliderRoot = $state<HTMLElement | null>(null);

function clamp(hour: number, min: number, max: number) {
	return Math.min(max, Math.max(min, hour));
}

/**
 * The two thumbs can meet while one is dragged over the other. A window is
 * never shorter than an hour, so it grows to the right instead of collapsing.
 */
function handleValueChange(next: number[]) {
	const nextStart = clamp(Math.round(next[0] ?? 0), 0, MAX_HOUR - 1);
	const nextEnd = clamp(
		Math.round(next[1] ?? MAX_HOUR),
		nextStart + 1,
		MAX_HOUR,
	);

	if (nextStart !== value[0] || nextEnd !== value[1]) {
		value = [nextStart, nextEnd];
	}
}

// Dragging the filled band moves the whole window without resizing it.
type BandDrag = {
	pointerId: number;
	startX: number;
	startY: number;
	startHour: number;
	endHour: number;
	trackWidth: number;
	moved: boolean;
};

let bandDrag = $state<BandDrag | null>(null);

function beginBandDrag(event: PointerEvent) {
	if (event.pointerType === "mouse" && event.button !== 0) return;

	const root = sliderRoot;
	if (!root) return;

	const { width } = root.getBoundingClientRect();
	if (width === 0) return;

	bandDrag = {
		pointerId: event.pointerId,
		startX: event.clientX,
		startY: event.clientY,
		startHour: start,
		endHour: end,
		trackWidth: width,
		moved: false,
	};

	try {
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	} catch {
		// Capture can fail for a pointer that is already gone; the drag still
		// works while the pointer stays over the band.
	}
}

function moveBandDrag(event: PointerEvent) {
	const drag = bandDrag;
	if (!drag || drag.pointerId !== event.pointerId) return;

	const deltaX = event.clientX - drag.startX;
	const deltaY = event.clientY - drag.startY;

	if (!drag.moved) {
		if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return;

		// A mostly vertical gesture belongs to the page, not to the band.
		if (Math.abs(deltaY) > Math.abs(deltaX)) {
			finishBandDrag(event);
			return;
		}

		drag.moved = true;
	}

	const duration = drag.endHour - drag.startHour;
	const deltaHours = Math.round((deltaX / drag.trackWidth) * MAX_HOUR);
	const nextStart = clamp(drag.startHour + deltaHours, 0, MAX_HOUR - duration);

	value = [nextStart, nextStart + duration];
}

function finishBandDrag(event?: PointerEvent) {
	const drag = bandDrag;
	if (!drag) return;

	if (event) {
		const target = event.currentTarget as HTMLElement | null;
		if (target?.hasPointerCapture(drag.pointerId)) {
			target.releasePointerCapture(drag.pointerId);
		}
	}

	bandDrag = null;
}

function reset() {
	value = [0, MAX_HOUR];
}
</script>

<div class={cn("space-y-2.5", className)}>
	<div class="flex min-h-5 items-center justify-between gap-3">
		<p class="text-sm font-medium">Daily hours</p>
		<div class="flex items-center gap-2.5">
			<span
				class={cn(
					"tabular-nums transition-colors duration-150",
					isWholeDay
						? "text-sm text-muted-foreground"
						: "text-sm font-medium text-foreground",
				)}
			>
				{isWholeDay ? "Any time" : `${formatHour(start)} – ${formatHour(end)}`}
			</span>
			{#if !isWholeDay}
				<button
					type="button"
					onclick={reset}
					class="cursor-pointer rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-muted hover:text-foreground active:scale-95"
				>
					Reset
				</button>
			{/if}
		</div>
	</div>

	<div class="relative">
		<Slider
			bind:ref={sliderRoot}
			bind:value
			type="multiple"
			onValueChange={handleValueChange}
			min={0}
			max={MAX_HOUR}
			step={1}
			role="group"
			aria-label="Daily hours"
			class="py-3 [&_[data-slot=slider-thumb]]:z-10"
		/>

		{#if !isWholeDay}
			<!-- The band itself is a drag handle: it shifts the window without
			     resizing it. Handles stay above it, so trimming still works. -->
			<div
				class="absolute inset-y-0 z-0 cursor-grab touch-pan-y active:cursor-grabbing"
				style:left={`${(start / MAX_HOUR) * 100}%`}
				style:right={`${((MAX_HOUR - end) / MAX_HOUR) * 100}%`}
				onpointerdown={beginBandDrag}
				onpointermove={moveBandDrag}
				onpointerup={finishBandDrag}
				onpointercancel={finishBandDrag}
				aria-hidden="true"
			></div>
		{/if}
	</div>

	<div
		class="flex justify-between px-1 text-[10px] tabular-nums text-muted-foreground/70"
		aria-hidden="true"
	>
		{#each AXIS_LABELS as hour (hour)}
			<span>{hour.toString().padStart(2, "0")}</span>
		{/each}
	</div>

	<!-- A whole day is the same as no restriction at all. -->
	<input
		type="hidden"
		name={nameStart}
		value={isWholeDay ? "" : formatHour(start)}
	/>
	<input
		type="hidden"
		name={nameEnd}
		value={isWholeDay ? "" : formatHour(end)}
	/>
</div>
