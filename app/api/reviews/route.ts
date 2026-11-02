import { NextResponse } from "next/server";
import { sql } from "@/db/client";

// POST /api/reviews — the "take an order" door.
// The waiter (backend) checks the order before the kitchen (database) accepts it.
// The frontend cannot be trusted: anyone can call this API with a terminal.

export async function POST(request: Request) {
  let body: { restaurantId?: unknown; rating?: unknown; comment?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  // Check 1 — rating must be a whole number between 1 and 5.
  if (typeof body.rating !== "number" || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Rating must be a whole number between 1 and 5." }, { status: 400 });
  }

  // Check 2 — comment must be real text once surrounding spaces are removed.
  if (typeof body.comment !== "string" || body.comment.trim() === "") {
    return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
  }

  // Check 3 — restaurantId must point at a restaurant that actually exists.
  // This is the database lookup the other two checks don't need.
  if (typeof body.restaurantId !== "number" || !Number.isInteger(body.restaurantId)) {
    return NextResponse.json({ error: "This restaurant does not exist." }, { status: 400 });
  }
  const [restaurant] = await sql.query("SELECT id FROM restaurants WHERE id = $1", [body.restaurantId]);
  if (!restaurant) {
    return NextResponse.json({ error: "This restaurant does not exist." }, { status: 400 });
  }

  // Every check passed. Write exactly one row. Nothing else in the database changes.
  const [inserted] = await sql.query(
    "INSERT INTO reviews (restaurant_id, rating, comment) VALUES ($1, $2, $3) RETURNING id",
    [body.restaurantId, body.rating, body.comment.trim()]
  );

  return NextResponse.json({ success: true, reviewId: inserted.id }, { status: 201 });
}
