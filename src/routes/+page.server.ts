import { fail, redirect } from "@sveltejs/kit";
import { Temporal } from "temporal-polyfill";
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
		const startHourStr = data.get("startHour")?.toString().trim() || null;
		const startPeriodStr = data.get("startPeriod")?.toString().trim() || "AM";
		const endHourStr = data.get("endHour")?.toString().trim() || null;
		const endPeriodStr = data.get("endPeriod")?.toString().trim() || "AM";

		let startTimeStr: string | null = null;
		if (startHourStr) {
			let h = Number.parseInt(startHourStr, 10);
			if (startPeriodStr === "PM" && h < 12) h += 12;
			if (startPeriodStr === "AM" && h === 12) h = 0;
			startTimeStr = `${h.toString().padStart(2, "0")}:00`;
		}

		let endTimeStr: string | null = null;
		if (endHourStr) {
			let h = Number.parseInt(endHourStr, 10);
			if (endPeriodStr === "PM" && h < 12) h += 12;
			if (endPeriodStr === "AM" && h === 12) h = 0;
			endTimeStr = `${h.toString().padStart(2, "0")}:00`;
		}

		const formData = {
			title: titleStr,
			description: descriptionStr,
			startDate: startDateStr,
			endDate: endDateStr,
			startHour: startHourStr,
			startPeriod: startPeriodStr,
			endHour: endHourStr,
			endPeriod: endPeriodStr,
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

		if (
			(startTimeStr && !startTimeStr.endsWith(":00")) ||
			(endTimeStr && !endTimeStr.endsWith(":00"))
		) {
			return fail(400, {
				...formData,
				success: false,
				message: "Start and end times must be on the full hour (e.g. 09:00).",
			});
		}

		if (startTimeStr && endTimeStr && startTimeStr >= endTimeStr) {
			return fail(400, {
				...formData,
				success: false,
				message: "Daily start time must be before end time.",
			});
		}

		// Calculate array of proposed dates using Temporal API
		const proposedDates: Temporal.PlainDate[] = [];
		let currentDate = Temporal.PlainDate.from(startDateStr);
		const targetEndDate = Temporal.PlainDate.from(endDateStr);

		while (Temporal.PlainDate.compare(currentDate, targetEndDate) <= 0) {
			proposedDates.push(currentDate);
			currentDate = currentDate.add({ days: 1 });
		}

		let id = "";
		let success = false;
		let attempts = 0;

		try {
			while (!success && attempts < 5) {
				// We still use a small retry loop in case UUIDv7 generation collides on the same millisecond (extremely rare but good practice)
				try {
					const event = await db.orm.public.Event.create({
						title: titleStr,
						description: descriptionStr ? descriptionStr : null,
						timezone: timezoneStr,
						proposedDates,
						startTime: startTimeStr,
						endTime: endTimeStr,
					});
					id = event.id;
					success = true;
				} catch (e) {
					// Check for Prisma unique constraint violation
					// biome-ignore lint/suspicious/noExplicitAny: catching unknown error
					if (
						(e as any).code === "P2002" ||
						// biome-ignore lint/suspicious/noExplicitAny: catching unknown error
						(e as any).message?.includes("Unique constraint failed")
					) {
						attempts++;
					} else {
						throw e;
					}
				}
			}

			if (!success) {
				throw new Error("Failed to generate a unique event ID.");
			}
		} catch (e) {
			console.error("CREATE EVENT ERROR:", e);
			return fail(500, {
				...formData,
				success: false,
				message: "Failed to create event. Please try again.",
			});
		}

		redirect(303, `/e/${id}`);
	},
} satisfies Actions;
