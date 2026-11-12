<script lang="ts">
import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
import CalendarIcon from "@lucide/svelte/icons/calendar";
import CheckIcon from "@lucide/svelte/icons/check";
import ClockIcon from "@lucide/svelte/icons/clock";
import LinkIcon from "@lucide/svelte/icons/link";
import LoaderCircle from "@lucide/svelte/icons/loader-circle";
import type { SubmitFunction } from "@sveltejs/kit";
import { onDestroy, untrack } from "svelte";
import { enhance } from "$app/forms";
import { page } from "$app/state";
import type { CellMode, PublicResponse, SelectedCells } from "$lib";
import {
	AvailabilityResponses,
	normalizeDays,
	parseHour,
	TimeGrid,
} from "$lib";
import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import * as Select from "$lib/components/ui/select";
import { Separator } from "$lib/components/ui/separator";
import type { ActionData, PageData } from "./$types";

let { data, form } = $props<{ data: PageData; form: ActionData }>();

let selected = $state<SelectedCells>(
	untrack(() => data.participant?.selected ?? {}),
);
let name = $state(untrack(() => data.participant?.name ?? ""));
let brush = $state<CellMode>("yes");
let isSubmitting = $state(false);
let saved = $state(false);
let view = $state<"responses" | "answer">("responses");
let copyStatus = $state<"idle" | "copied" | "error">("idle");
let copyStatusResetTimer: ReturnType<typeof setTimeout> | undefined;

let hoveredResponseId = $state<string | null>(null);
let selectedResponseIds = $state<string[]>([]);

const dates = $derived(data.event.proposedDates);
const eventColor = $derived(data.event.color);
const headerHasColor = $derived(eventColor !== "");
const headerIsLight = $derived(!headerHasColor || isLightColor(eventColor));
const headerTitleClass = $derived(
	headerIsLight ? "text-foreground" : "text-background",
);
const headerMutedClass = $derived(
	headerIsLight ? "text-foreground/70" : "text-background/70",
);
const startHour = $derived(parseHour(data.event.startTime) ?? 0);
const endHour = $derived(parseHour(data.event.endTime) ?? 24);
const isolatedResponse = $derived(
	hoveredResponseId
		? (data.responses.find(
				(response: PublicResponse) => response.id === hoveredResponseId,
			) ?? null)
		: null,
);
const selectedResponses = $derived(
	selectedResponseIds.length > 0
		? data.responses.filter((response: PublicResponse) =>
				selectedResponseIds.includes(response.id),
			)
		: [],
);
const selectedResponseCount = $derived(selectedResponses.length);
const everyoneActive = $derived(
	selectedResponseIds.length === 0 && !hoveredResponseId,
);
const answerHeading = $derived(
	data.participant ? "Update your availability" : "Add your availability",
);
const responsesHeading = $derived(
	isolatedResponse
		? `${isolatedResponse.name}'s availability`
		: selectedResponseCount === 0
			? "Everyone's availability"
			: selectedResponseCount === 1
				? `${selectedResponses[0].name}'s availability`
				: "Selected availability",
);
const responsesSubtitle = $derived(
	isolatedResponse
		? "Showing only this participant's selected times."
		: selectedResponseCount > 0
			? `Showing ${selectedResponseCount} selected ${selectedResponseCount === 1 ? "person" : "people"}.`
			: "Hover a name to preview their schedule. Check people to compare only them.",
);
const availabilityLabel = $derived(
	isolatedResponse
		? `${isolatedResponse.name}'s availability`
		: selectedResponseCount > 0
			? "Selected availability"
			: "Everyone's availability",
);

