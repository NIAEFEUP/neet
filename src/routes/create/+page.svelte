<script lang="ts">
import {
	type DateValue,
	getLocalTimeZone,
	parseDate,
	today,
} from "@internationalized/date";
import { LoaderCircle } from "@lucide/svelte";
import type { SubmitFunction } from "@sveltejs/kit";
import { onMount } from "svelte";
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
	return form?.eventColor ?? "#0a0a0a";
}

let timezones = $state(Intl.supportedValuesOf("timeZone"));
let selectedTimezone = $state(initialTimezone());
let startHour = $state(initialStartHour());
let startPeriod = $state(initialStartPeriod());
let endHour = $state(initialEndHour());
let endPeriod = $state(initialEndPeriod());
let eventColor = $state(initialEventColor());

let isSubmitting = $state(false);
let dateError = $state("");
let range = $state<DateRange>(initialRange());

const minDate = today(getLocalTimeZone());
const hours = Array.from({ length: 12 }, (_, i) => i + 1);

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
		<input type="hidden" name="startDate" value={range.start?.toString() ?? ""} />
		<input type="hidden" name="endDate" value={range.end?.toString() ?? ""} />

		<section aria-labelledby="details-heading" class="space-y-4">
			<h2 id="details-heading" class="text-sm font-medium text-muted-foreground">
				Event details
			</h2>

			<div class="space-y-2">
				<Label for="title">Event title</Label>
				<Input
					type="text"
					name="title"
					id="title"
					required
					value={form?.title ?? ""}
					placeholder="e.g. Project kickoff"
				/>
			</div>

			<div class="space-y-2">
				<div class="flex items-center justify-between gap-2">
					<Label for="description">Description</Label>
					<span class="text-sm text-muted-foreground">Optional</span>
				</div>
				<Textarea
					name="description"
					id="description"
					rows={3}
					value={form?.description ?? ""}
					placeholder="Context, location, or a meeting link"
				/>
			</div>

			<div class="space-y-2">
				<div class="flex items-center justify-between gap-2">
					<Label for="eventColor">Block color</Label>
					<span class="text-sm text-muted-foreground">Used on the event page</span>
				</div>
				<div class="flex items-center gap-3">
					<input
						id="eventColor"
						name="eventColor"
						type="color"
						bind:value={eventColor}
						class="h-9 w-16 cursor-pointer rounded-md border border-input bg-background p-1"
					/>
					<span class="font-mono text-muted-foreground text-sm">{eventColor}</span>
				</div>
			</div>
		</section>

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
