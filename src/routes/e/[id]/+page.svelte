<script lang="ts">
import { page } from "$app/state";
import type { SelectedCells } from "$lib";
// biome-ignore lint/correctness/noUnusedImports: used in markup
import { normalizeDays, parseHour, TimeGrid } from "$lib";
import type { PageData } from "./$types";

let { data } = $props<{ data: PageData }>();

let selected = $state<SelectedCells>({});

const dates = $derived(data.event.proposedDates);
const startHour = $derived(parseHour(data.event.startTime) ?? 0);
const endHour = $derived(parseHour(data.event.endTime) ?? 24);
const selectedCount = $derived(Object.values(selected).filter(Boolean).length);
const timeLabel = $derived(
	data.event.startTime && data.event.endTime
		? `${data.event.startTime} – ${data.event.endTime} (${data.event.timezone})`
		: `All day (${data.event.timezone})`,
);

const dateLabel = $derived.by(() => {
	const days = normalizeDays(dates);
	if (days.length === 0) return "";

	const format = (date: Date) =>
		date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});

	const first = format(days[0]);
	const last = format(days[days.length - 1]);
	return first === last ? first : `${first} – ${last}`;
});
</script>

<div class="mx-auto mt-10 max-w-5xl px-4 pb-16">
	<div class="rounded-xl bg-white p-6 shadow">
		<h1 class="mb-2 text-3xl font-bold text-green-700">{data.event.title}</h1>
		{#if data.event.description}
			<p class="mb-6 text-gray-600">{data.event.description}</p>
		{/if}

		<div
			class="mb-6 inline-flex flex-col items-start space-y-1 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-500"
		>
			<div class="flex items-center space-x-2">
				<span aria-hidden="true">📅</span>
				<span>{dateLabel}</span>
			</div>
			<div class="flex items-center space-x-2 text-xs">
				<span aria-hidden="true">⏰</span>
				<span>{timeLabel}</span>
			</div>
		</div>

		<p class="mb-2 text-sm text-gray-600">
			Share this URL with your guests to invite them.
		</p>
		<div class="rounded-md bg-gray-100 p-4 font-mono text-sm break-all">
			{page.url.href}
		</div>
	</div>

	<div class="mt-6 rounded-xl bg-white p-6 shadow">
		<h2 class="text-lg font-semibold text-gray-900">When are you free?</h2>
		<p class="mt-1 mb-4 text-sm text-gray-500">
			Drag across the grid to mark the hours you're available. On a phone, tap
			to mark an hour, or hold and drag to paint a block.
		</p>

		{#if dates.length > 0}
			<div class="flex justify-center">
				<TimeGrid
					{dates}
					{startHour}
					{endHour}
					bind:selected
					label="Your availability for {data.event.title}"
				/>
			</div>

			<p class="mt-2 text-xs text-gray-400">
				Times are shown in {data.event.timezone}. Your picks stay on this page
				for now — saving your response comes next.
			</p>

			<p class="mt-1 text-xs text-gray-400" aria-live="polite">
				{#if selectedCount > 0}
					{selectedCount} hour{selectedCount === 1 ? "" : "s"} marked.
				{:else}
					Nothing marked yet.
				{/if}
			</p>
		{:else}
			<p class="text-sm text-gray-500">
				This event has no proposed dates yet.
			</p>
		{/if}
	</div>
</div>
