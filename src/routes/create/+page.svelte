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
import type { SubmitFunction } from "@sveltejs/kit";
import { onMount, untrack } from "svelte";
import { enhance } from "$app/forms";
import { ClampedHoursPicker, formatHour, parseHour } from "$lib";
import { Button } from "$lib/components/ui/button";
import { ColorPicker } from "$lib/components/ui/color-picker";
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

function initialTimeWindow(): number[] {
	const start = parseHour(form?.startTime);
	const end = parseHour(form?.endTime);

	if (start !== null && end !== null && end - start >= 1) {
		return [start, end];
	}

	// A fresh form starts at the working-day default. A failed submission
	// with empty times was deliberately "Any time", so preserve that.
	return form ? [0, 24] : [9, 17];
}

function initialEventColor() {
	const color = form?.eventColor ?? "";
	return /^#[0-9a-f]{6}$/i.test(color) ? color : "";
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

function handleColorInput(event: Event) {
	const input = event.currentTarget as HTMLInputElement | null;
	if (input) setEventColor(input.value);
}

let timezones = $state(Intl.supportedValuesOf("timeZone"));
let selectedTimezone = $state(initialTimezone());
let timeWindow = $state<number[]>(untrack(initialTimeWindow));
let eventColor = $state(initialEventColor());

let lastEventColor = $state(initialEventColor());
let colorPickerOpen = $state(false);

function setEventColor(next: string) {
	eventColor = next;
	if (next) lastEventColor = next;
	else colorPickerOpen = false;
}

let suppressHoverShadow = $state(false);

function handleCornerAction() {
	suppressHoverShadow = true;
	setEventColor(hasColor ? "" : DEFAULT_EVENT_COLOR);
}

let eventTitle = $state(untrack(() => form?.title ?? ""));
let eventDescription = $state(untrack(() => form?.description ?? ""));

let isSubmitting = $state(false);
let dateError = $state("");
let range = $state<DateRange>(initialRange());

const minDate = today(getLocalTimeZone());

const hasColor = $derived(eventColor !== "");
const previewIsLight = $derived(!hasColor || isLightColor(eventColor));
const swatchColor = $derived(eventColor || lastEventColor);
const swatchIsLight = $derived(isLightColor(swatchColor));
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
	const [start, end] = timeWindow;

	if (start <= 0 && end >= 24) return `Any time · ${selectedTimezone}`;

	return `${formatHour(start)} – ${formatHour(end)} · ${selectedTimezone}`;
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

<div class="mx-auto w-full max-w-xl px-5 pt-10 pb-14 sm:px-6 sm:py-12">
	<header class="mb-9 sm:mb-10">
		<h1 class="text-2xl font-semibold tracking-tight">Create an event</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			Choose dates, set hours, and share one link.
		</p>
	</header>

	{#if form?.message}
		<p class="mb-6 text-sm text-destructive" role="alert">{form.message}</p>
	{/if}

	<form
		method="POST"
		use:enhance={handleEnhance}
		class="space-y-8"
		style:--primary={hasColor ? eventColor : undefined}
		style:--primary-foreground={hasColor
			? previewIsLight
				? "var(--foreground)"
				: "var(--background)"
			: undefined}
		style:--accent="color-mix(in oklab, var(--primary) 18%, var(--background))"
	>
		<input type="hidden" name="eventColor" value={eventColor} />
		<input type="hidden" name="startDate" value={range.start?.toString() ?? ""} />
		<input type="hidden" name="endDate" value={range.end?.toString() ?? ""} />

		<div
			class={`relative rounded-xl border bg-card px-5 py-7 transition-[background-color,border-color] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] sm:px-7 sm:py-8 ${hasColor ? "border-transparent" : "border-border"}`}
			style:background-color={hasColor ? eventColor : undefined}
		>
			<div class="min-w-0 pr-7 sm:pr-8">
				<Label for="title" class="sr-only">Event title</Label>
				<Input
					type="text"
					name="title"
					id="title"
					required
					bind:value={eventTitle}
					placeholder="Your event title"
					class={`block-field h-auto rounded-none border-b border-transparent bg-transparent px-0 py-0 font-semibold text-2xl tracking-tight shadow-none duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:border-current focus-visible:ring-0 sm:text-3xl md:text-3xl ${previewTitleClass} ${previewIsLight ? "placeholder:text-foreground/40" : "placeholder:text-background/40"}`}
				/>

				<Label for="description" class="sr-only">Description</Label>
				<Textarea
					name="description"
					id="description"
					rows={2}
					bind:value={eventDescription}
					placeholder="Context, location, or a meeting link"
					class={`block-field mt-2 min-h-0 resize-none rounded-none border-b border-transparent bg-transparent px-0 py-0 leading-6 shadow-none field-sizing-content duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:border-current focus-visible:ring-0 ${previewMutedClass} ${previewIsLight ? "placeholder:text-foreground/40" : "placeholder:text-background/40"}`}
				/>

				<div
					class={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm transition-colors duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${previewMutedClass}`}
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

			<div class="absolute -top-4 -right-3 size-9 sm:-right-4">
				<div
					class={[
						"bubble absolute top-0 right-6",
						hasColor
							? "pointer-events-auto translate-x-0 translate-y-0 scale-100 opacity-100 blur-0"
							: "pointer-events-none translate-x-6 translate-y-0 scale-50 opacity-0 blur-[2px]",
					]}
					data-hidden={!hasColor}
					inert={!hasColor}
				>
					<ColorPicker
						value={eventColor || DEFAULT_EVENT_COLOR}
						onValueChange={setEventColor}
						bind:open={colorPickerOpen}
						triggerClass="grid size-9 place-items-center rounded-full border-2 border-background shadow-md ring-1 ring-foreground/10"
						triggerStyle={`background-color: ${swatchColor}`}
						triggerLabel="Change block color"
					>
						{#snippet trigger()}
							<PenIcon
								class={`size-4 ${swatchIsLight ? "text-foreground" : "text-background"}`}
								aria-hidden="true"
							/>
						{/snippet}
					</ColorPicker>
				</div>

				<button
					type="button"
					aria-label={hasColor ? "Remove block color" : "Add block color"}
					title={hasColor ? "Remove block color" : "Add block color"}
					onclick={handleCornerAction}
					onpointerleave={() => (suppressHoverShadow = false)}
					data-has-color={hasColor}
					data-hover-shadow={suppressHoverShadow ? "off" : "on"}
					class={[
						"corner-action absolute inset-0 z-10 grid size-9 cursor-pointer place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-md ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/50",
						hasColor
							? "translate-x-[2px] translate-y-[26px] scale-[0.6667]"
							: "translate-x-0 translate-y-0 scale-100",
					]}
				>
					<PlusIcon
						class={[
							"corner-icon size-4 relative z-10",
							hasColor ? "rotate-45 scale-[1.3125]" : "rotate-0 scale-100",
						]}
						aria-hidden="true"
					/>
				</button>
			</div>
		</div>

		<section aria-labelledby="schedule-heading" class="space-y-5">
			<h2 id="schedule-heading" class="text-sm font-medium text-muted-foreground">
				Schedule
			</h2>

			<div class="space-y-2.5 align">
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

			<ClampedHoursPicker bind:value={timeWindow} />

			<div class="space-y-2.5">
				<Label for="timezone">Timezone</Label>
				<Select.Root
					type="single"
					name="timezone"
					bind:value={selectedTimezone}
					required
				>
					<Select.Trigger
						id="timezone"
						class="w-full pl-3.5 pr-3 data-[size=default]:h-11 sm:data-[size=default]:h-9"
					>
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

		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
			<p class="text-sm text-muted-foreground sm:mr-auto">
				Your link will be ready to share once the event is created.
			</p>
			<Button
				type="submit"
				disabled={isSubmitting}
				aria-busy={isSubmitting}
				class="h-11 w-full text-base sm:h-9 sm:w-auto sm:text-sm"
			>
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

<style>
	.bubble {
		--bubble-in: cubic-bezier(0.34, 1.56, 0.64, 1);
		--bubble-out: cubic-bezier(0.77, 0, 0.175, 1);
		transition:
			translate 300ms var(--bubble-in),
			scale 300ms var(--bubble-in),
			opacity 160ms ease-out,
			filter 300ms var(--bubble-in),
			color 150ms ease;
	}

	/* Merging back: travel is visible, the fade waits until the bubbles
	   are nearly home, and the plus arrives after they start moving. */
	.bubble[data-hidden="true"] {
		transition:
			translate 220ms var(--bubble-out),
			scale 220ms var(--bubble-out),
			opacity 80ms cubic-bezier(0.23, 1, 0.32, 1) 140ms,
			filter 220ms var(--bubble-out),
			color 150ms ease;
	}

	.corner-action {
		--corner-in: cubic-bezier(0.34, 1.56, 0.64, 1);
		--corner-out: cubic-bezier(0.77, 0, 0.175, 1);
		transition:
			translate 300ms var(--corner-in),
			scale 300ms var(--corner-in);
	}

	.corner-action[data-has-color="false"] {
		transition:
			translate 260ms var(--corner-out),
			scale 260ms var(--corner-out);
	}

	.corner-action::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: 9999px;
		box-shadow: inset 0 0 8px rgb(0 0 0 / 0.08);
		opacity: 0;
		pointer-events: none;
		transition: opacity 280ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	@media (hover: hover) and (pointer: fine) {
		.corner-action:hover::after {
			opacity: 1;
		}
	}

	.corner-action[data-hover-shadow="off"]::after {
		opacity: 0;
	}

	:global(.corner-icon) {
		transition:
			rotate 300ms var(--corner-in),
			scale 300ms var(--corner-in);
	}

	.corner-action[data-has-color="false"] :global(.corner-icon) {
		transition:
			rotate 260ms var(--corner-out),
			scale 260ms var(--corner-out);
	}

	:global(.block-field)::placeholder {
		transition: color 220ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	@media (prefers-reduced-motion: reduce) {
		.bubble,
		.bubble[data-hidden="true"],
		.corner-action,
		.corner-action[data-has-color="false"],
		:global(.corner-icon),
		.corner-action[data-has-color="false"] :global(.corner-icon) {
			transition: opacity 150ms ease;
			transition-delay: 0ms;
		}
	}
</style>
