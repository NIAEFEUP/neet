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
		const startTimeStr = data.get("startTime")?.toString().trim() || null;
		const endTimeStr = data.get("endTime")?.toString().trim() || null;

		const formData = {
			title: titleStr,
			description: descriptionStr,
			startDate: startDateStr,
			endDate: endDateStr,
			startTime: startTimeStr,
			endTime: endTimeStr,
			timezone: timezoneStr,
		};

		if (!titleStr || !startDateStr || !endDateStr || !timezoneStr) {
			return fail(400, {
				...formData,
				success: false,
				message: "All required fields must be filled out.",
			});
		}

		if (!Intl.supportedValuesOf("timeZone").includes(timezoneStr)) {
			return fail(400, {
				...formData,
				success: false,
				message: "Invalid timezone selected.",
			});
		}

		const start = new Date(startDateStr);
		const end = new Date(endDateStr);

		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
			return fail(400, {
				...formData,
				success: false,
				message: "Invalid date format.",
			});
		}

		if (start > end) {
			return fail(400, {
				...formData,
				success: false,
				message: "Start date cannot be after end date.",
			});
		}

		const daysDifference =
			(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
		if (daysDifference > 30) {
			return fail(400, {
				...formData,
				success: false,
				message: "Events cannot be longer than 30 days.",
			});
		}

		if ((startTimeStr && !endTimeStr) || (!startTimeStr && endTimeStr)) {
			return fail(400, {
				...formData,
				success: false,
				message:
					"Both start time and end time must be provided if limiting daily hours.",
			});
		}

		if (startTimeStr && endTimeStr && startTimeStr >= endTimeStr) {
			return fail(400, {
				...formData,
				success: false,
				message: "Daily start time must be before end time.",
			});
		}

		let slug = "";
		let success = false;
		let attempts = 0;

		try {
			while (!success && attempts < 5) {
				slug = crypto.randomUUID().slice(0, 8);
				try {
					await db.orm.public.Event.create({
						title: titleStr,
						description: descriptionStr ? descriptionStr : null,
						startDate: startDateStr,
						endDate: endDateStr,
						startTime: startTimeStr,
						endTime: endTimeStr,
						timezone: timezoneStr,
						slug,
					});
					success = true;
				} catch (e) {
					// Check for Prisma unique constraint violation (P2002)
					// biome-ignore lint/suspicious/noExplicitAny: catching unknown error
					if (
						(e as any).code === "P2002" ||
						// biome-ignore lint/suspicious/noExplicitAny: catching unknown error
						(e as any).message?.includes("Unique constraint failed")
					) {
						attempts++;
					} else {
						throw e; // throw other errors to be caught by outer catch
					}
				}
			}

			if (!success) {
				throw new Error("Failed to generate a unique slug.");
			}
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
