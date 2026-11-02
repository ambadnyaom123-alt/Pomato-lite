import { NextResponse } from "next/server";
import { sql } from "@/db/client";

// GET /api/restaurants/[id] — the "hand over the menu" door.
// [id] is a slot in the URL: /1 and any other number hit this same code.
// The response is shaped like the screen, so the frontend has nothing
// left to figure out: no adding, no dividing, no sorting.

type Review = { id: number; rating: number; comment: string; createdAt: string };

function toReview(review: { id: number; rating: number; comment: string; created_at: Date | string }): Review {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt:
      review.created_at instanceof Date ? review.created_at.toISOString() : new Date(review.created_at).toISOString(),
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
  const [stats] = await sql.query(
    "SELECT AVG(rating)::float AS average, COUNT(*)::int AS total FROM reviews WHERE restaurant_id = $1",
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
    totalReviews: stats.total,
    latestReview: latest ? toReview(latest) : null,
    reviews: older.map(toReview),
  });
}
