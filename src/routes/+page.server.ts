import { fail, redirect } from "@sveltejs/kit";
import { db } from "../prisma/db";
import type { Actions } from "./$types";

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const titleStr = data.get("title")?.toString().trim() ?? "";
		const startDateStr = data.get("startDate")?.toString().trim() ?? "";
		const endDateStr = data.get("endDate")?.toString().trim() ?? "";
		const timezoneStr = data.get("timezone")?.toString().trim() ?? "";
		const descriptionStr = data.get("description")?.toString().trim() ?? "";

		const formData = {
			title: titleStr,
			description: descriptionStr,
			startDate: startDateStr,
			endDate: endDateStr,
			timezone: timezoneStr,
		};

		if (!titleStr || !startDateStr || !endDateStr || !timezoneStr) {
			return fail(400, {
				...formData,
				success: false,
				message: "All required fields must be filled out.",
			});
		}

		if (new Date(startDateStr) > new Date(endDateStr)) {
			return fail(400, {
				...formData,
				success: false,
				message: "Start date cannot be after end date.",
			});
		}

		let slug: string;
		try {
			// Generate a simple 8-character hex string for the URL
			slug = crypto.randomUUID().slice(0, 8);

			await db.orm.public.Event.create({
				title: titleStr,
				description: descriptionStr ? descriptionStr : null,
				startDate: startDateStr,
				endDate: endDateStr,
				timezone: timezoneStr,
				slug,
			});
		} catch {
			return fail(500, {
				...formData,
				success: false,
				message: "Failed to create event. Please try again.",
			});
		}

		redirect(303, `/e/${slug}`);
	},
} satisfies Actions;
