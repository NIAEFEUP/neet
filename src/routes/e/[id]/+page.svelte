<script lang="ts">
import type { SubmitFunction } from "@sveltejs/kit";
import { onDestroy, untrack } from "svelte";
import { fade, fly } from "svelte/transition";
// biome-ignore lint/correctness/noUnusedImports: used in markup
import { enhance } from "$app/forms";
import { page } from "$app/state";
import type { CellMode, SelectedCells } from "$lib";
import {
	// biome-ignore lint/correctness/noUnusedImports: used in markup
	AvailabilityResponses,
	normalizeDays,
	parseHour,
	TimeGrid,
} from "$lib";
import type { ActionData, PageData } from "./$types";

// biome-ignore lint/correctness/noUnusedVariables: form is used in markup
let { data, form } = $props<{ data: PageData; form: ActionData }>();

let selected = $state<SelectedCells>(
	untrack(() => data.participant?.selected ?? {}),
);
// biome-ignore lint/correctness/noUnusedVariables: used in markup
let name = $state(untrack(() => data.participant?.name ?? ""));
// biome-ignore lint/correctness/noUnusedVariables: used in markup
let brush = $state<CellMode>("yes");
// biome-ignore lint/correctness/noUnusedVariables: used in markup
let isSubmitting = $state(false);
// biome-ignore lint/correctness/noUnusedVariables: used in markup
let saved = $state(false);
// biome-ignore lint/correctness/noUnusedVariables: used in markup
let view = $state<"responses" | "answer">("responses");
// biome-ignore lint/correctness/noUnusedVariables: used in markup
let copyStatus = $state<"idle" | "copied" | "error">("idle");
let copyStatusResetTimer: ReturnType<typeof setTimeout> | undefined;

const dates = $derived(data.event.proposedDates);
// biome-ignore lint/correctness/noUnusedVariables: used in markup
const startHour = $derived(parseHour(data.event.startTime) ?? 0);
// biome-ignore lint/correctness/noUnusedVariables: used in markup
const endHour = $derived(parseHour(data.event.endTime) ?? 24);
// biome-ignore lint/correctness/noUnusedVariables: used in markup
const selectedCount = $derived(Object.keys(selected).length);
// biome-ignore lint/correctness/noUnusedVariables: used in markup
const timeLabel = $derived(
	data.event.startTime && data.event.endTime
		? `${data.event.startTime} – ${data.event.endTime} (${data.event.timezone})`
		: `All day (${data.event.timezone})`,
);

// biome-ignore lint/correctness/noUnusedVariables: used in markup
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

onDestroy(() => {
	clearTimeout(copyStatusResetTimer);
});

// biome-ignore lint/correctness/noUnusedVariables: used in markup
function markDirty() {
	saved = false;
}

// biome-ignore lint/correctness/noUnusedVariables: used in markup
function openAnswer() {
	saved = false;
	view = "answer";
}

// biome-ignore lint/correctness/noUnusedVariables: used in markup
function closeAnswer() {
	view = "responses";
}

// biome-ignore lint/correctness/noUnusedVariables: used in markup
async function copyLink() {
	try {
		await navigator.clipboard.writeText(page.url.href);
		copyStatus = "copied";
	} catch {
		copyStatus = "error";
	}

	clearTimeout(copyStatusResetTimer);
	copyStatusResetTimer = setTimeout(() => {
		copyStatus = "idle";
	}, 2400);
}

// biome-ignore lint/correctness/noUnusedVariables: used in markup
const handleEnhance: SubmitFunction = () => {
	isSubmitting = true;
	saved = false;

	return async ({ result, update }) => {
		await update({ reset: false });
		isSubmitting = false;
		if (result.type === "success") {
			saved = true;
			view = "responses";
		}
	};
};
</script>

<svelte:head>
	<title>{data.event.title} · neet</title>
	<meta
		name="description"
		content={data.event.description ||
			`Share your availability for ${data.event.title} and find a time that works for everyone.`}
	/>
</svelte:head>

