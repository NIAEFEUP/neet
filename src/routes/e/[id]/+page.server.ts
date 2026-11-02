import { error, fail } from "@sveltejs/kit";
import {
	availabilityToSelected,
	parseSelectedCells,
	selectedToAvailability,
	validateSelectedCells,
} from "$lib/components/time-grid/availability";
import { hoursBetween, parseHour } from "$lib/components/time-grid/date-utils";
import { db } from "../../../prisma/db";
import type { Actions, PageServerLoad } from "./$types";

const PARTICIPANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** One cookie per event, so a guest can answer several events separately. */
function participantCookie(eventId: string): string {
	return `neet_participant_${eventId}`;
}

export const load: PageServerLoad = async ({ params, cookies }) => {
	const event = await db.orm.public.Event.where({ id: params.id }).first();

	if (!event) {
		throw error(404, { message: "Event not found" });
	}

	const dates = event.proposedDates.map((date) => date.toString());
	const cookieId = cookies.get(participantCookie(event.id));

	let participant: {
		name: string;
		modality: string;
		selected: ReturnType<typeof availabilityToSelected>;
	} | null = null;

	if (cookieId) {
		const row = await db.orm.public.Participant.where({
			id: cookieId,
			eventId: event.id,
		}).first();

		if (row) {
			const blocks = await db.orm.public.Availability.where({
				participantId: row.id,
				eventId: event.id,
			}).all();

			participant = {
				name: row.name,
				modality: row.modality,
				selected: availabilityToSelected(blocks, event.timezone),
			};
		}
	}

	return {
		event: {
			id: event.id,
			title: event.title,
			description: event.description,
			timezone: event.timezone,
			proposedDates: dates,
			startTime: event.startTime,
			endTime: event.endTime,
		},
		participant,
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
		const modality = String(form.get("modality") ?? "");
		const selected = parseSelectedCells(form.get("selected"));

		const preserved = { name, modality };

		if (!name) {
			return fail(400, { ...preserved, message: "Add your name first." });
		}
		if (name.length > 80) {
			return fail(400, {
				...preserved,
				message: "That name is too long (80 characters max).",
			});
		}
		if (modality !== "in_person" && modality !== "online") {
			return fail(400, {
				...preserved,
				message: "Choose whether you'd join online or in person.",
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
					}).update({ name, modality });

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
						modality,
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
