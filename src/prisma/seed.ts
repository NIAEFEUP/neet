import "dotenv/config";
import { Temporal } from "temporal-polyfill";
import { db } from "./db.ts";

const TIMEZONE = "Europe/Lisbon";

/** Local-time instant on a plain date, e.g. `at(today, "14:00")`. */
function at(date: Temporal.PlainDate, time: string): Temporal.Instant {
	return date
		.toZonedDateTime({
			timeZone: TIMEZONE,
			plainTime: Temporal.PlainTime.from(time),
		})
		.toInstant();
}

async function main() {
	console.log("Seeding database... 🌱");

	// Forcefully wipe ALL tables intelligently using a dynamic Postgres query!
	// This automatically finds all your tables (even if you add new ones later)
	// and TRUNCATES them, while ignoring Prisma's internal state tables.
	const wipePlan = db.raw.sql`
    DO $$ 
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public' 
            AND tablename NOT LIKE 'prisma_%' 
            AND tablename != '_prisma_migrations'
        ) LOOP
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
    END $$;
  `
		.affectedCount()
		.build();

	await db.runtime().execute(wipePlan);
	console.log("Database wiped perfectly! 🧹");

	// Create some users
	const alice = await db.orm.public.User.create({
		name: "Alice Silva",
		email: "alice@niaefeup.pt",
	});

	const bob = await db.orm.public.User.create({
		name: "Bob Santos",
		email: "bob@niaefeup.pt",
	});

	// Create an event created by Alice
	const today = Temporal.Now.plainDateISO(TIMEZONE);
	const tomorrow = today.add({ days: 1 });
	const dayAfter = today.add({ days: 2 });

	const event = await db.orm.public.Event.create({
		title: "Reunião Geral NIAEFEUP",
		description: "Discussão sobre novos projetos, hackathons e atividades.",
		creatorId: alice.id,
		proposedDates: [today, tomorrow, dayAfter],
		timezone: TIMEZONE,
		startTime: "09:00",
		endTime: "18:00",
	});

	// Guests answer per event, without accounts.
	const aliceParticipant = await db.orm.public.Participant.create({
		eventId: event.id,
		name: alice.name,
	});

	const bobParticipant = await db.orm.public.Participant.create({
		eventId: event.id,
		name: bob.name,
	});

	// Alice is free in the afternoon, and can stretch to 17:00 if needed.
	await db.orm.public.Availability.create({
		eventId: event.id,
		participantId: aliceParticipant.id,
		startTime: at(today, "14:00"),
		endTime: at(today, "16:00"),
		status: "yes",
	});

	await db.orm.public.Availability.create({
		eventId: event.id,
		participantId: aliceParticipant.id,
		startTime: at(today, "16:00"),
		endTime: at(today, "17:00"),
		status: "if_need_be",
	});

	// Bob is free tomorrow morning.
	await db.orm.public.Availability.create({
		eventId: event.id,
		participantId: bobParticipant.id,
		startTime: at(tomorrow, "10:00"),
		endTime: at(tomorrow, "12:00"),
		status: "yes",
	});

	console.log("Database seeded successfully! 🎉");
	console.log(`Created Event: ${event.title} (${event.id})`);
}

main()
	.catch((e) => {
		console.error("Error seeding database:", e);
		process.exit(1);
	})
	.finally(() => {
		process.exit(0);
	});
