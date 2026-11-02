<script lang="ts">
import type { SubmitFunction } from "@sveltejs/kit";
import { untrack } from "svelte";
import { enhance } from "$app/forms";
import { page } from "$app/state";
import type { CellMode, SelectedCells } from "$lib";
import {
	AvailabilityResponses,
	normalizeDays,
	parseHour,
	TimeGrid,
} from "$lib";
import type { ActionData, PageData } from "./$types";

let { data, form } = $props<{ data: PageData; form: ActionData }>();

// The server response seeds the editor once. After that the guest owns these
// values, so a background refresh must not overwrite what they are dragging.
let selected = $state<SelectedCells>(
	untrack(() => data.participant?.selected ?? {}),
);
let name = $state(untrack(() => data.participant?.name ?? ""));
let brush = $state<CellMode>("yes");
let isSubmitting = $state(false);
let saved = $state(false);
let view = $state<"responses" | "answer">("responses");

const dates = $derived(data.event.proposedDates);
const startHour = $derived(parseHour(data.event.startTime) ?? 0);
const endHour = $derived(parseHour(data.event.endTime) ?? 24);
const selectedCount = $derived(Object.keys(selected).length);
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

function markDirty() {
	saved = false;
}

function openAnswer() {
	saved = false;
	view = "answer";
}

function closeAnswer() {
	view = "responses";
}

const handleEnhance: SubmitFunction = () => {
	isSubmitting = true;
	saved = false;

	return async ({ result, update }) => {
		// Keep the fields and the grid as they are: a failed save should not make
		// the guest mark their hours again.
		await update({ reset: false });
		isSubmitting = false;
		if (result.type === "success") {
			saved = true;
			view = "responses";
		}
	};
};
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


	{#if view === "responses"}
		<div class="mt-6 rounded-xl bg-white p-6 shadow">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h2 class="text-lg font-semibold text-gray-900">
						Everyone's availability
					</h2>
					<p class="mt-1 text-sm text-gray-500">
						Every saved answer is public. Hover a name to isolate that person's
						hours; on a phone, tap the name.
					</p>
				</div>
				<button
					type="button"
					onclick={openAnswer}
					class="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg bg-green-700 px-5 py-2 font-medium text-sm text-white transition-[background-color,scale,opacity] duration-150 ease-out [corner-shape:squircle] hover:bg-green-800 active:scale-[0.98]"
				>
					{data.participant ? "Update my availability" : "Add my availability"}
				</button>
			</div>

			{#if saved}
				<p class="mt-3 text-sm text-green-700" aria-live="polite">
					Saved. You can update your answer any time.
				</p>
			{/if}

			<div class="mt-4">
				<AvailabilityResponses
					{dates}
					{startHour}
					{endHour}
					responses={data.responses}
					counts={data.heat}
				/>
			</div>
		</div>
	{:else}
		<div class="mt-6 rounded-xl bg-white p-6 shadow">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div class="max-w-2xl">
					<h2 class="text-lg font-semibold text-gray-900">
						{data.participant ? "Update your availability" : "Add your availability"}
					</h2>
					<p class="mt-1 text-sm text-gray-500">
						Drag across the clean grid to mark when you can make it.
						<strong>Yes</strong> is a firm yes; <strong>If need be</strong> means
						you can make it if it comes to that. On a phone, tap to mark an hour,
						or hold and drag to paint a block.
					</p>
				</div>
				<button
					type="button"
					onclick={closeAnswer}
					class="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg px-4 py-2 font-medium text-gray-600 text-sm transition-colors duration-150 ease-out hover:bg-gray-100 hover:text-gray-900"
				>
					Back to responses
				</button>
			</div>

			{#if dates.length > 0}
				<form method="POST" use:enhance={handleEnhance}>
				<input
					type="hidden"
					name="selected"
					value={JSON.stringify(selected)}
				/>

				<div class="mb-4 flex flex-wrap items-end gap-x-6 gap-y-4">
					<div>
						<label
							for="guest-name"
							class="block text-sm font-medium text-gray-700">Your name</label
						>
						<input
							id="guest-name"
							name="name"
							type="text"
							required
							maxlength="80"
							autocomplete="name"
							placeholder="e.g. Alice Silva"
							bind:value={name}
							oninput={markDirty}
							class="mt-1 block w-64 rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600"
						/>
					</div>
				</div>

				<div class="mb-3 flex flex-wrap items-center gap-2">
					<span class="text-sm font-medium text-gray-700">Marking as</span>
					<div
						class="inline-flex rounded-lg bg-gray-100 p-1"
						role="group"
						aria-label="Availability brush"
					>
						<button
							type="button"
							aria-pressed={brush === "yes"}
							onclick={() => (brush = "yes")}
							class={[
								"inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 font-medium text-sm transition-[background-color,color,box-shadow] duration-150 ease-out [corner-shape:squircle]",
								brush === "yes"
									? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
									: "text-gray-500 hover:text-gray-700",
							]}
						>
							<span
								class="h-2.5 w-2.5 rounded-full bg-green-700"
								aria-hidden="true"
							></span>
							Yes
						</button>
						<button
							type="button"
							aria-pressed={brush === "maybe"}
							onclick={() => (brush = "maybe")}
							class={[
								"inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 font-medium text-sm transition-[background-color,color,box-shadow] duration-150 ease-out [corner-shape:squircle]",
								brush === "maybe"
									? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
									: "text-gray-500 hover:text-gray-700",
							]}
						>
							<span
								class="h-2.5 w-2.5 rounded-full bg-yellow-600"
								aria-hidden="true"
							></span>
							If need be
						</button>
					</div>
				</div>

				<div class="flex justify-center">
					<TimeGrid
						{dates}
						{startHour}
						{endHour}
						mode={brush}
						bind:selected
						onchange={markDirty}
						label="Your availability for {data.event.title}"
					/>
				</div>

				<div
					class="mt-3 flex flex-wrap items-center justify-between gap-3 border-gray-100 border-t pt-4"
				>
					<p class="text-xs text-gray-400">
						Times are shown in {data.event.timezone}.
						{#if selectedCount > 0}
							{selectedCount} hour{selectedCount === 1 ? "" : "s"} marked.
						{:else}
							Nothing marked yet.
						{/if}
					</p>

					<button
						type="submit"
						disabled={isSubmitting}
						class="inline-flex cursor-pointer items-center justify-center rounded-lg bg-green-700 px-5 py-2 font-medium text-sm text-white transition-[background-color,scale,opacity] duration-150 ease-out [corner-shape:squircle] hover:bg-green-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSubmitting
							? "Saving..."
							: data.participant
								? "Update availability"
								: "Save availability"}
					</button>
				</div>

				{#if saved}
					<p class="mt-3 text-right text-sm text-green-700" aria-live="polite">
						Saved. You can change your answers and update them any time.
					</p>
				{:else if form?.message}
					<p class="mt-3 text-right text-sm text-red-700" aria-live="polite">
						{form.message}
					</p>
				{/if}
			</form>
			{:else}
				<p class="mt-4 text-sm text-gray-500">
					This event has no proposed dates yet.
				</p>
			{/if}
		</div>
	{/if}
</div>
