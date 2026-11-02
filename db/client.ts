import { neon } from "@neondatabase/serverless";

// The single place where the backend opens the database connection.
// Next.js automatically loads .env.local, so DATABASE_URL is in process.env.
export const sql = neon(process.env.DATABASE_URL!);
