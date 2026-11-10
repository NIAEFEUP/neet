<script lang="ts">
import { Blobatar } from "@blobatar/svelte";
import "blobatar/motion.css";
import {
	formatDayLong,
	formatDayRange,
	formatHour,
	hoursBetween,
	normalizeDays,
} from "./time-grid/date-utils";
import { cellKey, rowId } from "./time-grid/grid-utils";
import TimeGridDaysHeader from "./time-grid/TimeGridDaysHeader.svelte";
import type {
	DayInput,
	HeatmapCounts,
	PublicResponse,
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
}: Props = $props();

const idPrefix = $props.id();

let days = $derived(normalizeDays(dates));
let hours = $derived(hoursBetween(startHour, endHour));

let page = $state(0);
let pageCount = $derived(Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE)));
let currentPage = $derived(Math.min(page, pageCount - 1));
let pageStart = $derived(currentPage * DAYS_PER_PAGE);
let visibleDays = $derived(days.slice(pageStart, pageStart + DAYS_PER_PAGE));
let rangeLabel = $derived(formatDayRange(visibleDays));

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
	page = Math.min(Math.max(next, 0), pageCount - 1);
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
				<div class="max-h-[70dvh] overflow-auto overscroll-none">
			<div
				class="grid select-none"
				role="grid"
				aria-label={label}
				aria-rowcount={hours.length + 1}
				aria-colcount={visibleDays.length + 1}
				style="grid-template-columns: 44px repeat({visibleDays.length}, minmax(0, 104px)); grid-auto-rows: 36px; column-gap: 2px;"
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
							{@const key = cellKey(day, currentHour)}
							{@const filled = isFilled(day, currentHour)}
							{@const radius = cellRadius(day, currentHour)}
							<div
								role="gridcell"
								aria-label={cellLabel(day, currentHour, key)}
								title={cellLabel(day, currentHour, key)}
								class={[
									"[corner-shape:squircle]",
									filled ? "" : "border-b border-black/[0.04]",
								]}
								style={cellStyle(key, radius)}
							></div>
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
</div>

