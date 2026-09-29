import "dotenv/config";
import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      // biome-ignore lint/style/noNonNullAssertion: DATABASE_URL is required at runtime
      connection: process.env.DATABASE_URL!,
    },
  }),
});
