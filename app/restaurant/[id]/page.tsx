import Link from "next/link";
import { headers } from "next/headers";

// The restaurant page — still a display layer. It calls GET /api/restaurants/[id]
// and prints what it receives. No adding, no dividing, no sorting anywhere.
// Star counts arrive from the backend (averageStars) or are facts (review.rating).

type Review = { id: number; rating: number; comment: string; createdAt: string };
type RestaurantResponse = {
  name: string;
  cuisine: string;
  area: string;
  averageRating: number | null;
  averageStars: number | null;
  totalReviews: number;
  latestReview: Review | null;
  reviews: Review[];
};

export const dynamic = "force-dynamic";

// Presentation: re-shaping a date string the API handed us. Not data calculation.
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Stars({ filled, light }: { filled: number; light?: boolean }) {
  return (
    <div className="flex gap-0.5 text-base">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= filled ? "text-[#F59E0B]" : light ? "text-white/30" : "text-neutral-200"}>
          ★
        </span>
      ))}
    </div>
  );
}

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
    <main>
      {/* 1 + 2. Photo hero, with the name and the big average floating over it */}
      <section className="relative h-80 w-full overflow-hidden sm:h-96">
        <img
          src="/hero-restaurant.jpg"
          alt="Dimly lit restaurant interior"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="animate-fade-up relative z-10 mx-auto flex h-full w-full max-w-[640px] flex-col justify-end px-5 pb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#F59E0B]">Restaurant</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{data.name}</h1>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-white/15 px-3.5 py-1 text-xs font-medium text-white">{data.cuisine}</span>
            <span className="rounded-full bg-white/15 px-3.5 py-1 text-xs font-medium text-white">{data.area}</span>
          </div>

          {data.totalReviews > 0 ? (
            <>
              <div className="mt-6 flex items-center gap-4">
                <span className="text-5xl font-extrabold tracking-tight text-[#F59E0B]">{data.averageRating}</span>
                <span className="rounded-full border border-[#F59E0B]/50 bg-[#F59E0B]/20 px-3.5 py-1.5 text-sm font-medium text-white">
                  {data.totalReviews} review{data.totalReviews === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-2 mb-1">
                <Stars filled={data.averageStars ?? 0} light />
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* Content column */}
      <div className="mx-auto w-full max-w-[640px] px-5 py-10">
        {data.totalReviews === 0 ? (
          // 6. Empty state — a warm invite for the first review.
          <section className="animate-fade-up overflow-hidden rounded-2xl border border-neutral-200 bg-white text-center">
            <img src="/hero-food.jpg" alt="A warm dish, served" className="h-44 w-full object-cover" />
            <div className="p-10">
              <p className="text-lg font-medium text-neutral-800">No reviews yet.</p>
              <p className="mt-1 text-sm text-neutral-500">Your words start this restaurant&apos;s story.</p>
              <Link
                href={`/review/${id}`}
                className="mt-6 inline-block rounded-full bg-[#B45309] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#93440A]"
              >
                Write the first review
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* 3. The latest review, highlighted as its own card */}
            <section className="animate-fade-up rounded-2xl border-2 border-[#F59E0B] bg-white p-5 shadow-sm" data-latest>
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#92400E]">
                  Latest
                </span>
                <span className="text-sm text-neutral-400">{formatDate(data.latestReview!.createdAt)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Stars filled={data.latestReview!.rating} />
                <span className="text-sm font-medium text-[#B45309]">{data.latestReview!.rating.toFixed(1)}</span>
              </div>
              <p className="mt-3 text-lg leading-snug text-neutral-900">“{data.latestReview!.comment}”</p>
            </section>

            {/* 4. Older reviews, each its own card — already sorted by the API */}
            <section className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">Earlier reviews</h2>
              <ul className="mt-4 space-y-4">
                {data.reviews.map((review, index) => (
                  <li
                    key={review.id}
                    className="animate-fade-up rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
                    style={{ animationDelay: `${0.08 + index * 0.06}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Stars filled={review.rating} />
                        <span className="text-sm font-medium text-[#B45309]">{review.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-sm text-neutral-400">{formatDate(review.createdAt)}</span>
                    </div>
                    <p className="mt-3 text-neutral-900">{review.comment}</p>
                  </li>
                ))}
              </ul>
            </section>

            {/* 5. Link to the review form */}
            <section className="mt-8 mb-4 flex justify-center">
              <Link
                href={`/review/${id}`}
                className="rounded-full bg-[#B45309] px-8 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#93440A]"
              >
                Write a review
              </Link>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
