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

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const event = await db.orm.public.Event.where({ id: params.id }).first();

	if (!event) {
		throw error(404, { message: "Event not found" });
	}

	const dates = event.proposedDates.map((date) => date.toString());
	const user = locals.user;
	const colorParam = url.searchParams.get("color") ?? "";
	const color = /^#[0-9a-f]{6}$/i.test(colorParam) ? colorParam : "";

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

	// Identity is the account: at most one response per member per event.
	const mine = user ? participants.find((row) => row.userId === user.id) : null;
	const current = mine
		? (responses.find((response) => response.id === mine.id) ?? null)
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
	default: async ({ request, params, locals }) => {
		const user = locals.user;

		if (!user) {
			return fail(401, { message: "Sign in again to save your availability." });
		}

		const event = await db.orm.public.Event.where({ id: params.id }).first();

		if (!event) {
			return fail(404, { message: "This event no longer exists." });
		}

		const form = await request.formData();
		const selected = parseSelectedCells(form.get("selected"));

		if (!selected) {
			return fail(400, {
				message: "We couldn't read your time selection. Try marking it again.",
			});
		}
		if (Object.keys(selected).length === 0) {
			return fail(400, {
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
			return fail(400, { message: invalid });
		}

		const blocks = selectedToAvailability(selected, event.timezone);
		// Stored on the participant row so the responses list needs no join.
		const name = user.name;

		try {
			await db.transaction(async (tx) => {
				const existing = await tx.orm.public.Participant.where({
					eventId: event.id,
					userId: user.id,
				}).first();

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
						userId: user.id,
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

			return { success: true };
		} catch (cause) {
			console.error("SAVE AVAILABILITY ERROR:", cause);
			return fail(500, {
				message: "Could not save your availability. Please try again.",
			});
		}
	},
} satisfies Actions;
