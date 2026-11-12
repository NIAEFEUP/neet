<script lang="ts">
import {
	type DateValue,
	getLocalTimeZone,
	parseDate,
	today,
} from "@internationalized/date";
import { LoaderCircle } from "@lucide/svelte";
import CalendarIcon from "@lucide/svelte/icons/calendar";
import ClockIcon from "@lucide/svelte/icons/clock";
import PenIcon from "@lucide/svelte/icons/pen";
import PlusIcon from "@lucide/svelte/icons/plus";
import XIcon from "@lucide/svelte/icons/x";
import type { SubmitFunction } from "@sveltejs/kit";
import { onMount, untrack } from "svelte";
import { enhance } from "$app/forms";
import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { RangeCalendar } from "$lib/components/ui/range-calendar";
import * as Select from "$lib/components/ui/select";
import { Textarea } from "$lib/components/ui/textarea";
import type { ActionData } from "./$types";

let { form } = $props<{ form: ActionData }>();

type DateRange = {
	start: DateValue | undefined;
	end: DateValue | undefined;
};

function parseISODate(value: string | null | undefined): DateValue | undefined {
	if (!value) return undefined;

	try {
		return parseDate(value);
	} catch {
		return undefined;
	}
}

function initialTimezone() {
	return form?.timezone ?? "Europe/Lisbon";
}

function initialRange(): DateRange {
	return {
		start: parseISODate(form?.startDate),
		end: parseISODate(form?.endDate),
	};
}

function initialStartHour() {
	return form?.startHour ?? "";
}

function initialStartPeriod() {
	return form?.startPeriod ?? "AM";
}

function initialEndHour() {
	return form?.endHour ?? "";
}

function initialEndPeriod() {
	return form?.endPeriod ?? "AM";
}

function initialEventColor() {
	return form?.eventColor ?? "";
}

/** Matches the form's primary button color (--primary). */
const DEFAULT_EVENT_COLOR = "#660910";

function isLightColor(hex: string): boolean {
	const value = hex.replace("#", "");
	if (!/^[0-9a-f]{6}$/i.test(value)) return false;

	const r = Number.parseInt(value.slice(0, 2), 16);
	const g = Number.parseInt(value.slice(2, 4), 16);
	const b = Number.parseInt(value.slice(4, 6), 16);
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

function to24Hour(hour: string, period: string): string {
	let h = Number.parseInt(hour, 10);
	if (period === "PM" && h < 12) h += 12;
	if (period === "AM" && h === 12) h = 0;
	return `${h.toString().padStart(2, "0")}:00`;
}

function handleColorInput(event: Event) {
	const input = event.currentTarget as HTMLInputElement | null;
	if (input) eventColor = input.value;
}

let timezones = $state(Intl.supportedValuesOf("timeZone"));
let selectedTimezone = $state(initialTimezone());
let startHour = $state(initialStartHour());
let startPeriod = $state(initialStartPeriod());
let endHour = $state(initialEndHour());
let endPeriod = $state(initialEndPeriod());
let eventColor = $state(initialEventColor());
let eventTitle = $state(untrack(() => form?.title ?? ""));
let eventDescription = $state(untrack(() => form?.description ?? ""));

let isSubmitting = $state(false);
let dateError = $state("");
let range = $state<DateRange>(initialRange());

const minDate = today(getLocalTimeZone());
const hours = Array.from({ length: 12 }, (_, i) => i + 1);

const hasColor = $derived(eventColor !== "");
const previewIsLight = $derived(!hasColor || isLightColor(eventColor));
const previewTitleClass = $derived(
	previewIsLight ? "text-foreground" : "text-background",
);
const previewMutedClass = $derived(
	previewIsLight ? "text-foreground/70" : "text-background/70",
);

const previewDateLabel = $derived.by(() => {
	if (!range.start || !range.end) return "Select dates";

	const format = (date: DateValue) =>
		new Date(`${date.toString()}T00:00:00`).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});

	const first = format(range.start);
	const last = format(range.end);
	return first === last ? first : `${first} – ${last}`;
});

const previewTimeLabel = $derived.by(() => {
	if (!startHour || !endHour) return `Any time · ${selectedTimezone}`;

	return `${to24Hour(startHour, startPeriod)} – ${to24Hour(endHour, endPeriod)} · ${selectedTimezone}`;
});