const timeLabel = $derived(
	data.event.startTime && data.event.endTime
		? `${data.event.startTime} – ${data.event.endTime} · ${data.event.timezone}`
		: `All day · ${data.event.timezone}`,
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

onDestroy(() => {
	clearTimeout(copyStatusResetTimer);
});

function isLightColor(hex: string): boolean {
	const value = hex.replace("#", "");
	if (!/^[0-9a-f]{6}$/i.test(value)) return false;

	const r = Number.parseInt(value.slice(0, 2), 16);
	const g = Number.parseInt(value.slice(2, 4), 16);
	const b = Number.parseInt(value.slice(4, 6), 16);
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

function markDirty() {
	saved = false;
}

function openAnswer() {
	saved = false;
	hoveredResponseId = null;
	view = "answer";
}

function closeAnswer() {
	hoveredResponseId = null;
	view = "responses";
}

function showEveryone() {
	hoveredResponseId = null;
	selectedResponseIds = [];
}

function toggleResponse(id: string) {
	hoveredResponseId = null;
	selectedResponseIds = selectedResponseIds.includes(id)
		? selectedResponseIds.filter((selectedId) => selectedId !== id)
		: [...selectedResponseIds, id];
}

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

const handleEnhance: SubmitFunction = () => {
	isSubmitting = true;
	saved = false;

	return async ({ result, update }) => {
		await update({ reset: false });
		isSubmitting = false;
		if (result.type === "success") {
			showEveryone();
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

<div class="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
	<header
		class={headerHasColor
			? "rounded-xl px-5 py-6 sm:px-7 sm:py-7"
			: "px-5 pb-2 sm:px-7"}
		style:background-color={headerHasColor ? eventColor : undefined}
	>
		<div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0">
				<h1
					class={headerHasColor
						? `-ml-[0.04em] break-words font-semibold text-2xl tracking-tight sm:text-3xl ${headerTitleClass}`
						: "-ml-[0.04em] break-words font-semibold text-4xl text-foreground tracking-tight sm:text-5xl"}
				>
					{data.event.title}
				</h1>
				{#if data.event.description}
					<p
						class={headerHasColor
							? `mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 ${headerMutedClass}`
							: "mt-3 max-w-2xl whitespace-pre-wrap text-muted-foreground text-sm leading-6"}
					>
						{data.event.description}
					</p>
				{/if}

				<!--
					TODO(accounts): show the event creator's name(s) here once accounts
					are implemented. The participant names are deliberately hidden for now.
				-->

				<div
					class={headerHasColor
						? `mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm ${headerMutedClass}`
						: "mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground text-xs"}
				>
					<span class="inline-flex items-center gap-1.5">
						<CalendarIcon class="size-3.5" aria-hidden="true" />
						{dateLabel}
					</span>
					<span class="inline-flex items-center gap-1.5">
						<ClockIcon class="size-3.5" aria-hidden="true" />
						{timeLabel}
					</span>
				</div>
			</div>

			<Button
				variant={headerHasColor
					? headerIsLight
						? "outline"
						: "secondary"
					: "outline"}
				size="sm"
				class="self-start"
				onclick={copyLink}
				aria-live="polite"
			>
				{#if copyStatus === "copied"}
					<CheckIcon aria-hidden="true" />
					Copied
				{:else}
					<LinkIcon aria-hidden="true" />
					{copyStatus === "error" ? "Try again" : "Copy link"}
				{/if}
			</Button>
		</div>
	</header>

	{#snippet responsesSidebar()}
		<aside
			aria-labelledby="participants-heading"
			class="border-border border-t pt-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6"
		>
			<h2 id="participants-heading" class="font-semibold text-base">
				Responses
			</h2>
			<p class="mt-0.5 text-muted-foreground text-xs">
				{data.responses.length} participant{data.responses.length === 1 ? "" : "s"}
			</p>

			{#if data.responses.length === 0}
				<p class="mt-3 text-muted-foreground text-xs">No responses yet.</p>
			{:else}
				<div
					role="group"
					aria-label="Participant filters"
					class="mt-2.5 flex flex-col gap-0.5"
					onmouseleave={() => (hoveredResponseId = null)}
				>
					<button
						type="button"
						aria-pressed={everyoneActive}
						onmouseenter={() => (hoveredResponseId = null)}
						onclick={showEveryone}
						class={[
							"w-full cursor-pointer rounded-md px-2 py-1.5 text-left font-medium text-sm transition-colors duration-150",
							everyoneActive
								? "bg-muted text-foreground"
								: "text-foreground hover:bg-muted/60",
						]}
					>
						Everyone
					</button>

					{#each data.responses as response (response.id)}
						{@const checked = selectedResponseIds.includes(response.id)}
						<label
							class={[
								"participant-row group relative flex w-full cursor-pointer items-center overflow-hidden rounded-md py-1.5 pr-2 font-medium text-sm transition-colors duration-150",
								checked ? "bg-muted/60" : "hover:bg-muted/60",
							]}
							onmouseenter={() => (hoveredResponseId = response.id)}
						>
							<input
								type="checkbox"
								class="sr-only"
								checked={checked}
								onchange={() => toggleResponse(response.id)}
								onfocus={() => (hoveredResponseId = response.id)}
								onblur={() => (hoveredResponseId = null)}
							/>
							<span
								class={[
									"participant-checkbox pointer-events-none absolute top-1/2 left-2 flex size-4 -translate-y-1/2 items-center justify-center rounded-[5px] border shadow-xs transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-focus-within:ring-2 group-focus-within:ring-ring/50",
									checked
										? "scale-100 border-primary bg-primary text-primary-foreground opacity-100"
										: "scale-90 border-input bg-background opacity-0 group-focus-within:scale-100 group-focus-within:opacity-100",
								]}
								aria-hidden="true"
							>
								<CheckIcon
									class={`size-3 transition-opacity duration-100 ${checked ? "opacity-100" : "opacity-0"}`}
								/>
							</span>
							<span
								class={`participant-name min-w-0 flex-1 truncate pr-6 pl-2 transition-[translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
									checked ? "translate-x-6" : "group-focus-within:translate-x-6"
								}`}
							>
								{response.name}
							</span>
						</label>
					{/each}
				</div>
			{/if}

			<Separator class="my-4" />

			<section aria-labelledby="best-time-heading">
				<h2 id="best-time-heading" class="font-semibold text-base">
					Best time
				</h2>
				<p class="mt-1.5 font-semibold text-sm">No best time yet</p>
				<p class="mt-1 text-muted-foreground text-xs leading-4">
					A suggested time will appear once availability has been compared.
				</p>
			</section>
		</aside>
	{/snippet}

	<div class="mt-8 px-5 sm:px-7">
		{#if view === "responses"}
			<div class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_12rem] xl:gap-8">
			<section aria-labelledby="responses-heading" class="min-w-0">
				<div
					class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
				>
					<div>
						<h2
							id="responses-heading"
							class="font-semibold text-2xl tracking-tight"
						>
							{responsesHeading}
						</h2>
						<p class="mt-1 text-muted-foreground text-sm">
							{responsesSubtitle}
						</p>
					</div>

					<div class="flex items-center gap-3 self-start">
						{#if saved}
							<span
								class="flex items-center gap-1.5 text-green-700 text-xs dark:text-green-500"
								aria-live="polite"
							>
								<CheckIcon class="size-3.5" aria-hidden="true" />
								Saved
							</span>
						{/if}
						<Button onclick={openAnswer}>
							{data.participant ? "Update availability" : "Add availability"}
						</Button>
					</div>
				</div>

				<div class="mt-6">
					<AvailabilityResponses
						{dates}
						{startHour}
						{endHour}
						responses={data.responses}
						counts={data.heat}
						activeId={hoveredResponseId}
						selectedIds={selectedResponseIds}
						label={availabilityLabel}
					/>
				</div>
			</section>

			{@render responsesSidebar()}
		</div>
	{:else}
		<form method="POST" use:enhance={handleEnhance}>
			<input type="hidden" name="selected" value={JSON.stringify(selected)} />

			<div class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_12rem] xl:gap-8">
				<section aria-labelledby="availability-heading" class="min-w-0">
					<div
						class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
					>
						<div>
							<h2
								id="availability-heading"
								class="font-semibold text-2xl tracking-tight"
							>
								{answerHeading}
							</h2>
							<p class="mt-1 text-muted-foreground text-sm">
								Click and drag to mark your available times.
							</p>
						</div>

						<div class="flex flex-col gap-2 self-start sm:items-end">
							<div class="flex flex-wrap items-center gap-2">
								<Button type="button" variant="outline" onclick={closeAnswer}>
									<ArrowLeftIcon aria-hidden="true" />
									Responses
								</Button>
								{#if dates.length > 0}
									<Button
										type="submit"
										disabled={isSubmitting}
										aria-busy={isSubmitting}
									>
										{#if isSubmitting}
											<LoaderCircle class="animate-spin" aria-hidden="true" />
											Saving…
										{:else}
											Save availability
										{/if}
									</Button>
								{/if}
							</div>
							{#if form?.message}
								<span class="text-destructive text-xs" aria-live="polite">
									{form.message}
								</span>
							{/if}
						</div>
					</div>

					<div class="mt-5 flex flex-wrap items-end gap-x-5 gap-y-4">
						<div class="w-full space-y-1.5 sm:w-52">
							<Label
								for="guest-name"
								class="font-medium text-[11px] text-muted-foreground uppercase tracking-wide"
							>
								Your name
							</Label>
							<Input
								id="guest-name"
								name="name"
								type="text"
								required
								maxlength={80}
								autocomplete="name"
								placeholder="e.g. Ana Sousa"
								data-protonpass-ignore="true"
								bind:value={name}
								oninput={markDirty}
							/>
						</div>

						<div class="w-full space-y-1.5 sm:w-52">
							<Label
								for="timezone"
								class="font-medium text-[11px] text-muted-foreground uppercase tracking-wide"
							>
								Timezone
							</Label>
							<Select.Root type="single" value={data.event.timezone}>
								<Select.Trigger id="timezone" class="w-full" aria-label="Timezone">
									<Select.Value placeholder="Select a timezone" />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value={data.event.timezone} label={data.event.timezone}>
										{data.event.timezone}
									</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>

						<div
							class="flex items-center gap-1 self-end pb-0.5"
							role="group"
							aria-label="Marking as"
						>
							<Button
								type="button"
								size="sm"
								variant={brush === "yes" ? "secondary" : "ghost"}
								aria-pressed={brush === "yes"}
								onclick={() => (brush = "yes")}
								class="gap-2"
							>
								<span class="size-2 rounded-[2px] bg-green-700" aria-hidden="true"></span>
								Yes
							</Button>
							<Button
								type="button"
								size="sm"
								variant={brush === "maybe" ? "secondary" : "ghost"}
								aria-pressed={brush === "maybe"}
								onclick={() => (brush = "maybe")}
								class="gap-2"
							>
								<span class="size-2 rounded-[2px] bg-yellow-600" aria-hidden="true"></span>
								If need be
							</Button>
						</div>
					</div>

					{#if dates.length > 0}
						<div class="-mx-4 mt-4">
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
					{:else}
						<p class="mt-6 text-muted-foreground text-sm">
							This event has no proposed dates yet.
						</p>
					{/if}
				</section>

				{@render responsesSidebar()}
			</div>

		</form>
		{/if}
	</div>
</div>


<style>
	@media (hover: hover) and (pointer: fine) {
		.participant-row:hover .participant-checkbox {
			opacity: 1;
			scale: 1;
		}

		.participant-row:hover .participant-name {
			translate: 1.5rem 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.participant-checkbox {
			scale: 1;
			transition-property: opacity;
		}

		.participant-name {
			transition: none;
		}
	}
</style>
