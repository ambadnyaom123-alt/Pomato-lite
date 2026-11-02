import Link from "next/link";
import { headers } from "next/headers";

// The restaurant page — a display layer. It calls GET /api/restaurants/[id]
// and prints what it receives. No adding, no dividing, no sorting anywhere.
// (The only string handling is slicing a date for display — presentation, not calculation.)

type Review = { id: number; rating: number; comment: string; createdAt: string };
type RestaurantResponse = {
  name: string;
  cuisine: string;
  area: string;
  averageRating: number | null;
  totalReviews: number;
  latestReview: Review | null;
  reviews: Review[];
};

export const dynamic = "force-dynamic";

export default async function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Find our own address at runtime — works on localhost AND on Vercel.
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  const res = await fetch(`http://${host}/api/restaurants/${id}`, {
    headers: { "x-forwarded-proto": protocol },
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[560px] px-6 py-16">
        <p className="text-lg">Restaurant not found.</p>
        <p className="mt-2 text-sm text-neutral-500">Wrong door, or the id does not exist.</p>
      </main>
    );
  }

  const data: RestaurantResponse = await res.json();

  return (
    <main className="mx-auto w-full max-w-[560px] px-6 py-12">
      {/* 1. Restaurant name */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {data.cuisine} · {data.area}
        </p>
      </header>

      {data.totalReviews === 0 ? (
        // 6. Empty state — invite the first review.
        <section className="mt-16 rounded-lg border border-neutral-200 p-10 text-center">
          <p className="text-neutral-700">No reviews yet.</p>
          <p className="mt-1 text-sm text-neutral-500">Your review starts the story.</p>
          <Link
            href={`/review/${id}`}
            className="mt-6 inline-block rounded-md bg-[#B45309] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#93440A]"
          >
            Write the first review
          </Link>
        </section>
      ) : (
        <>
          {/* 2. The average — the biggest thing on the page. Printed, not computed. */}
          <section className="mt-10 flex items-end gap-4">
            <span className="text-6xl font-semibold tracking-tight">{data.averageRating}</span>
            <div className="pb-2 text-sm text-neutral-500">
              <p>{data.averageRating} / 5</p>
              <p>
                {data.totalReviews} review{data.totalReviews === 1 ? "" : "s"}
              </p>
            </div>
          </section>

          {/* 3. The latest review — highlighted, sitting apart from the rest. */}
          <section className="mt-10 rounded-lg border border-[#EAD9C2] bg-[#FBF5EC] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#B45309]">Latest review</p>
            <p className="mt-3 text-lg leading-snug">“{data.latestReview!.comment}”</p>
            <p className="mt-3 text-sm text-neutral-500">
              {data.latestReview!.rating} / 5 · {data.latestReview!.createdAt.slice(0, 10)}
            </p>
          </section>

          {/* 4. Older reviews, plain list — already sorted by the API. */}
          <section className="mt-10">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">All reviews</h2>
            <ul className="mt-4 divide-y divide-neutral-200">
              {data.reviews.map((review) => (
                <li key={review.id} className="py-4">
                  <p>{review.comment}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {review.rating} / 5 · {review.createdAt.slice(0, 10)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* 5. Link to the review form. */}
          <section className="mt-10 mb-4">
            <Link
              href={`/review/${id}`}
              className="inline-block rounded-md bg-[#B45309] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#93440A]"
            >
              Write a review
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
