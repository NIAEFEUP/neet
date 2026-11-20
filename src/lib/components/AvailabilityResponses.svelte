<script lang="ts">
import { Blobatar } from "@blobatar/svelte";
import "blobatar/motion.css";
import {
	formatDayCompact,
	formatDayLong,
	formatDayRange,
	formatHour,
	hoursBetween,
	normalizeDays,
} from "./time-grid/date-utils";
import { cellKey, rowId } from "./time-grid/grid-utils";
import { computeSlotBlocks, findSlotBlock } from "./time-grid/slot-blocks";
import TimeGridDaysHeader from "./time-grid/TimeGridDaysHeader.svelte";
import type {
	DayInput,
	HeatmapCounts,
	PublicResponse,
	SlotBlock,
} from "./time-grid/types";

const DAYS_PER_PAGE = 7;

interface Props {
	/** The same day columns the editable grid uses. */
	dates: DayInput[];
	startHour?: number;
	endHour?: number;
	/** Every public response for the event. */
	responses: PublicResponse[];
	/** Aggregated yes / if-need-be counts per cell. */
	counts: HeatmapCounts;
	/** Accessible name for the heatmap. */
	label?: string;
	/**
	 * When provided, the parent owns participant isolation (for example from a
	 * sidebar) and the built-in participant list is hidden.
	 */
	activeId?: string | null;
	/** When non-empty, aggregate the heatmap from only these responses. */
	selectedIds?: string[];
	/**
	 * When provided, the hour with this key is ringed as the hovered hour.
	 * Moving away from the grid clears it; it is not kept over the sidebar.
	 */
	hoveredBlockKey?: string | null;
	/**
	 * When provided, the hour with this key is pinned: a solid ring and a
	 * compact time pill. Hover previews are ignored while an hour is pinned.
	 */
	selectedBlockKey?: string | null;
	/** Called when the user hovers over an hour. */
	onBlockHover?: (block: SlotBlock | null) => void;
	/** Called when the user clicks an hour. */
	onBlockSelect?: (block: SlotBlock | null) => void;
}

let {
	dates,
	startHour = 0,
	endHour = 24,
	responses,
	counts,
	label = "Everyone's availability",
	activeId,
	selectedIds,
	hoveredBlockKey,
	selectedBlockKey,
	onBlockHover,
	onBlockSelect,
}: Props = $props();

const idPrefix = $props.id();

let days = $derived(normalizeDays(dates));
let hours = $derived(hoursBetween(startHour, endHour));

let slotBlocks = $derived(computeSlotBlocks(responses, days, hours));

let page = $state(0);
let pageCount = $derived(Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE)));
let currentPage = $derived(Math.min(page, pageCount - 1));
let pageStart = $derived(currentPage * DAYS_PER_PAGE);
let visibleDays = $derived(days.slice(pageStart, pageStart + DAYS_PER_PAGE));
let rangeLabel = $derived(formatDayRange(visibleDays));

function visibleBlock(key: string | null | undefined): SlotBlock | null {
	if (!key) return null;
	const block = slotBlocks.find((candidate) => candidate.key === key) ?? null;
	if (!block) return null;
	if (
		block.dayIndex < pageStart ||
		block.dayIndex >= pageStart + DAYS_PER_PAGE
	) {
		return null;
	}
	return block;
}

let hoveredBlock = $derived(visibleBlock(hoveredBlockKey));
let pinnedBlock = $derived(visibleBlock(selectedBlockKey));
let activeBlock = $derived(pinnedBlock ?? hoveredBlock);
let tooltipBlock = $derived(pinnedBlock ? null : hoveredBlock);

// The tooltip follows the mouse, so its position is tracked separately from
// the hovered block. It never enters the layout: it is fixed and translated.
let pointer = $state<{ x: number; y: number } | null>(null);
let tooltipWidth = $state(0);
let tooltipHeight = $state(0);
const TOOLTIP_OFFSET = 14;
const TOOLTIP_MARGIN = 12;

let tooltipPosition = $derived.by(() => {
	if (!pointer) return null;

	const width = tooltipWidth || 220;
	const height = tooltipHeight || 48;
	let x = pointer.x + TOOLTIP_OFFSET;
	let y = pointer.y + TOOLTIP_OFFSET;

	if (typeof window !== "undefined") {
		if (x + width > window.innerWidth - TOOLTIP_MARGIN) {
			x = pointer.x - width - TOOLTIP_OFFSET;
		}
		if (y + height > window.innerHeight - TOOLTIP_MARGIN) {
			y = pointer.y - height - TOOLTIP_OFFSET;
		}
	}

	return {
		x: Math.max(TOOLTIP_MARGIN, x),
		y: Math.max(TOOLTIP_MARGIN, y),
	};
});

