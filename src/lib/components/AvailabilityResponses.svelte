<script lang="ts">
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
}

let {
	dates,
	startHour = 0,
	endHour = 24,
	responses,
	counts,
	label = "Everyone's availability",
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
let isolatedId = $derived(hoveredId ?? pinnedId);
let isolated = $derived(
	isolatedId
		? (responses.find((response) => response.id === isolatedId) ?? null)
		: null,
);

const maxYes = $derived(
	Math.max(1, ...Object.values(counts).map((cell) => cell.yes)),
);
const maxMaybe = $derived(
	Math.max(1, ...Object.values(counts).map((cell) => cell.maybe)),
);

function intensity(count: number, max: number): number {
	if (count <= 0) return 0;
	return Math.min(0.92, 0.14 + 0.78 * (count / max));
}

function cellStyle(key: string): string | undefined {
	if (isolated) {
		const mode = isolated.selected[key];
		if (!mode) return undefined;
		return mode === "yes"
			? "background-color: rgb(21, 128, 61);"
			: "background-color: rgb(217, 119, 6);";
	}

	const cell = counts[key];
	if (!cell || cell.yes + cell.maybe === 0) return undefined;

	const total = cell.yes + cell.maybe;
	const yesAlpha = intensity(cell.yes, maxYes);
	const maybeAlpha = intensity(cell.maybe, maxMaybe);
	const split = (cell.yes / total) * 100;

	if (cell.maybe === 0) {
		return `background-color: rgba(21, 128, 61, ${yesAlpha});`;
	}
	if (cell.yes === 0) {
		return `background-color: rgba(217, 119, 6, ${maybeAlpha});`;
	}

	return `background: linear-gradient(90deg, rgba(21, 128, 61, ${yesAlpha}) 0%, rgba(21, 128, 61, ${yesAlpha}) ${split}%, rgba(217, 119, 6, ${maybeAlpha}) ${split}%, rgba(217, 119, 6, ${maybeAlpha}) 100%);`;
}

function cellLabel(day: Date, hour: number, key: string): string {
	const when = `${formatDayLong(day)}, ${formatHour(hour)}`;

	if (isolated) {
		const mode = isolated.selected[key];
		const answer =
			mode === "yes" ? "Yes" : mode === "maybe" ? "If need be" : "Not marked";
		return `${when} — ${isolated.name}: ${answer}`;
	}

	const cell = counts[key];
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
		"cursor-pointer rounded-full px-3 py-1 font-medium text-xs transition-colors duration-150",
		active
			? "bg-gray-900 text-white"
			: "bg-gray-100 text-gray-600 hover:bg-gray-200",
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
					class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-gray-400 text-lg leading-none transition-colors enabled:hover:bg-gray-100 enabled:hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
				>
					‹
				</button>
			{/if}
			<span
				class={[
					"font-medium text-gray-900 text-sm",
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
					class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-gray-400 text-lg leading-none transition-colors enabled:hover:bg-gray-100 enabled:hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
				>
					›
				</button>
			{/if}
		</div>

		<div class="flex flex-wrap items-center gap-3 text-gray-400 text-xs">
			<span class="flex items-center gap-1">
				<span class="h-2.5 w-2.5 rounded-sm bg-green-700" aria-hidden="true"
				></span>
				Yes
			</span>
			<span class="flex items-center gap-1">
				<span class="h-2.5 w-2.5 rounded-sm bg-yellow-600" aria-hidden="true"
				></span>
				If need be
			</span>
			<span>Darker = more people</span>
		</div>
	</div>

	{#if responses.length === 0}
		<p
			class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-gray-500 text-sm"
		>
			No responses yet. Saved answers appear here for everyone with the link.
		</p>
	{:else if visibleDays.length === 0 || hours.length === 0}
		<p class="px-2 py-6 text-center text-gray-400 text-sm">
			There are no dates to show for this event.
		</p>
	{:else}
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<span class="text-sm font-medium text-gray-700">
				Participants
				<span class="font-normal text-gray-400">
					({responses.length})
				</span>
			</span>

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

		<div class="max-h-[70dvh] overflow-auto overscroll-none">
			<div
				class="grid select-none"
				role="grid"
				aria-label={label}
				aria-rowcount={hours.length + 1}
				aria-colcount={visibleDays.length + 1}
				style="grid-template-columns: 44px repeat({visibleDays.length}, minmax(0, 120px)); grid-auto-rows: 36px; column-gap: 2px;"
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
							{@const key = cellKey(day, currentHour)}
							<div
								role="gridcell"
								aria-label={cellLabel(day, currentHour, key)}
								title={cellLabel(day, currentHour, key)}
								class="border-b border-black/5"
								style={cellStyle(key)}
							></div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
