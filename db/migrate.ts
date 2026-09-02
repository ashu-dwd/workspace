import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./db";

async function main() {
  console.log("Running database migrations...");
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Database migrations completed successfully!");
  } catch (error) {
    console.error("Database migration failed:", error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
