"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// The write-a-review screen. It picks up only what the user touched —
// stars and words — hands it to POST /api/reviews, and steps back.
// It never computes anything about the restaurant; it fetches the name like everyone else.

export default function WriteReviewPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const router = useRouter();

  const [name, setName] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/restaurants/${restaurantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setName(data.name);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const canSubmit = rating !== null && comment.trim() !== "" && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: Number(restaurantId), rating, comment }),
    });

    if (res.ok) {
      router.push(`/restaurant/${restaurantId}`);
      return;
    }

    // 400: show exactly what the backend said. Do not invent a friendlier message.
    const data = await res.json();
    setError(data.error);
    setSubmitting(false);
  }

  return (
    <main className="mx-auto w-full max-w-[560px] px-6 py-12">
      <header>
        <p className="text-sm text-neutral-500">Write a review</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{name ?? "Loading…"}</h1>
      </header>

      <form onSubmit={handleSubmit} className="mt-10">
        <fieldset>
          <legend className="text-sm font-medium">Your rating</legend>
          <div className="mt-3 flex gap-1 text-4xl leading-none">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star`}
                onClick={() => setRating(star)}
                className={
                  rating !== null && rating >= star
                    ? "text-[#B45309] transition-colors"
                    : "text-neutral-300 transition-colors hover:text-neutral-500"
                }
              >
                ★
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-8">
          <label htmlFor="comment" className="text-sm font-medium">
            Your review
          </label>
          <textarea
            id="comment"
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What stood out?"
            className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition-colors focus:border-[#B45309]"
          />
        </div>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-8 w-full rounded-md bg-[#B45309] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#93440A] disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </form>
    </main>
  );
}
