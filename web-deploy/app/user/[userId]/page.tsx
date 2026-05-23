import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

const SITE_ORIGIN = "https://www.nuzzleapp.io";
const APP_STORE_URL = "https://apps.apple.com/app/idREPLACE_APP_STORE_ID";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.kapa.nuzzledev";

type PageProps = {
  params: Promise<{ userId: string }>;
};

type ProfileRow = {
  id: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
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

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, bio, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("Failed to fetch profile", error);
    return null;
  }
  return data as ProfileRow | null;
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const profile = await fetchProfile(userId);

  const name = profile?.name ?? "A Nuzzle member";
  const title = `${name} on Nuzzle`;
  const description = profile?.bio
    ? truncate(profile.bio, 200)
    : `${name} is on Nuzzle — the social home for dog people.`;
  const image = profile?.avatar_url ?? `${SITE_ORIGIN}/og-default.png`;
  const url = `${SITE_ORIGIN}/user/${userId}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
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

export default async function UserPage({ params }: PageProps) {
  const { userId } = await params;
  const profile = await fetchProfile(userId);
  if (!profile) notFound();

  const name = profile.name ?? "A Nuzzle member";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={name}
            className="h-24 w-24 rounded-full border border-neutral-200 object-cover"
          />
        ) : null}
        <h1 className="text-3xl font-semibold leading-tight">{name}</h1>
        {profile.bio ? (
          <p className="max-w-md text-base text-neutral-700">{profile.bio}</p>
        ) : null}
      </header>

      <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
        <h2 className="text-lg font-semibold">See {name} in Nuzzle</h2>
        <p className="text-sm text-neutral-600">
          Posts, dogs, and meetups are all in the app.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={`nuzzle://user/${userId}`}
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
