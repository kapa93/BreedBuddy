/**
 * Seed script: inserts place-linked posts (posts.place_id) for existing seed authors.
 *
 * Usage:
 *   npm run seed:place-posts
 *   npm run seed:place-posts -- --env=prod
 *
 * Requirements:
 *   - Seed authors from seedPosts.ts must already exist (run seed:posts first)
 *   - Places must already exist in the places table
 *   - Migration 022_posts_place_id.sql must have been applied
 */

import dotenv from 'dotenv';
import path from 'path';

const envArg = process.argv.find(a => a.startsWith('--env='))?.split('=')[1] ?? 'dev';
const envFile = envArg === 'prod' ? '.env.production' : '.env.development';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
console.log(`Environment: ${envFile}`);

import { createClient } from '@supabase/supabase-js';
import seedData from './seedPlacePostsData.json';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ${envFile}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_EMAIL_SUFFIX = '@nuzzle.seed';

const BREED_MAP: Record<string, string> = {
  AUSTRALIAN_SHEPHERD: 'AUSTRALIAN_SHEPHERD',
  DACHSHUND: 'DACHSHUND',
  GERMAN_SHEPHERD: 'GERMAN_SHEPHERD',
  HUSKY: 'HUSKY',
  GOLDEN_DOODLE: 'GOLDEN_DOODLE',
  GOLDEN_RETRIEVER: 'GOLDEN_RETRIEVER',
  MIXED_BREED: 'MIXED_BREED',
  PUG: 'PUG',
  FRENCH_BULLDOG: 'FRENCH_BULLDOG',
  PIT_BULL: 'PIT_BULL',
  LABRADOR_RETRIEVER: 'LABRADOR_RETRIEVER',
  LABRADOODLE: 'LABRADOODLE',
};

const POST_TYPE_MAP: Record<string, string> = {
  story: 'UPDATE_STORY',
  question: 'QUESTION',
  tip: 'TIP',
  meetup: 'MEETUP',
};

function toEmail(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '.')}${SEED_EMAIL_SUFFIX}`;
}

async function main() {
  const posts = seedData.place_posts;

  // 1) Resolve unique place slugs → IDs
  const slugs = [...new Set(posts.map(p => p.place_slug))];
  console.log(`\n📍 Resolving ${slugs.length} place(s)...`);
  const placeIdBySlug = new Map<string, string>();

  for (const slug of slugs) {
    const { data, error } = await supabase
      .from('places')
      .select('id, name')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      console.error(`✗ Could not find place with slug "${slug}": ${error?.message ?? 'not found'}`);
    } else {
      placeIdBySlug.set(slug, data.id);
      console.log(`  ✓ ${data.name} → ${data.id}`);
    }
  }

  // 2) Resolve unique author names → profile IDs (via auth user email lookup)
  const authorNames = [...new Set(posts.map(p => p.author_name))];
  console.log(`\n👤 Resolving ${authorNames.length} author(s)...`);
  const authorIdByName = new Map<string, string>();

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error('Could not list users:', listError.message);
    process.exit(1);
  }

  for (const name of authorNames) {
    const email = toEmail(name);
    const user = listData.users.find(u => u.email === email);
    if (!user) {
      console.error(`  ✗ No seed user found for "${name}" (${email}) — run seed:posts first`);
    } else {
      authorIdByName.set(name, user.id);
      console.log(`  ✓ ${name} → ${user.id}`);
    }
  }

  // 3) Insert posts
  console.log('\n📝 Inserting place-linked posts...');
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of posts) {
    const placeId = placeIdBySlug.get(post.place_slug);
    const authorId = authorIdByName.get(post.author_name);

    if (!placeId) {
      console.warn(`  ⚠️ Skipping "${post.title}" — place not resolved`);
      skipped++;
      continue;
    }
    if (!authorId) {
      console.warn(`  ⚠️ Skipping "${post.title}" — author not resolved`);
      skipped++;
      continue;
    }

    const dbType = POST_TYPE_MAP[post.type];
    if (!dbType) {
      console.warn(`  ⚠️ Skipping "${post.title}" — unknown type "${post.type}"`);
      skipped++;
      continue;
    }

    const dbBreed = BREED_MAP[post.breed];
    if (!dbBreed) {
      console.warn(`  ⚠️ Skipping "${post.title}" — unknown breed "${post.breed}"`);
      skipped++;
      continue;
    }

    // Idempotency: skip if a post with same author + title already exists
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', authorId)
      .eq('title', post.title)
      .maybeSingle();

    if (existing) {
      console.log(`  ~ Skipping (exists): "${post.title}"`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from('posts').insert({
      author_id: authorId,
      breed: dbBreed,
      type: dbType,
      tag: post.tag,
      title: post.title,
      content_text: post.content_text,
      place_id: placeId,
    });

    if (error) {
      console.error(`  ✗ Failed "${post.title}": ${error.message}`);
      failed++;
    } else {
      console.log(`  + "${post.title}" @ ${post.place_slug}`);
      inserted++;
    }
  }

  console.log('\n✅ Done.');
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