onMount(() => {
	if (form?.timezone) return;

	const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	if (!timezones.includes(localTimezone)) {
		timezones = [localTimezone, ...timezones];
	}

	selectedTimezone = localTimezone;
});

function handleRangeChange(next: DateRange) {
	if (next.start && next.end) dateError = "";
}

const handleEnhance: SubmitFunction = ({ formData, cancel }) => {
	if (!formData.get("startDate") || !formData.get("endDate")) {
		cancel();
		dateError = "Select both a start and an end date.";
		return;
	}

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

<div class="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
	<header class="mb-8">
		<h1 class="text-2xl font-semibold tracking-tight">Create an event</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Choose dates, set hours, and share one link.
		</p>
	</header>

	{#if form?.message}
		<p class="mb-6 text-sm text-destructive" role="alert">{form.message}</p>
	{/if}

	<form method="POST" use:enhance={handleEnhance} class="space-y-6">
		<input type="hidden" name="eventColor" value={eventColor} />
		<input type="hidden" name="startDate" value={range.start?.toString() ?? ""} />
		<input type="hidden" name="endDate" value={range.end?.toString() ?? ""} />

		<div
			class={`relative rounded-xl px-5 py-6 transition-[background-color,border-color] duration-300 sm:px-7 sm:py-7 ${hasColor ? "" : "border border-border bg-card"}`}
			style:background-color={hasColor ? eventColor : undefined}
		>
			<div class="min-w-0 pr-8">
				<Label for="title" class="sr-only">Event title</Label>
				<Input
					type="text"
					name="title"
					id="title"
					required
					bind:value={eventTitle}
					placeholder="Your event title"
					class={`h-auto rounded-none border-b border-transparent bg-transparent px-0 py-0 font-semibold text-2xl tracking-tight shadow-none focus-visible:border-current focus-visible:ring-0 sm:text-3xl md:text-3xl ${previewTitleClass} ${previewIsLight ? "placeholder:text-foreground/40" : "placeholder:text-background/40"}`}
				/>

				<Label for="description" class="sr-only">Description</Label>
				<Textarea
					name="description"
					id="description"
					rows={2}
					bind:value={eventDescription}
					placeholder="Context, location, or a meeting link"
					class={`mt-2 min-h-0 resize-none rounded-none border-b border-transparent bg-transparent px-0 py-0 text-sm leading-6 shadow-none field-sizing-content focus-visible:border-current focus-visible:ring-0 ${previewMutedClass} ${previewIsLight ? "placeholder:text-foreground/40" : "placeholder:text-background/40"}`}
				/>

				<div
					class={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm ${previewMutedClass}`}
				>
					<span class="inline-flex items-center gap-1.5">
						<CalendarIcon class="size-3.5" aria-hidden="true" />
						{previewDateLabel}
					</span>
					<span class="inline-flex items-center gap-1.5">
						<ClockIcon class="size-3.5" aria-hidden="true" />
						{previewTimeLabel}
					</span>
				</div>
			</div>

			<div class="absolute -top-4 -right-4 size-9">
				<div
					class={[
						"absolute inset-0 transition-[scale,opacity] duration-200 ease-out motion-reduce:transition-[opacity]",
						hasColor
							? "pointer-events-none scale-90 opacity-0"
							: "pointer-events-auto scale-100 opacity-100",
					]}
					inert={hasColor}
				>
					<button
						type="button"
						title="Add block color"
						onclick={() => (eventColor = DEFAULT_EVENT_COLOR)}
						class="flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md ring-1 ring-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
					>
						<span class="sr-only">Add block color</span>
						<PlusIcon class="size-4" aria-hidden="true" />
					</button>
				</div>

				<div
					class={[
						"absolute top-0 right-6 transition-[translate,scale,opacity,filter] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-[opacity]",
						hasColor
							? "pointer-events-auto translate-x-0 translate-y-0 scale-100 opacity-100 blur-0"
							: "pointer-events-none translate-x-6 translate-y-0 scale-90 opacity-0 blur-[2px]",
					]}
					inert={!hasColor}
				>
					<label
						class="grid size-9 cursor-pointer place-items-center rounded-full border-2 border-background shadow-md ring-1 ring-foreground/10 focus-within:ring-2 focus-within:ring-ring/50"
						style:background-color={eventColor}
						title="Change block color"
					>
						<span class="sr-only">Change block color</span>
						<PenIcon
							class={`size-4 ${previewIsLight ? "text-foreground" : "text-background"}`}
							aria-hidden="true"
						/>
						<input
							type="color"
							value={eventColor || DEFAULT_EVENT_COLOR}
							onchange={handleColorInput}
							class="sr-only"
						/>
					</label>
				</div>

				<button
					type="button"
					aria-label="Remove block color"
					onclick={() => (eventColor = "")}
					inert={!hasColor}
					class={[
						"absolute top-8 right-1 z-10 grid size-6 cursor-pointer place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-[translate,scale,opacity] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:text-foreground motion-reduce:transition-[opacity]",
						hasColor
							? "pointer-events-auto translate-x-0 translate-y-0 scale-100 opacity-100"
							: "pointer-events-none -translate-x-0.5 -translate-y-[26px] scale-75 opacity-0",
					]}
				>
					<XIcon class="size-3.5" aria-hidden="true" />
				</button>
			</div>
		</div>

		<section aria-labelledby="schedule-heading" class="space-y-4">
			<h2 id="schedule-heading" class="text-sm font-medium text-muted-foreground">
				Schedule
			</h2>

			<div class="space-y-2 align">
				<p class="text-sm font-medium">Dates</p>
				<RangeCalendar
					bind:value={range}
					onValueChange={handleRangeChange}
					minValue={minDate}
					maxDays={30}
					calendarLabel="Event dates"
					class="mx-auto w-fit"
				/>
				{#if dateError}
					<p class="text-sm text-destructive" role="alert">{dateError}</p>
				{/if}
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<div class="flex items-center justify-between gap-2">
						<Label for="startHour">Daily start</Label>
						<span class="text-sm text-muted-foreground">Optional</span>
					</div>
					<div class="flex gap-2">
						<Select.Root type="single" name="startHour" bind:value={startHour}>
							<Select.Trigger id="startHour" class="w-full" aria-label="Daily start hour">
								<Select.Value placeholder="Any time" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="" label="Any time">Any time</Select.Item>
								{#each hours as hour (hour)}
									<Select.Item value={hour.toString()} label={`${hour}:00`}>
										{hour}:00
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>

						<Select.Root type="single" name="startPeriod" bind:value={startPeriod}>
							<Select.Trigger class="w-20" aria-label="Daily start period">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="AM" label="AM">AM</Select.Item>
								<Select.Item value="PM" label="PM">PM</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between gap-2">
						<Label for="endHour">Daily end</Label>
						<span class="text-sm text-muted-foreground">Optional</span>
					</div>
					<div class="flex gap-2">
						<Select.Root type="single" name="endHour" bind:value={endHour}>
							<Select.Trigger id="endHour" class="w-full" aria-label="Daily end hour">
								<Select.Value placeholder="Any time" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="" label="Any time">Any time</Select.Item>
								{#each hours as hour (hour)}
									<Select.Item value={hour.toString()} label={`${hour}:00`}>
										{hour}:00
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>

						<Select.Root type="single" name="endPeriod" bind:value={endPeriod}>
							<Select.Trigger class="w-20" aria-label="Daily end period">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="AM" label="AM">AM</Select.Item>
								<Select.Item value="PM" label="PM">PM</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="timezone">Timezone</Label>
				<Select.Root
					type="single"
					name="timezone"
					bind:value={selectedTimezone}
					required
				>
					<Select.Trigger id="timezone" class="w-full">
						<Select.Value placeholder="Select a timezone" />
					</Select.Trigger>
					<Select.Content>
						{#each timezones as timezone (timezone)}
							<Select.Item value={timezone} label={timezone}>{timezone}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</section>

		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
			<p class="text-sm text-muted-foreground sm:mr-auto">
				Your link will be ready to share once the event is created.
			</p>
			<Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
				{#if isSubmitting}
					<LoaderCircle class="animate-spin" aria-hidden="true" />
					Creating…
				{:else}
					Create event
				{/if}
			</Button>
		</div>
	</form>
</div>