// Hovering a name previews that person; clicking pins them so touch users can
// keep the filter without staying on the button.
let hoveredId = $state<string | null>(null);
let pinnedId = $state<string | null>(null);
let isolatedId = $derived(
	activeId !== undefined ? activeId : (hoveredId ?? pinnedId),
);
let isolated = $derived(
	isolatedId
		? (responses.find((response) => response.id === isolatedId) ?? null)
		: null,
);

let isControlled = $derived(
	activeId !== undefined || selectedIds !== undefined,
);

let visibleResponses = $derived(
	selectedIds && selectedIds.length > 0
		? (() => {
				const ids = new Set(selectedIds);
				return responses.filter((response) => ids.has(response.id));
			})()
		: responses,
);

/**
 * Filtered counts. When the sidebar has checked people, the heatmap should be
 * about those people only — not a dimmed version of everyone's numbers.
 */
let activeCounts = $derived.by(() => {
	if (!selectedIds || selectedIds.length === 0) return counts;

	const filtered: HeatmapCounts = {};
	for (const response of visibleResponses) {
		for (const [key, mode] of Object.entries(response.selected)) {
			const cell = filtered[key] ?? { yes: 0, maybe: 0 };
			cell[mode] += 1;
			filtered[key] = cell;
		}
	}
	return filtered;
});

const maxYes = $derived(
	Math.max(1, ...Object.values(activeCounts).map((cell) => cell.yes)),
);
const maxMaybe = $derived(
	Math.max(1, ...Object.values(activeCounts).map((cell) => cell.maybe)),
);

function intensity(count: number, max: number): number {
	if (count <= 0) return 0;
	return Math.min(0.92, 0.14 + 0.78 * (count / max));
}

function isFilled(day: Date, hour: number): boolean {
	const key = cellKey(day, hour);
	if (isolated) return !!isolated.selected[key];
	const cell = activeCounts[key];
	return !!cell && cell.yes + cell.maybe > 0;
}

/**
 * Rounding belongs to the run, not to the cell: a heat block fuses vertically
 * and only its top and bottom edges are rounded, exactly like a selection.
 */
function cellRadius(day: Date, hour: number): string | undefined {
	if (!isFilled(day, hour)) return undefined;

	const up = isFilled(day, hour - 1);
	const down = isFilled(day, hour + 1);
	const top = up ? 0 : 12;
	const bottom = down ? 0 : 12;
	return `${top}px ${top}px ${bottom}px ${bottom}px`;
}

function cellStyle(
	key: string,
	radius: string | undefined,
): string | undefined {
	const parts: string[] = [];
	if (radius) parts.push(`border-radius: ${radius};`);

	if (isolated) {
		const mode = isolated.selected[key];
		if (mode) {
			parts.push(
				mode === "yes"
					? "background-color: rgb(21, 128, 61);"
					: "background-color: rgb(217, 119, 6);",
			);
		}
		return parts.length > 0 ? parts.join(" ") : undefined;
	}

	const cell = activeCounts[key];
	if (!cell || cell.yes + cell.maybe === 0) {
		return parts.length > 0 ? parts.join(" ") : undefined;
	}

	const total = cell.yes + cell.maybe;
	const yesAlpha = intensity(cell.yes, maxYes);
	const maybeAlpha = intensity(cell.maybe, maxMaybe);
	const split = (cell.yes / total) * 100;

	if (cell.maybe === 0) {
		parts.push(`background-color: rgba(21, 128, 61, ${yesAlpha});`);
	} else if (cell.yes === 0) {
		parts.push(`background-color: rgba(217, 119, 6, ${maybeAlpha});`);
	} else {
		parts.push(
			`background: linear-gradient(90deg, rgba(21, 128, 61, ${yesAlpha}) 0%, rgba(21, 128, 61, ${yesAlpha}) ${split}%, rgba(217, 119, 6, ${maybeAlpha}) ${split}%, rgba(217, 119, 6, ${maybeAlpha}) 100%);`,
		);
	}

	return parts.join(" ");
}

