/**
 * db:setup — creates the two tables from db/schema.sql, then seeds
 * one restaurant (Ludhiana Burrito) and three reviews spread across
 * the last week, so "latest review" is meaningfully newer than the rest.
 * Run with:  npm run db:setup
 * NOTE: this script drops and recreates the tables — it resets all data.
 */
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

// 1. Read the database password from .env.local (a plain text file on disk).
const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
const urlLine = env.split(/\r?\n/).find((line) => line.startsWith("DATABASE_URL="));
if (!urlLine) {
  throw new Error("DATABASE_URL not found in .env.local");
}
const databaseUrl = urlLine.slice(urlLine.indexOf("=") + 1).trim();

// 2. Connect to the Neon database.
const sql = neon(databaseUrl);
// Newer driver versions ask for sql.query(...) for plain statement calls.

// 3. Drop leftovers from any previous run, so the script is repeatable.
await sql.query("DROP TABLE IF EXISTS reviews");
await sql.query("DROP TABLE IF EXISTS restaurants");

// 4. Apply the schema file, statement by statement.
const schema = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
const statements = schema.split(";").map((s) => s.trim()).filter(Boolean);
for (const statement of statements) {
  await sql.query(statement);
}
console.log("Tables created.");

// 5. Seed the one restaurant we care about.
const [restaurant] = await sql.query(
  "INSERT INTO restaurants (name, cuisine, area) VALUES ($1, $2, $3) RETURNING id, name, cuisine, area",
  ["Ludhiana Burrito", "Indian", "Sector 32"]
);
console.log("Seeded restaurant:", restaurant);

// 6. Seed three reviews, days apart, so "latest" is a real concept.
const reviews = [
  { rating: 5, comment: "Paneer burrito is unreal", daysAgo: 8 },
  { rating: 4, comment: "Good, but slow service", daysAgo: 6 },
  { rating: 4, comment: "Solid. Would repeat.", daysAgo: 2 },
];
for (const { rating, comment, daysAgo } of reviews) {
  await sql.query(
    "INSERT INTO reviews (restaurant_id, rating, comment, created_at) VALUES ($1, $2, $3, NOW() - make_interval(days => $4))",
    [restaurant.id, rating, comment, daysAgo]
  );
}
console.log("Seeded 3 reviews.");

// 7. Show the rows that actually landed in cold storage.
console.log("\nrestaurants table:");
console.table(await sql.query("SELECT * FROM restaurants"));
console.log("\nreviews table:");
console.table(await sql.query("SELECT * FROM reviews ORDER BY created_at"));
console.log("\nDone. Facts stored. No averages anywhere.");
