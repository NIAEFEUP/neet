import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

export const db = postgres<Contract>({
	contractJson,
	// biome-ignore lint/style/noNonNullAssertion: DATABASE_URL is required at runtime
	url: process.env.DATABASE_URL!,
});
