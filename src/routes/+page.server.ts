import { fail, redirect } from "@sveltejs/kit";
import { db } from "../prisma/db";
import type { Actions } from "./$types";

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const title = data.get("title");
		const startDate = data.get("startDate");
		const endDate = data.get("endDate");
		const timezone = data.get("timezone");
		const description = data.get("description");

		if (!title || !startDate || !endDate || !timezone) {
			return fail(400, {
				success: false,
				message: "All required fields must be filled out.",
			});
		}

		if (new Date(startDate.toString()) > new Date(endDate.toString())) {
			return fail(400, {
				success: false,
				message: "Start date cannot be after end date.",
			});
		}

		let slug: string;
		try {
			// Generate a simple 8-character hex string for the URL
			slug = crypto.randomUUID().slice(0, 8);

			await db.orm.public.Event.create({
				title: title.toString(),
				description: description ? description.toString() : null,
				startDate: startDate.toString(),
				endDate: endDate.toString(),
				timezone: timezone.toString(),
				slug,
			});
		} catch {
			return fail(500, {
				success: false,
				message: "Failed to create event. Please try again.",
			});
		}

		redirect(303, `/e/${slug}`);
	},
} satisfies Actions;