function cellLabel(day: Date, hour: number, key: string): string {
	const when = `${formatDayLong(day)}, ${formatHour(hour)}`;

	if (isolated) {
		const mode = isolated.selected[key];
		const answer =
			mode === "yes" ? "Yes" : mode === "maybe" ? "If need be" : "Not marked";
		return `${when} — ${isolated.name}: ${answer}`;
	}

	const cell = activeCounts[key];
	if (!cell || cell.yes + cell.maybe === 0) return `${when} — no responses`;

	const parts: string[] = [];
	if (cell.yes > 0) parts.push(`${cell.yes} yes`);
	if (cell.maybe > 0) parts.push(`${cell.maybe} if need be`);
	return `${when} — ${parts.join(", ")}`;
}

function goToPage(next: number) {
	const target = Math.min(Math.max(next, 0), pageCount - 1);
	if (target === currentPage) return;

	page = target;
	pointer = null;
	onBlockHover?.(null);
	onBlockSelect?.(null);
}

function blockForCell(dayIndex: number, hour: number): SlotBlock | null {
	return findSlotBlock(slotBlocks, dayIndex, hour);
}

function isInActiveBlock(dayIndex: number, hour: number): boolean {
	return (
		!!activeBlock &&
		activeBlock.dayIndex === dayIndex &&
		activeBlock.startHour <= hour &&
		activeBlock.endHour > hour
	);
}

function handleCellEnter(event: PointerEvent, dayIndex: number, hour: number) {
	// Touch has no hover: a tap pins the slot instead, so nothing should dim
	// while a finger is only passing over the grid.
	if (event.pointerType !== "mouse") return;

	if (selectedBlockKey) {
		onBlockHover?.(null);
		return;
	}

	const block = blockForCell(dayIndex, hour);
	onBlockHover?.(block);

	if (block) {
		pointer = { x: event.clientX, y: event.clientY };
	}
}

function handleCellClick(dayIndex: number, hour: number) {
	pointer = null;
	onBlockSelect?.(blockForCell(dayIndex, hour));
}

function handleGridPointerMove(event: PointerEvent) {
	if (event.pointerType !== "mouse" || pinnedBlock || !hoveredBlock) {
		return;
	}

	pointer = { x: event.clientX, y: event.clientY };
}

function clearHover() {
	pointer = null;
	onBlockHover?.(null);
}

function handleGridLeave() {
	clearHover();
}

/**
 * Draws only the perimeter of the active block. Each edge is an inset shadow,
 * so the stroke lives inside the cell and can never change its size or the
 * grid's layout.
 */
function blockEdgeStyle(dayIndex: number, hour: number): string | undefined {
	const block = activeBlock;
	if (
		!block ||
		block.dayIndex !== dayIndex ||
		hour < block.startHour ||
		hour >= block.endHour
	) {
		return undefined;
	}

	const color = pinnedBlock ? "#0a0a0a" : "rgba(10, 10, 10, 0.6)";
	const width = "1.5px";
	const shadows = [
		`inset ${width} 0 0 0 ${color}`,
		`inset -${width} 0 0 0 ${color}`,
	];

	if (hour === block.startHour) {
		shadows.push(`inset 0 ${width} 0 0 ${color}`);
	}
	if (hour === block.endHour - 1) {
		shadows.push(`inset 0 -${width} 0 0 ${color}`);
	}

	return `box-shadow: ${shadows.join(", ")};`;
}

function participantClass(active: boolean): string {
	return [
		"w-full cursor-pointer rounded-md px-3 py-1.5 text-left font-medium text-[12px] transition-[background-color,color] duration-150 ease-[var(--ease-out)]",
		active
			? "bg-[#0a0a0a] text-white"
			: "bg-[#f5f5f5] text-[#6b6b6b] hover:bg-[#ebebeb] hover:text-[#0a0a0a]",
	].join(" ");
}
</script>

