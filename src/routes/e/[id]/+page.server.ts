import { error } from "@sveltejs/kit";
import { db } from "../../../prisma/db";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	const id = params.id;

	const event = await db.orm.public.Event.where({ id }).first();

	if (!event) {
		throw error(404, { message: "Event not found" });
	}

	return {
		event: {
			...event,
			proposedDates: event.proposedDates.map((d) => d.toString()),
		},
	};
};
