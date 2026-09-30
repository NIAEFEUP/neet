import { error } from "@sveltejs/kit";
import { db } from "../../../prisma/db";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;

	const event = await db.orm.public.Event.where({ slug }).first();

	if (!event) {
		throw error(404, { message: "Event not found" });
	}

	return {
		event,
	};
};
