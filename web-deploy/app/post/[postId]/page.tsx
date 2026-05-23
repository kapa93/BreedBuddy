import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

const SITE_ORIGIN = "https://www.nuzzleapp.io";
const APP_STORE_URL = "https://apps.apple.com/app/idREPLACE_APP_STORE_ID";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.kapa.nuzzledev";

type PageProps = {
  params: Promise<{ postId: string }>;
};

type PostRow = {
  id: string;
  title: string | null;
  content_text: string | null;
  type: string;
  created_at: string;
  profiles: { id: string; name: string | null } | null;
  post_images: { image_url: string; sort_order: number }[] | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createClient(url, anonKey);
}

async function fetchPost(postId: string): Promise<PostRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("posts")
    .select(
      `id, title, content_text, type, created_at,
       profiles:author_id (id, name),
       post_images (image_url, sort_order)`
    )
    .eq("id", postId)
    .maybeSingle();
  if (error) {
    console.error("Failed to fetch post", error);
    return null;
  }
  return data as unknown as PostRow | null;
}

function firstImage(post: PostRow | null): string | null {
  if (!post?.post_images?.length) return null;
  const sorted = [...post.post_images].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  return sorted[0]?.image_url ?? null;
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { postId } = await params;
  const post = await fetchPost(postId);

  const authorName = post?.profiles?.name ?? "A Nuzzle member";
  const rawTitle = post?.title?.trim() || post?.content_text?.trim() || "";
  const title = rawTitle
    ? `${truncate(rawTitle, 80)} – Nuzzle`
    : `${authorName} on Nuzzle`;
  const description = post?.content_text
    ? truncate(post.content_text, 200)
    : "Join the dog community on Nuzzle — breed communities, local meetups, and neighborhood dog spots.";
  const image = firstImage(post) ?? `${SITE_ORIGIN}/og-default.png`;
  const url = `${SITE_ORIGIN}/post/${postId}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "Nuzzle",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { postId } = await params;
  const post = await fetchPost(postId);
  if (!post) notFound();

  const authorName = post.profiles?.name ?? "A Nuzzle member";
  const heroImage = firstImage(post);
  const body =
    post.content_text ?? post.title ?? "Open the post in the Nuzzle app.";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wide text-neutral-500">
          {post.type === "MEETUP" ? "Meetup" : "Post"} on Nuzzle
        </p>
        {post.title ? (
          <h1 className="text-3xl font-semibold leading-tight">{post.title}</h1>
        ) : null}
        <p className="text-sm text-neutral-600">by {authorName}</p>
      </header>

      {heroImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImage}
          alt={post.title ?? "Post image"}
          className="w-full rounded-2xl border border-neutral-200"
        />
      ) : null}

      <article className="whitespace-pre-wrap text-base leading-relaxed text-neutral-800">
        {body}
      </article>

      <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
        <h2 className="text-lg font-semibold">Read this post in the Nuzzle app</h2>
        <p className="text-sm text-neutral-600">
          The full conversation, reactions, and meetup RSVPs live in the app.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={`nuzzle://post/${postId}`}
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
          >
            Open in Nuzzle
          </a>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-900"
          >
            Get it on the App Store
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-900"
          >
            Get it on Google Play
          </a>
        </div>
      </section>
    </main>
  );
}
