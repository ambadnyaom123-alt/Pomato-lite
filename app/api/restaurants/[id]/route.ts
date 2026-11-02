import { NextResponse } from "next/server";
import { sql } from "@/db/client";

// GET /api/restaurants/[id] — the "hand over the menu" door.
// [id] is a slot in the URL: /1 and any other number hit this same code.
// The response is shaped like the screen, so the frontend has nothing
// left to figure out: no adding, no dividing, no sorting.

type Review = { id: number; rating: number; comment: string; createdAt: string };

// The shape of a review row as the database returns it:
type ReviewRow = { id: number; rating: number; comment: string; created_at: Date | string };

// The driver for the connection returns rows typed as vague "any shape" objects and
// production build (unlike dev) runs full type-checking, so the shape is spelled
// out here, field by field, exactly where vague data hands itself to our code.
function pullRow(row: Record<string, unknown> | undefined): ReviewRow {
  return {
    id: row?.id == null ? 0 : Number(row.id),
    rating: row?.rating == null ? 0 : Number(row.rating),
    comment: row?.comment == null ? "" : String(row.comment),
    created_at:
      row?.created_at instanceof Date ? row.created_at : new Date(String(row?.created_at)),
  };
}

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const restaurantId = Number((await params).id);

  // 404 if the restaurant does not exist.
  const [restaurant] = await sql.query("SELECT id, name, cuisine, area FROM restaurants WHERE id = $1", [
    restaurantId,
  ]);
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  // Computed answer 1 — AVG(rating), fresh, every time. Rounded to one decimal here in the backend.
  // The star row is also computed here (floor of the average), because the frontend does zero maths.
  const [stats] = await sql.query(
    "SELECT AVG(rating)::float AS average, FLOOR(AVG(rating))::int AS stars, COUNT(*)::int AS total FROM reviews WHERE restaurant_id = $1",
    [restaurantId]
  );
  const averageRating = stats.average === null ? null : Math.round(stats.average * 10) / 10;

  // Computed answer 2 — newest first, take one.
  const [latest] = await sql.query(
    "SELECT id, rating, comment, created_at FROM reviews WHERE restaurant_id = $1 ORDER BY created_at DESC LIMIT 1",
    [restaurantId]
  );

  // Every review except the latest, newest first — so the page never prints it twice.
  const older = await sql.query(
    "SELECT id, rating, comment, created_at FROM reviews WHERE restaurant_id = $1 ORDER BY created_at DESC OFFSET 1",
    [restaurantId]
  );

  // Empty-state decision, made out loud: with no reviews, AVG(rating) is NULL
  // and there is no "latest" — we return null, null, 0 and [] deliberately.
  // null means "nothing yet" (let the UI invite the first review), while 0 would
  // falsely imply "reviews exist and they averaged zero", which would be a lie.
  return NextResponse.json({
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    area: restaurant.area,
    averageRating,
    averageStars: stats.stars,
    totalReviews: stats.total,
    latestReview: latest ? toReview(pullRow(latest)) : null,
    reviews: older.map((row) => toReview(pullRow(row))),
  });
}