<div class="w-full">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-1">
			{#if pageCount > 1}
				<button
					type="button"
					aria-label="Previous days"
					disabled={currentPage === 0}
					onclick={() => goToPage(currentPage - 1)}
					class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#9b9b9b] text-lg leading-none transition-[background-color,color] duration-150 enabled:hover:bg-[#f5f5f5] enabled:hover:text-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-30"
				>
					‹
				</button>
			{/if}
			<span
				class={[
					"font-medium text-[#0a0a0a] text-[13px]",
					pageCount > 1 ? "min-w-28 text-center" : "",
				]}
			>
				{rangeLabel}
			</span>
			{#if pageCount > 1}
				<button
					type="button"
					aria-label="Next days"
					disabled={currentPage === pageCount - 1}
					onclick={() => goToPage(currentPage + 1)}
					class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#9b9b9b] text-lg leading-none transition-[background-color,color] duration-150 enabled:hover:bg-[#f5f5f5] enabled:hover:text-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-30"
				>
					›
				</button>
			{/if}
		</div>

		{#if responses.length > 0}
			<div class="flex items-center gap-3 text-[#9b9b9b] text-[11px]">
				<span class="flex items-center gap-1.5">
					<span class="h-2 w-2 rounded-[2px] bg-[#166534]" aria-hidden="true"></span>
					Yes
				</span>
				<span class="flex items-center gap-1.5">
					<span class="h-2 w-2 rounded-[2px] bg-amber-500" aria-hidden="true"></span>
					If need be
				</span>
				{#if !isolated}
					<span>Darker = more people</span>
				{/if}
			</div>
		{/if}
	</div>


	{#if visibleDays.length === 0 || hours.length === 0}
		<p
			class="rounded-xl border border-border border-dashed bg-muted/20 px-6 py-10 text-center text-muted-foreground text-sm"
		>
			There are no dates to show for this event.
		</p>
	{:else}
		<div class={["relative", responses.length === 0 && "min-h-[22rem]"]}>
			<div
				class={[
					"flex flex-col gap-4",
					isControlled
						? "items-start"
						: "items-center lg:flex-row lg:items-start lg:justify-center",
					responses.length === 0
						? "pointer-events-none select-none opacity-45"
						: "",
				]}
				inert={responses.length === 0}
			>
			<div class="w-full min-w-0 lg:w-fit">
				<div
					class="max-h-[70dvh] overflow-auto overscroll-none"
					onscroll={clearHover}
				>
			<div
				class="grid select-none"
				role="grid"
				tabindex="-1"
				aria-label={label}
				aria-rowcount={hours.length + 1}
				aria-colcount={visibleDays.length + 1}
				style="grid-template-columns: 44px repeat({visibleDays.length}, minmax(88px, 104px)); grid-auto-rows: 36px; column-gap: 2px;"
				onpointermove={handleGridPointerMove}
				onpointerleave={handleGridLeave}
			>
				<TimeGridDaysHeader
					days={visibleDays}
					startIndex={pageStart}
					{idPrefix}
				/>

				{#each hours as currentHour (currentHour)}
					<div role="row" class="contents">
						<div
							class="sticky left-0 z-10 flex items-center justify-end bg-white pr-2 text-[11px] text-[#b5b5b5] tabular-nums"
							role="rowheader"
							id={rowId(idPrefix, currentHour)}
						>
							{formatHour(currentHour)}
						</div>

						{#each visibleDays as day, index (day.getTime())}
							{@const dayIndex = pageStart + index}
							{@const key = cellKey(day, currentHour)}
							{@const filled = isFilled(day, currentHour)}
							{@const radius = cellRadius(day, currentHour)}
							{@const inActiveBlock = isInActiveBlock(dayIndex, currentHour)}
							<div
								role="gridcell"
								tabindex="-1"
								aria-label={cellLabel(day, currentHour, key)}
								class={[
									"touch-manipulation relative overflow-hidden [corner-shape:squircle] transition-opacity duration-150",
									filled ? "cursor-pointer" : "border-b border-black/[0.04]",
									activeBlock && !inActiveBlock && "opacity-35",
								]}
								style={[
									cellStyle(key, radius),
									blockEdgeStyle(dayIndex, currentHour),
								]
									.filter(Boolean)
									.join(" ")}
								onpointerenter={(event) =>
									handleCellEnter(event, dayIndex, currentHour)}
								onclick={() => handleCellClick(dayIndex, currentHour)}
								onkeydown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										handleCellClick(dayIndex, currentHour);
									}
								}}
							>
								{#if pinnedBlock && pinnedBlock.dayIndex === dayIndex && pinnedBlock.startHour === currentHour}
									<button
										type="button"
										class="absolute top-0 left-0 z-10 inline-flex cursor-pointer items-center gap-1 rounded-br-[5px] bg-[#0a0a0a] py-0.5 pr-1.5 pl-1.5 font-semibold text-[9px] text-white leading-none transition-[background-color] duration-150 hover:bg-[#2a2a2a] focus-visible:outline-2 -outline-offset-2 focus-visible:outline-white sm:pr-2 sm:pl-2 sm:text-[10px]"
										aria-label={`Clear selected time, ${formatDayLong(pinnedBlock.day)} from ${formatHour(pinnedBlock.startHour)} to ${formatHour(pinnedBlock.endHour)}`}
										onclick={(event) => {
											event.stopPropagation();
											pointer = null;
											onBlockSelect?.(null);
											onBlockHover?.(null);
										}}
									>
										{formatHour(pinnedBlock.startHour)}
										<span
											class="ml-0.5 hidden text-white/50 sm:inline"
											aria-hidden="true">×</span
										>
									</button>
								{/if}
							</div>
						{/each}
					</div>
				{/each}

				</div>
			</div>
		</div>

		{#if !isControlled}
			<aside class="w-full shrink-0 lg:w-36">
				<p class="mb-2 text-[12px] font-medium text-[#6b6b6b]">
					Participants
					<span class="font-normal text-[#b5b5b5]">
						({responses.length})
					</span>
				</p>
				<div class="flex flex-col gap-1 lg:max-h-[70dvh] lg:overflow-auto">
					<button
						type="button"
						aria-pressed={isolatedId === null}
						onclick={() => {
							pinnedId = null;
							hoveredId = null;
						}}
						class={participantClass(isolatedId === null)}
					>
						Everyone
					</button>

					{#each responses as response (response.id)}
						<button
							type="button"
							aria-pressed={isolatedId === response.id}
							onmouseenter={() => (hoveredId = response.id)}
							onmouseleave={() => (hoveredId = null)}
							onfocus={() => (hoveredId = response.id)}
							onblur={() => (hoveredId = null)}
							onclick={() =>
								(pinnedId = pinnedId === response.id ? null : response.id)}
							class={participantClass(isolatedId === response.id)}
						>
							{response.name}
						</button>
					{/each}
				</div>
			</aside>
		{/if}
			</div>

			{#if responses.length === 0}
				<div
					class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4"
				>
					<div class="flex max-w-xs flex-col items-center text-center">
						<div class="flex items-end justify-center -space-x-5">
							<Blobatar
								name="availability"
								size={56}
								animate="always"
								class="size-14 -rotate-6"
							/>
							<Blobatar
								name="you"
								size={80}
								animate="always"
								class="size-20 translate-y-1"
							/>
							<Blobatar
								name="team"
								size={56}
								animate="always"
								class="size-14 rotate-6"
							/>
						</div>

						<h3 class="mt-6 font-semibold text-lg tracking-tight">
							No responses yet
						</h3>
						<p class="mt-2 text-balance text-muted-foreground text-sm leading-5">
							Be the first to share your availability. Answers show up here
							for everyone with the link.
						</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	{#if tooltipBlock && pointer && tooltipPosition}
		<div
			bind:clientWidth={tooltipWidth}
			bind:clientHeight={tooltipHeight}
			class="pointer-events-none fixed top-0 left-0 z-50 flex flex-col gap-0.5 rounded-lg bg-[#0a0a0a] px-2.5 py-1.5 text-white shadow-lg"
			style:transform={`translate3d(${tooltipPosition.x}px, ${tooltipPosition.y}px, 0)`}
			aria-hidden="true"
		>
			<span
				class="whitespace-nowrap font-medium text-[11px] leading-4 tabular-nums"
			>
				{formatDayCompact(tooltipBlock.day)} · {formatHour(
					tooltipBlock.startHour,
				)} – {formatHour(tooltipBlock.endHour)}
			</span>
			<span class="flex items-center gap-2.5 text-[10px] leading-3 text-white/70">
				{#if tooltipBlock.yesIds.length > 0}
					<span class="inline-flex items-center gap-1">
						<span
							class="size-1.5 rounded-full bg-emerald-400"
							aria-hidden="true"></span>
						{tooltipBlock.yesIds.length} yes
					</span>
				{/if}
				{#if tooltipBlock.maybeIds.length > 0}
					<span class="inline-flex items-center gap-1">
						<span
							class="size-1.5 rounded-full bg-amber-400"
							aria-hidden="true"></span>
						{tooltipBlock.maybeIds.length} if need be
					</span>
				{/if}
			</span>
		</div>
	{/if}
</div>

