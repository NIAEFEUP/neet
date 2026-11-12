import { error, fail } from "@sveltejs/kit";
import {
	availabilityToSelected,
	parseSelectedCells,
	selectedToAvailability,
	validateSelectedCells,
} from "$lib/components/time-grid/availability";
import { hoursBetween, parseHour } from "$lib/components/time-grid/date-utils";
import type {
	HeatmapCounts,
	PublicResponse,
} from "$lib/components/time-grid/types";
import { db } from "../../../prisma/db";
import type { Actions, PageServerLoad } from "./$types";

const PARTICIPANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** One cookie per event, so a guest can answer several events separately. */
function participantCookie(eventId: string): string {
	return `neet_participant_${eventId}`;
}

export const load: PageServerLoad = async ({ params, cookies, url }) => {
	const event = await db.orm.public.Event.where({ id: params.id }).first();

	if (!event) {
		throw error(404, { message: "Event not found" });
	}

	const dates = event.proposedDates.map((date) => date.toString());
	const cookieId = cookies.get(participantCookie(event.id));
	const colorParam = url.searchParams.get("color");
	const color =
		colorParam === null
			? "#0a0a0a"
			: /^#[0-9a-f]{6}$/i.test(colorParam)
				? colorParam
				: "";

	// Every response is public, so load them all in one pass: one participant
	// query and one availability query, then group the ranges by participant.
	const [participants, availabilities] = await Promise.all([
		db.orm.public.Participant.where({ eventId: event.id }).all(),
		db.orm.public.Availability.where({ eventId: event.id }).all(),
	]);

	const blocksByParticipant = new Map<string, typeof availabilities>();
	for (const block of availabilities) {
		const blocks = blocksByParticipant.get(block.participantId) ?? [];
		blocks.push(block);
		blocksByParticipant.set(block.participantId, blocks);
	}

	const responses: PublicResponse[] = participants
		.map((row) => ({
			id: row.id,
			name: row.name,
			selected: availabilityToSelected(
				blocksByParticipant.get(row.id) ?? [],
				event.timezone,
			),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	// One cell can hold both signals: a count of yes and a count of if-need-be.
	const heat: HeatmapCounts = {};
	for (const response of responses) {
		for (const [key, mode] of Object.entries(response.selected)) {
			let cell = heat[key];
			if (!cell) {
				cell = { yes: 0, maybe: 0 };
				heat[key] = cell;
			}
			cell[mode] += 1;
		}
	}

	const current = cookieId
		? (responses.find((response) => response.id === cookieId) ?? null)
		: null;

	return {
		event: {
			id: event.id,
			title: event.title,
			description: event.description,
			timezone: event.timezone,
			proposedDates: dates,
			startTime: event.startTime,
			endTime: event.endTime,
			color,
		},
		participant: current
			? { name: current.name, selected: current.selected }
			: null,
		responses,
		heat,
	};
};

export const actions = {
	default: async ({ request, params, cookies, url }) => {
		const event = await db.orm.public.Event.where({ id: params.id }).first();

		if (!event) {
			return fail(404, { message: "This event no longer exists." });
		}

		const form = await request.formData();
		const name = String(form.get("name") ?? "").trim();
		const selected = parseSelectedCells(form.get("selected"));

		const preserved = { name };

		if (!name) {
			return fail(400, { ...preserved, message: "Add your name first." });
		}
		if (name.length > 80) {
			return fail(400, {
				...preserved,
				message: "That name is too long (80 characters max).",
			});
		}
		if (!selected) {
			return fail(400, {
				...preserved,
				message: "We couldn't read your time selection. Try marking it again.",
			});
		}
		if (Object.keys(selected).length === 0) {
			return fail(400, {
				...preserved,
				message: "Mark at least one hour before saving.",
			});
		}

		const dates = event.proposedDates.map((date) => date.toString());
		const hours = hoursBetween(
			parseHour(event.startTime) ?? 0,
			parseHour(event.endTime) ?? 24,
		);
		const startHour = hours[0];
		const endHour = hours[hours.length - 1] + 1;

		const invalid = validateSelectedCells(selected, dates, startHour, endHour);
		if (invalid) {
			return fail(400, { ...preserved, message: invalid });
		}

		const blocks = selectedToAvailability(selected, event.timezone);
		const existingId = cookies.get(participantCookie(event.id));

		try {
			const participantId = await db.transaction(async (tx) => {
				const existing = existingId
					? await tx.orm.public.Participant.where({
							id: existingId,
							eventId: event.id,
						}).first()
					: null;

				let id: string;

				if (existing) {
					await tx.orm.public.Participant.where({
						id: existing.id,
					}).update({ name });

					// The ORM's delete removes a single row for a non-unique filter;
					// a resubmission has to replace all of this participant's blocks.
					const deletePlan = tx.sql.public.Availability.delete()
						.where((f, fns) => fns.eq(f.participantId, existing.id))
						.build();
					await tx.execute(deletePlan);

					id = existing.id;
				} else {
					const created = await tx.orm.public.Participant.create({
						eventId: event.id,
						name,
					});
					id = created.id;
				}

				for (const block of blocks) {
					await tx.orm.public.Availability.create({
						eventId: event.id,
						participantId: id,
						startTime: block.startTime,
						endTime: block.endTime,
						status: block.status,
					});
				}

				return id;
			});

			cookies.set(participantCookie(event.id), participantId, {
				path: "/",
				httpOnly: true,
				sameSite: "lax",
				maxAge: PARTICIPANT_COOKIE_MAX_AGE,
				secure: url.protocol === "https:",
			});

			return { success: true };
		} catch (cause) {
			console.error("SAVE AVAILABILITY ERROR:", cause);
			return fail(500, {
				...preserved,
				message: "Could not save your availability. Please try again.",
			});
		}
	},
} satisfies Actions;