<div class="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
	<!-- Event header -->
	<header class="pb-6 border-b border-[#f0f0f0]">
		<div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0">
				<h1 class="break-words font-semibold text-[24px] leading-tight tracking-[-0.035em] text-[#0a0a0a] sm:text-[28px]">
					{data.event.title}
				</h1>
				{#if data.event.description}
					<p class="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-[#6b6b6b]">
						{data.event.description}
					</p>
				{/if}

				<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
					<span class="inline-flex items-center gap-1.5 text-[12px] text-[#6b6b6b]">
						<svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5 text-[#9b9b9b]" aria-hidden="true">
							<rect x="2.25" y="3.25" width="11.5" height="10.5" rx="2" stroke="currentColor" stroke-width="1.25" />
							<path d="M5 1.75v3M11 1.75v3M2.5 6.5h11" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
						</svg>
						{dateLabel}
					</span>
					<span class="inline-flex items-center gap-1.5 text-[12px] text-[#6b6b6b]">
						<svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5 text-[#9b9b9b]" aria-hidden="true">
							<circle cx="8" cy="8" r="5.75" stroke="currentColor" stroke-width="1.25" />
							<path d="M8 4.75V8l2.25 1.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						{timeLabel}
					</span>
				</div>
			</div>

			<!-- Share strip -->
			<div class="flex shrink-0 items-center gap-2 rounded-md border border-[#e8e8e8] bg-[#fafafa] px-3 py-2 sm:max-w-72">
				<svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5 shrink-0 text-[#9b9b9b]" aria-hidden="true">
					<path d="M6.5 9.5 9.5 6.5M5.25 7.25l-1.1 1.1a2.65 2.65 0 0 0 3.75 3.75l1.1-1.1M10.75 8.75l1.1-1.1a2.65 2.65 0 0 0-3.75-3.75l-1.1 1.1" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
				</svg>
				<span class="min-w-0 flex-1 truncate text-[12px] text-[#6b6b6b]" title={page.url.href}>
					{page.url.href}
				</span>
				<button
					type="button"
					onclick={copyLink}
					class="shrink-0 cursor-pointer rounded-md px-2.5 py-1 font-medium text-[12px] transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97] {copyStatus === 'copied' ? 'text-[#166534]' : 'text-[#0a0a0a] hover:bg-[#f0f0f0]'}"
				>
					{#if copyStatus === "copied"}
						Copied
					{:else}
						{copyStatus === "error" ? "Try again" : "Copy"}
					{/if}
				</button>
			</div>
		</div>
	</header>

	<!-- View switcher -->
	{#if view === "responses"}
		<section class="pt-7" aria-labelledby="responses-heading" in:fade={{ duration: 150 }}>
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2
						id="responses-heading"
						class="font-semibold text-[15px] tracking-[-0.015em] text-[#0a0a0a]"
					>
						Everyone's availability
					</h2>
					<p class="mt-1 text-[12px] text-[#9b9b9b]">
						Compare responses · select a name to focus on one person
					</p>
				</div>
				<div class="flex items-center gap-2">
					{#if saved}
						<span class="flex items-center gap-1.5 text-[12px] text-[#166534]" aria-live="polite">
							<svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
								<path d="m3.5 8.25 2.75 2.75 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							Saved
						</span>
					{/if}
					<button
						type="button"
						onclick={openAnswer}
						class="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-[#0a0a0a] px-3.5 font-medium text-[13px] text-white transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-[#1a1a1a] active:scale-[0.97]"
					>
						{data.participant ? "Update availability" : "Add availability"}
					</button>
				</div>
			</div>

			<div class="mt-7">
				<AvailabilityResponses
					{dates}
					{startHour}
					{endHour}
					responses={data.responses}
					counts={data.heat}
				/>
			</div>
		</section>
	{:else}
		<section class="pt-7" aria-labelledby="answer-heading" in:fade={{ duration: 150 }}>
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2
						id="answer-heading"
						class="font-semibold text-[15px] tracking-[-0.015em] text-[#0a0a0a]"
					>
						{data.participant ? "Update your availability" : "Add your availability"}
					</h2>
					<p class="mt-1 text-[12px] text-[#9b9b9b]">
						Drag to mark · on mobile, tap or hold and drag
					</p>
				</div>
				<button
					type="button"
					onclick={closeAnswer}
					class="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 self-start rounded-md border border-[#e2e2e2] px-3 font-medium text-[13px] text-[#6b6b6b] transition-[color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-[#d0d0d0] hover:text-[#0a0a0a] active:scale-[0.97] sm:self-auto"
				>
					<svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
						<path d="m6.5 3.5-4 4.5 4 4.5M2.75 8h10.5" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					Responses
				</button>
			</div>

			{#if dates.length > 0}
				<form method="POST" use:enhance={handleEnhance} class="mt-7">
					<input type="hidden" name="selected" value={JSON.stringify(selected)} />

					<!-- Name + brush toolbar -->
					<div class="flex flex-wrap items-end gap-x-6 gap-y-4">
						<div>
							<label for="guest-name" class="mb-1.5 block font-medium text-[13px] text-[#0a0a0a]">
								Your name
							</label>
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
								class="block h-9 w-full rounded-md border border-[#e2e2e2] bg-white px-3 text-[13px] text-[#0a0a0a] placeholder:text-[#b5b5b5] focus:border-[#166534] focus:ring-1 focus:ring-[#166534] sm:w-56"
							/>
						</div>

						<div>
							<span class="mb-1.5 block font-medium text-[13px] text-[#0a0a0a]" id="brush-label">
								Marking as
							</span>
							<div
								class="inline-flex items-center rounded-md border border-[#e2e2e2] bg-[#f5f5f5] p-0.5"
								role="group"
								aria-labelledby="brush-label"
							>
								<button
									type="button"
									aria-pressed={brush === "yes"}
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
									aria-pressed={brush === "maybe"}
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

					<div class="mt-6 flex justify-center">
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

					<div class="mt-6 flex flex-col gap-3 border-t border-[#f0f0f0] pt-4 sm:flex-row sm:items-center sm:justify-between">
						<p class="text-[12px] text-[#9b9b9b]">
							Times in {data.event.timezone}.
							{#if selectedCount > 0}
								{selectedCount} slot{selectedCount === 1 ? "" : "s"} marked.
							{/if}
						</p>

						<div class="flex items-center gap-3">
							{#if form?.message}
								<span class="text-[12px] text-red-600" aria-live="polite">{form.message}</span>
							{:else if saved}
								<span class="flex items-center gap-1.5 text-[12px] text-[#166534]" aria-live="polite">
									<svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
										<path d="m3.5 8.25 2.75 2.75 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
									</svg>
									Saved
								</span>
							{/if}
							<button
								type="submit"
								disabled={isSubmitting}
								aria-busy={isSubmitting}
								class="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-md bg-[#0a0a0a] px-5 font-medium text-[13px] text-white transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-[#1a1a1a] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
							>
								{#if isSubmitting}
									<svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
										<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-opacity=".3" stroke-width="2" />
										<path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
									</svg>
									Saving…
								{:else}
									{data.participant ? "Update" : "Save availability"}
								{/if}
							</button>
						</div>
					</div>
				</form>
			{:else}
				<p class="mt-6 text-[13px] text-[#9b9b9b]">
					This event has no proposed dates yet.
				</p>
			{/if}
		</section>
	{/if}
</div>
