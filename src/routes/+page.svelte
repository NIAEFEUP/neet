<script lang="ts">
import type { SubmitFunction } from "@sveltejs/kit";
// biome-ignore lint/correctness/noUnusedImports: used in markup
import { enhance } from "$app/forms";
import type { ActionData } from "./$types";

// biome-ignore lint/correctness/noUnusedVariables: used in markup
let { form } = $props<{ form: ActionData }>();

// biome-ignore lint/correctness/noUnusedVariables: used in markup
const timezones = Intl.supportedValuesOf("timeZone");
// biome-ignore lint/correctness/noUnusedVariables: used in markup
let selectedTimezone = $state("Europe/Lisbon");

// biome-ignore lint/correctness/noUnusedVariables: used in markup
let isSubmitting = $state(false);

// biome-ignore lint/correctness/noUnusedVariables: used in markup
const handleEnhance: SubmitFunction = () => {
	isSubmitting = true;
	return async ({ update }) => {
		await update();
		isSubmitting = false;
	};
};
</script>

<svelte:head>
	<title>Create an event · neet</title>
	<meta
		name="description"
		content="Choose dates and daily hours, then share one link to find a time that works for everyone."
	/>
</svelte:head>

<div class="mx-auto w-full max-w-[560px] px-4 py-12 sm:px-6 sm:py-16">
	<header class="mb-10">
		<h1 class="font-semibold text-[26px] leading-tight tracking-[-0.04em] text-[#0a0a0a]">
			Create an event
		</h1>
		<p class="mt-1.5 text-[13px] text-[#6b6b6b]">
			Choose dates, set hours, and share one link.
		</p>
	</header>

	{#if form?.message}
		<div class="mb-8 rounded-md border border-red-200 bg-red-50 px-3 py-2.5" role="alert">
			<p class="text-[13px] text-red-700">{form.message}</p>
		</div>
	{/if}

	<form method="POST" use:enhance={handleEnhance}>
		<section aria-labelledby="details-heading">
			<h2
				id="details-heading"
				class="mb-4 font-medium text-[11px] uppercase tracking-[0.08em] text-[#9b9b9b]"
			>
				Event details
			</h2>

			<div class="space-y-4">
				<div>
					<label for="title" class="mb-1.5 block font-medium text-[13px] text-[#0a0a0a]">
						Event title
					</label>
					<input
						type="text"
						name="title"
						id="title"
						required
						value={form?.title ?? ""}
						placeholder="e.g. Project kickoff"
						class="block h-9 w-full rounded-md border border-[#e2e2e2] bg-white px-3 text-[13px] text-[#0a0a0a] placeholder:text-[#b5b5b5] focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
					/>
				</div>

				<div>
					<div class="mb-1.5 flex items-baseline justify-between">
						<label for="description" class="font-medium text-[13px] text-[#0a0a0a]">
							Description
						</label>
						<span class="text-[12px] text-[#b5b5b5]">Optional</span>
					</div>
					<textarea
						name="description"
						id="description"
						rows="3"
						value={form?.description ?? ""}
						placeholder="Context, location, or a meeting link"
						class="block min-h-[84px] w-full resize-y rounded-md border border-[#e2e2e2] bg-white px-3 py-2 text-[13px] text-[#0a0a0a] placeholder:text-[#b5b5b5] focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
					></textarea>
				</div>
			</div>
		</section>

		<div class="my-8 border-t border-[#f0f0f0]"></div>

		<section aria-labelledby="schedule-heading">
			<h2
				id="schedule-heading"
				class="mb-4 font-medium text-[11px] uppercase tracking-[0.08em] text-[#9b9b9b]"
			>
				Schedule
			</h2>

			<div class="space-y-4">
				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<label for="startDate" class="mb-1.5 block font-medium text-[13px] text-[#0a0a0a]">
							Start date
						</label>
						<input
							type="date"
							name="startDate"
							id="startDate"
							required
							value={form?.startDate ?? ""}
							class="block h-9 w-full rounded-md border border-[#e2e2e2] bg-white px-3 text-[13px] text-[#0a0a0a] focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
						/>
					</div>
					<div>
						<label for="endDate" class="mb-1.5 block font-medium text-[13px] text-[#0a0a0a]">
							End date
						</label>
						<input
							type="date"
							name="endDate"
							id="endDate"
							required
							value={form?.endDate ?? ""}
							class="block h-9 w-full rounded-md border border-[#e2e2e2] bg-white px-3 text-[13px] text-[#0a0a0a] focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
						/>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<div class="mb-1.5 flex items-baseline justify-between">
							<label for="startHour" class="font-medium text-[13px] text-[#0a0a0a]">
								Daily start
							</label>
							<span class="text-[12px] text-[#b5b5b5]">Optional</span>
						</div>
						<div class="flex gap-2">
							<select
								name="startHour"
								id="startHour"
								value={form?.startHour ?? ""}
								class="block h-9 w-full min-w-0 rounded-md border border-[#e2e2e2] bg-white px-3 text-[13px] text-[#0a0a0a] focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
							>
								<option value="">Any time</option>
								{#each Array.from({ length: 12 }, (_, i) => i + 1) as hour (hour)}
									<option value={hour.toString()}>{hour}:00</option>
								{/each}
							</select>
							<select
								name="startPeriod"
								aria-label="Daily start period"
								value={form?.startPeriod ?? "AM"}
								class="block h-9 w-[70px] shrink-0 rounded-md border border-[#e2e2e2] bg-white px-2.5 text-[13px] text-[#0a0a0a] focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
							>
								<option value="AM">AM</option>
								<option value="PM">PM</option>
							</select>
						</div>
					</div>

					<div>
						<div class="mb-1.5 flex items-baseline justify-between">
							<label for="endHour" class="font-medium text-[13px] text-[#0a0a0a]">
								Daily end
							</label>
							<span class="text-[12px] text-[#b5b5b5]">Optional</span>
						</div>
						<div class="flex gap-2">
							<select
								name="endHour"
								id="endHour"
								value={form?.endHour ?? ""}
								class="block h-9 w-full min-w-0 rounded-md border border-[#e2e2e2] bg-white px-3 text-[13px] text-[#0a0a0a] focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
							>
								<option value="">Any time</option>
								{#each Array.from({ length: 12 }, (_, i) => i + 1) as hour (hour)}
									<option value={hour.toString()}>{hour}:00</option>
								{/each}
							</select>
							<select
								name="endPeriod"
								aria-label="Daily end period"
								value={form?.endPeriod ?? "AM"}
								class="block h-9 w-[70px] shrink-0 rounded-md border border-[#e2e2e2] bg-white px-2.5 text-[13px] text-[#0a0a0a] focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
							>
								<option value="AM">AM</option>
								<option value="PM">PM</option>
							</select>
						</div>
					</div>
				</div>

				<div>
					<label for="timezone" class="mb-1.5 block font-medium text-[13px] text-[#0a0a0a]">
						Timezone
					</label>
					<select
						name="timezone"
						id="timezone"
						required
						{@attach () => {
							selectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
						}}
						bind:value={selectedTimezone}
						class="block h-9 w-full rounded-md border border-[#e2e2e2] bg-white px-3 text-[13px] text-[#0a0a0a] focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
					>
						{#each timezones as timezone (timezone)}
							<option value={timezone}>{timezone}</option>
						{/each}
					</select>
				</div>
			</div>
		</section>

		<div class="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
			<p class="text-[12px] text-[#9b9b9b] sm:mr-auto">
				Your link will be ready to share once the event is created.
			</p>
			<button
				type="submit"
				disabled={isSubmitting}
				aria-busy={isSubmitting}
				class="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#0a0a0a] px-5 font-medium text-[13px] text-white transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-[#1a1a1a] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isSubmitting}
					<svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-opacity=".3" stroke-width="2" />
						<path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
					Creating…
				{:else}
					Create event
				{/if}
			</button>
		</div>
	</form>
</div>
