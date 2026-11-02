<script lang="ts">
import { Temporal } from "temporal-polyfill";
import type { CellMode, SelectedCells } from "$lib";
// biome-ignore lint/correctness/noUnusedImports: used in markup
import { TimeGrid } from "$lib";

interface Scenario {
	label: string;
	days: number;
	startHour: number;
	endHour: number;
}

// biome-ignore lint/correctness/noUnusedVariables: used in markup
const modeLabel: Record<CellMode, string> = {
	yes: "Yes",
	maybe: "If need be",
};

/** Ranges that exercise paging, the hour bounds, and the scroll container. */
const scenarios: Record<string, Scenario> = {
	week: { label: "One week · 08–19", days: 7, startHour: 8, endHour: 19 },
	fortnight: {
		label: "Two weeks · 08–19",
		days: 14,
		startHour: 8,
		endHour: 19,
	},
	fullday: { label: "Two days · 24h", days: 2, startHour: 0, endHour: 24 },
};

let scenarioKey = $state("week");
// biome-ignore lint/correctness/noUnusedVariables: used in markup
let brush = $state<CellMode>("yes");
let selected = $state<SelectedCells>({});

const scenario = $derived(scenarios[scenarioKey] ?? scenarios.week);

/** Today onwards, as plain ISO dates. Computed on the client (no SSR here). */
// biome-ignore lint/correctness/noUnusedVariables: used in markup
const dates = $derived.by(() => {
	const today = Temporal.Now.plainDateISO();

	return Array.from({ length: scenario.days }, (_, offset) =>
		today.add({ days: offset }).toString(),
	);
});

// biome-ignore lint/correctness/noUnusedVariables: used in markup
const selectedEntries = $derived(
	Object.entries(selected).sort(([a], [b]) => a.localeCompare(b)),
);
</script>

<svelte:head>
	<title>Availability grid demo · neet</title>
	<meta
		name="description"
		content="Manual testing workspace for the neet availability grid, scenarios, and selection brushes."
	/>
</svelte:head>

<div class="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
	<header class="pb-6 border-b border-[#f0f0f0]">
		<h1 class="font-semibold text-[24px] leading-tight tracking-[-0.035em] text-[#0a0a0a] sm:text-[28px]">
			Availability grid
		</h1>
		<p class="mt-1.5 text-[13px] text-[#6b6b6b]">
			Manual-testing workspace for grid scenarios and selection brushes.
		</p>
	</header>

	<div class="mt-6 flex flex-col gap-4 border-b border-[#f0f0f0] pb-6 lg:flex-row lg:items-center lg:justify-between">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
			<span class="shrink-0 font-medium text-[13px] text-[#0a0a0a]" id="scenario-label">
				Scenario
			</span>
			<div
				class="flex flex-wrap items-center gap-x-4 gap-y-2"
				role="radiogroup"
				aria-labelledby="scenario-label"
			>
				{#each Object.entries(scenarios) as [key, value] (key)}
					<label class="flex cursor-pointer items-center gap-2 text-[13px] text-[#6b6b6b] hover:text-[#0a0a0a]">
						<input
							type="radio"
							bind:group={scenarioKey}
							value={key}
							class="h-3.5 w-3.5 border-[#e2e2e2] text-[#166534] focus:ring-[#166534]"
						/>
						{value.label}
					</label>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
			<span class="shrink-0 font-medium text-[13px] text-[#0a0a0a]" id="brush-label">
				Brush
			</span>
			<div
				class="inline-flex items-center rounded-md border border-[#e2e2e2] bg-[#f5f5f5] p-0.5"
				role="radiogroup"
				aria-labelledby="brush-label"
			>
				<button
					type="button"
					role="radio"
					aria-checked={brush === "yes"}
					onclick={() => (brush = "yes")}
					class={[
						"inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[5px] px-3 font-medium text-[12px] transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
						brush === "yes"
							? "bg-white text-[#0a0a0a] shadow-sm"
							: "text-[#6b6b6b] hover:text-[#0a0a0a]",
					]}
				>
					<span class="h-2 w-2 rounded-[2px] bg-[#166534]" aria-hidden="true"></span>
					Yes
				</button>
				<button
					type="button"
					role="radio"
					aria-checked={brush === "maybe"}
					onclick={() => (brush = "maybe")}
					class={[
						"inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[5px] px-3 font-medium text-[12px] transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
						brush === "maybe"
							? "bg-white text-[#0a0a0a] shadow-sm"
							: "text-[#6b6b6b] hover:text-[#0a0a0a]",
					]}
				>
					<span class="h-2 w-2 rounded-[2px] bg-amber-500" aria-hidden="true"></span>
					If need be
				</button>
			</div>
		</div>
	</div>

	<div class="flex justify-center py-8 sm:py-10">
		<TimeGrid
			{dates}
			startHour={scenario.startHour}
			endHour={scenario.endHour}
			mode={brush}
			bind:selected
			label="Availability demo"
		/>
	</div>

	<div class="border-t border-[#f0f0f0] pt-4">
		<p class="font-medium text-[13px] text-[#0a0a0a]">
			<code class="font-mono text-xs">bind:selected</code> currently holds
			{selectedEntries.length} cell{selectedEntries.length === 1 ? "" : "s"}
		</p>


		{#if selectedEntries.length === 0}
			<p class="mt-1 text-[13px] text-[#9b9b9b]">
				Drag across the grid to select cells and watch this readout update.
			</p>
		{:else}
			<ul class="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
				{#each selectedEntries as [key, mode] (key)}
					<li class="font-mono text-xs text-[#6b6b6b]">
						{key}
						<span class={mode === "yes" ? "text-[#166534]" : "text-amber-600"}>
							· {modeLabel[mode]}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
