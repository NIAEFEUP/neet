<script lang="ts">
import type { CalendarEvent, SelectedCells } from "$lib";
// biome-ignore lint/correctness/noUnusedImports: used in markup
import { TimeGrid } from "$lib";

/**
 * Builds a local-time Date `dayOffset` days from today at the given time.
 */
function at(dayOffset: number, hour: number, minute = 0): Date {
	const today = new Date();
	return new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate() + dayOffset,
		hour,
		minute,
	);
}

const sampleEvents: CalendarEvent[] = [
	{
		id: "team-standup",
		title: "Team Standup",
		start: at(0, 9, 0),
		end: at(0, 9, 30),
	},
	{
		id: "design-review",
		title: "Design Review",
		start: at(1, 14, 0),
		end: at(1, 15, 30),
	},
	{
		id: "sprint-planning",
		title: "Sprint Planning",
		start: at(2, 10, 0),
		end: at(2, 12, 0),
	},
];

/** Two events a fortnight apart, so the day range spans two pages. */
const longEvents: CalendarEvent[] = [
	{
		id: "kickoff",
		title: "Kickoff",
		start: at(0, 9, 0),
		end: at(0, 10, 0),
	},
	{
		id: "retro",
		title: "Retro",
		start: at(13, 15, 0),
		end: at(13, 16, 0),
	},
];

const eventSources: Record<string, CalendarEvent[]> = {
	sample: sampleEvents,
	long: longEvents,
	empty: [],
};

let eventSource = $state("sample");
let selected = $state<SelectedCells>({});

// biome-ignore lint/correctness/noUnusedVariables: used in markup
const events: CalendarEvent[] = $derived(eventSources[eventSource] ?? []);
// biome-ignore lint/correctness/noUnusedVariables: used in markup
const selectedKeys: string[] = $derived(Object.keys(selected).sort());
</script>

<div class="mx-auto mt-10 max-w-xl rounded-xl bg-white p-6 shadow">
	<h1 class="text-3xl font-bold text-green-700">Time Grid</h1>
	<p class="mt-1 mb-6 text-sm text-gray-500">
		Manual-testing demo route for the availability grid — nothing links here,
		open <code class="font-mono text-gray-700">/demo/availability</code> directly.
	</p>

	<div class="mb-4 flex items-center gap-3">
		<span class="text-sm font-medium text-gray-700" id="event-source-label">
			Events
		</span>
		<div
			class="inline-flex items-center gap-4 rounded-md border border-gray-300 px-3 py-2"
			role="radiogroup"
			aria-labelledby="event-source-label"
		>
			<label class="flex items-center gap-2 text-sm text-gray-700">
				<input type="radio" bind:group={eventSource} value="sample" />
				Sample events
			</label>
			<label class="flex items-center gap-2 text-sm text-gray-700">
				<input type="radio" bind:group={eventSource} value="long" />
				14 days
			</label>
			<label class="flex items-center gap-2 text-sm text-gray-700">
				<input type="radio" bind:group={eventSource} value="empty" />
				No events
			</label>
		</div>
	</div>

	<TimeGrid {events} bind:selected />

	<div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
		<p class="text-sm font-medium text-gray-700">
			<code class="font-mono">bind:selected</code> currently holds
			{selectedKeys.length} cell{selectedKeys.length === 1 ? "" : "s"}
		</p>

		{#if selectedKeys.length === 0}
			<p class="mt-1 text-sm text-gray-500">
				Drag across the grid to select cells and watch this readout update.
			</p>
		{:else}
			<ul class="mt-2 flex flex-wrap gap-2">
				{#each selectedKeys as key (key)}
					<li
						class="rounded border border-gray-200 bg-white px-2 py-0.5 font-mono text-xs text-gray-700"
					>
						{key}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
