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
let brush = $state<CellMode>("yes");
let selected = $state<SelectedCells>({});

const scenario = $derived(scenarios[scenarioKey] ?? scenarios.week);

/** Today onwards, as plain ISO dates. Computed on the client (no SSR here). */
const dates = $derived.by(() => {
	const today = Temporal.Now.plainDateISO();

	return Array.from({ length: scenario.days }, (_, offset) =>
		today.add({ days: offset }).toString(),
	);
});

const selectedEntries = $derived(
	Object.entries(selected).sort(([a], [b]) => a.localeCompare(b)),
);
</script>

<div class="mx-auto mt-10 max-w-5xl rounded-xl bg-white p-6 shadow">
	<h1 class="text-3xl font-bold text-green-700">Time Grid</h1>
	<p class="mt-1 mb-6 text-sm text-gray-500">
		Manual-testing demo route for the availability grid — nothing links here,
		open <code class="font-mono text-gray-700">/demo/availability</code> directly.
	</p>

	<div class="mb-4 flex flex-wrap items-center gap-4">
		<div class="flex items-center gap-3">
			<span class="text-sm font-medium text-gray-700" id="scenario-label">
				Scenario
			</span>
			<div
				class="inline-flex flex-wrap items-center gap-4 rounded-md border border-gray-300 px-3 py-2"
				role="radiogroup"
				aria-labelledby="scenario-label"
			>
				{#each Object.entries(scenarios) as [key, value] (key)}
					<label class="flex items-center gap-2 text-sm text-gray-700">
						<input type="radio" bind:group={scenarioKey} value={key} />
						{value.label}
					</label>
				{/each}
			</div>
		</div>

		<div class="flex items-center gap-3">
			<span class="text-sm font-medium text-gray-700" id="brush-label">
				Brush
			</span>
			<div
				class="inline-flex items-center gap-4 rounded-md border border-gray-300 px-3 py-2"
				role="radiogroup"
				aria-labelledby="brush-label"
			>
				<label class="flex items-center gap-2 text-sm text-gray-700">
					<input type="radio" bind:group={brush} value="yes" />
					<span class="h-3 w-3 rounded-sm bg-green-700" aria-hidden="true"></span>
					Yes
				</label>
				<label class="flex items-center gap-2 text-sm text-gray-700">
					<input type="radio" bind:group={brush} value="maybe" />
					<span class="h-3 w-3 rounded-sm bg-yellow-600" aria-hidden="true"></span>
					If need be
				</label>
			</div>
		</div>
	</div>

	<div class="flex justify-center">
		<TimeGrid
			{dates}
			startHour={scenario.startHour}
			endHour={scenario.endHour}
			mode={brush}
			bind:selected
			label="Availability demo"
		/>
	</div>

	<div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
		<p class="text-sm font-medium text-gray-700">
			<code class="font-mono">bind:selected</code> currently holds
			{selectedEntries.length} cell{selectedEntries.length === 1 ? "" : "s"}
		</p>

		{#if selectedEntries.length === 0}
			<p class="mt-1 text-sm text-gray-500">
				Drag across the grid to select cells and watch this readout update.
			</p>
		{:else}
			<ul class="mt-2 flex flex-wrap gap-2">
				{#each selectedEntries as [key, mode] (key)}
					<li
						class="rounded border border-gray-200 bg-white px-2 py-0.5 font-mono text-xs text-gray-700"
					>
						{key}
						<span class={mode === "yes" ? "text-green-700" : "text-yellow-700"}>
							· {modeLabel[mode]}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
