import "dotenv/config";
import { Temporal } from "temporal-polyfill";
import { db } from "./db.ts";

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
	const today = Temporal.Now.plainDateISO("Europe/Lisbon");
	const tomorrow = today.add({ days: 1 });

	const event = await db.orm.public.Event.create({
		title: "Reunião Geral NIAEFEUP",
		description: "Discussão sobre novos projetos, hackathons e atividades.",
		creatorId: alice.id,
		proposedDates: [today, tomorrow],
		timezone: "Europe/Lisbon",
	});

	// Add availability for Alice (she is free today 14:00 - 15:30)
	const aliceStart = today
		.toZonedDateTime({ timeZone: "Europe/Lisbon", plainTime: "14:00" })
		.toInstant();
	const aliceEnd = today
		.toZonedDateTime({ timeZone: "Europe/Lisbon", plainTime: "15:30" })
		.toInstant();

	await db.orm.public.Availability.create({
		eventId: event.id,
		userId: alice.id,
		startTime: aliceStart,
		endTime: aliceEnd,
	});

	// Add availability for Bob (he is free tomorrow 10:00 - 12:00)
	const bobStart = tomorrow
		.toZonedDateTime({ timeZone: "Europe/Lisbon", plainTime: "10:00" })
		.toInstant();
	const bobEnd = tomorrow
		.toZonedDateTime({ timeZone: "Europe/Lisbon", plainTime: "12:00" })
		.toInstant();

	await db.orm.public.Availability.create({
		eventId: event.id,
		userId: bob.id,
		startTime: bobStart,
		endTime: bobEnd,
	});

	console.log("Database seeded successfully! 🎉");
	console.log(`Created Event: ${event.title}`);
}

main()
	.catch((e) => {
		console.error("Error seeding database:", e);
		process.exit(1);
	})
	.finally(() => {
		process.exit(0);
	});
