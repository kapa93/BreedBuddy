/**
 * Seed script: creates auth users, profiles, dogs, posts, post_images,
 * and meetup_details from seedPostData_all.json.
 *
 * Usage:
 *   npm run seed:posts
 *   npm run seed:posts -- --reset
 *
 * Notes:
 * - Uses service role key
 * - Assumes auth.users -> handle_new_user trigger creates profiles rows
 * - Uses deterministic seed:// URLs for post_images
 */

import dotenv from 'dotenv';
import path from 'path';

const envArg = process.argv.find(a => a.startsWith('--env='))?.split('=')[1] ?? 'dev';
const envFile = envArg === 'prod' ? '.env.production' : '.env.development';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
console.log(`Environment: ${envFile}`);

import { createClient } from '@supabase/supabase-js';
import seedData from './seedPostData_all.json';

// ── Supabase admin client ─────────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ${envFile}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Mappings ──────────────────────────────────────────────────────────────────

const BREED_MAP: Record<string, string> = {
  'AUSTRALIAN SHEPHERD': 'AUSTRALIAN_SHEPHERD',
  'DACHSHUND': 'DACHSHUND',
  'GERMAN SHEPHERD': 'GERMAN_SHEPHERD',
  'HUSKY': 'HUSKY',
  'GOLDEN DOODLE': 'GOLDEN_DOODLE',
  'GOLDEN RETRIEVER': 'GOLDEN_RETRIEVER',
  'MIXED BREED': 'MIXED_BREED',
  'PUG': 'PUG',
  'FRENCH BULLDOG': 'FRENCH_BULLDOG',
  'PIT BULL': 'PIT_BULL',
  'LABRADOR RETRIEVER': 'LABRADOR_RETRIEVER',
  'LABRADOODLE': 'LABRADOODLE',
};

const POST_TYPE_MAP: Record<string, string> = {
  story: 'UPDATE_STORY',
  question: 'QUESTION',
  tip: 'TIP',
  meetup: 'MEETUP',
};

const SEED_EMAIL_SUFFIX = '@nuzzle.seed';
const SEED_PASSWORD = 'Nuzzle_Seed_2025!';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toEmail(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '.')}${SEED_EMAIL_SUFFIX}`;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function imageBriefToSeedUrl(imageBrief: string): string {
  return `seed://${slugify(imageBrief)}`;
}

function inferAgeGroup(posts: PostEntry[]): 'PUPPY' | 'ADULT' | 'SENIOR' {
  const text = posts
    .map(p => `${p.title}\n${p.contentText}`)
    .join('\n')
    .toLowerCase();

  if (/\b(14 weeks?|5 months?|4 months?|8 months?|9 months?|10 months?|11 months?|puppy)\b/.test(text)) {
    return 'PUPPY';
  }

  if (/\b(7 years?|8 years?|9 years?|senior|older dog|slowing down)\b/.test(text)) {
    return 'SENIOR';
  }

  return 'ADULT';
}

function inferEnergyLevel(breed: string): 'LOW' | 'MED' | 'HIGH' {
  switch (breed) {
    case 'AUSTRALIAN_SHEPHERD':
    case 'GERMAN_SHEPHERD':
    case 'HUSKY':
    case 'PIT_BULL':
    case 'LABRADOR_RETRIEVER':
    case 'LABRADOODLE':
    case 'GOLDEN_DOODLE':
      return 'HIGH';
    case 'PUG':
    case 'FRENCH_BULLDOG':
      return 'LOW';
    default:
      return 'MED';
  }
}

function extractMeetupLocation(title: string, contentText: string): string {
  const combined = `${title} ${contentText}`;

  const knownLocations = [
    'OB Dog Beach',
    'Dog Beach',
    'Fiesta Island',
    'Grape Street Dog Park',
    'Morley Field',
    'Balboa Park',
    'Sunset Cliffs',
    'Mission Bay',
    'Mission Trails',
    'Lake Murray',
    'Los Peñasquitos Canyon',
    'Coronado Dog Beach',
    'Coronado',
    'North Park',
    'South Park',
    'Mission Bay',
  ];

  for (const location of knownLocations) {
    if (combined.toLowerCase().includes(location.toLowerCase())) {
      return location;
    }
  }

  const atMatch = title.match(/\bat\s+(.+?)(?:\s*[–—-]|\s+\b(?:saturday|sunday|tuesday|thursday|morning|evening)\b|$)/i);
  if (atMatch?.[1]) return atMatch[1].trim();

  return 'San Diego';
}

function extractMeetupKind(title: string, contentText: string): 'playdate' | 'walk' | 'beach' | 'other' {
  const text = `${title} ${contentText}`.toLowerCase();

  if (text.includes('beach')) return 'beach';
  if (text.includes('walk')) return 'walk';
  if (text.includes('playdate')) return 'playdate';
  return 'other';
}

function inferMeetupStart(title: string, contentText: string): Date {
  const text = `${title} ${contentText}`.toLowerCase();
  const now = new Date();

  const target = new Date(now);
  const dayOffsets: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  let targetDay = 6; // default Saturday
  for (const [day, num] of Object.entries(dayOffsets)) {
    if (text.includes(day)) {
      targetDay = num;
      break;
    }
  }

  const offset = (targetDay - now.getDay() + 7) % 7 || 7;
  target.setDate(now.getDate() + offset);

  let hour = 9;
  let minute = 0;

  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridiem = timeMatch[3];
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  } else if (text.includes('evening')) {
    hour = 18;
  } else if (text.includes('morning')) {
    hour = 8;
  }

  target.setHours(hour, minute, 0, 0);
  return target;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeedAuthor {
  author_name: string;
  dog_name: string;
}

interface SeedPost {
  author_name: string;
  dog_name: string;
  type: string;
  tag: string;
  title: string;
  content_text: string;
  has_images: boolean;
  image_briefs?: string[];
}

interface SeedBreedGroup {
  breed: string;
  authors: SeedAuthor[];
  posts: SeedPost[];
}

interface SeedData {
  breeds: SeedBreedGroup[];
}

interface AuthorInfo {
  name: string;
  dogName: string;
  breed: string;
}

interface PostEntry {
  authorName: string;
  dogName: string;
  breed: string;
  type: string;
  tag: string;
  title: string;
  contentText: string;
  hasImages: boolean;
  imageBriefs: string[];
}

// ── Reset ─────────────────────────────────────────────────────────────────────

async function resetSeedData() {
  console.log('\n⚠️ Resetting seeded auth users and dependent data...');

  const data = seedData as SeedData;
  const emails = new Set<string>();

  for (const breedGroup of data.breeds) {
    for (const author of breedGroup.authors) {
      emails.add(toEmail(author.author_name));
    }
  }

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error('Could not list users:', listError.message);
    return;
  }

  const seededUsers = listData.users.filter(u => u.email && emails.has(u.email));
  console.log(`Deleting ${seededUsers.length} seeded auth users...`);

  for (const user of seededUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`✗ Could not delete ${user.email}: ${error.message}`);
    }
  }

  // Wipe seed/ folder in post-images storage bucket
  console.log('Clearing seed/ folder in post-images storage...');
  let storageDeleted = 0;
  let storageCursor: string | undefined;

  do {
    const { data: listed, error: listErr } = await supabase.storage
      .from('post-images')
      .list('seed', { limit: 100, offset: storageCursor ? parseInt(storageCursor) : 0 });

    if (listErr) {
      console.error('  ✗ Could not list storage:', listErr.message);
      break;
    }
    if (!listed || listed.length === 0) break;

    // Each item in seed/ is a folder named by post UUID — recurse one level
    for (const folder of listed) {
      const { data: files, error: filesErr } = await supabase.storage
        .from('post-images')
        .list(`seed/${folder.name}`);

      if (filesErr || !files?.length) continue;

      const paths = files.map(f => `seed/${folder.name}/${f.name}`);
      const { error: removeErr } = await supabase.storage.from('post-images').remove(paths);
      if (removeErr) {
        console.error(`  ✗ Could not remove files in seed/${folder.name}: ${removeErr.message}`);
      } else {
        storageDeleted += paths.length;
      }
    }

    storageCursor = listed.length === 100 ? String((parseInt(storageCursor ?? '0')) + 100) : undefined;
  } while (storageCursor);

  console.log(`  Deleted ${storageDeleted} storage file(s).`);
  console.log('Reset complete.\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const doReset = process.argv.includes('--reset') || process.argv.includes('--wipe-only');
  if (doReset) await resetSeedData();

  if (process.argv.includes('--wipe-only')) {
    console.log('Wipe complete. Exiting without re-seeding.');
    return;
  }

  const data = seedData as SeedData;

  // 1) Build author map + flattened posts
  const authorMap = new Map<string, AuthorInfo>();
  const allPosts: PostEntry[] = [];

  for (const breedGroup of data.breeds) {
    const dbBreed = BREED_MAP[breedGroup.breed];
    if (!dbBreed) {
      console.warn(`⚠️ Unknown breed in JSON: "${breedGroup.breed}" — skipping`);
      continue;
    }

    for (const author of breedGroup.authors) {
      if (!authorMap.has(author.author_name)) {
        authorMap.set(author.author_name, {
          name: author.author_name,
          dogName: author.dog_name,
          breed: dbBreed,
        });
      }
    }

    for (const post of breedGroup.posts) {
      allPosts.push({
        authorName: post.author_name,
        dogName: post.dog_name,
        breed: dbBreed,
        type: post.type,
        tag: post.tag,
        title: post.title,
        contentText: post.content_text,
        hasImages: post.has_images,
        imageBriefs: post.image_briefs ?? [],
      });
    }
  }

  console.log('\n📋 Seed summary');
  console.log(`Authors: ${authorMap.size}`);
  console.log(`Posts:   ${allPosts.length}`);

  // 2) Create / resolve auth users
  console.log('\n👤 Creating auth users...');
  const authorIdMap = new Map<string, string>();

  for (const [name] of authorMap) {
    const email = toEmail(name);

    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { name },
    });

    if (!error && created?.user?.id) {
      authorIdMap.set(name, created.user.id);
      console.log(`+ Created: ${name}`);
      continue;
    }

    if (
      error &&
      (error.message.toLowerCase().includes('already been registered') ||
        error.message.toLowerCase().includes('already exists'))
    ) {
      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) {
        console.error(`✗ Could not list users while resolving ${name}: ${listErr.message}`);
        continue;
      }

      const existing = listData.users.find(u => u.email === email);
      if (!existing) {
        console.error(`✗ Could not resolve existing user for ${name}`);
        continue;
      }

      authorIdMap.set(name, existing.id);
      console.log(`~ Exists: ${name}`);
      continue;
    }

    console.error(`✗ Error creating ${name}: ${error?.message}`);
  }

  // 3) Wait for trigger, then verify profiles exist
  await sleep(1500);

  console.log('\n🪪 Verifying profiles...');
  const missingProfiles: string[] = [];

  for (const [name, userId] of authorIdMap) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile) {
      missingProfiles.push(name);
      console.error(`✗ Missing profile for ${name}`);
    }
  }

  if (missingProfiles.length > 0) {
    console.error('\nAborting because some profiles were not created by handle_new_user:');
    for (const name of missingProfiles) console.error(`- ${name}`);
    process.exit(1);
  }

  // 4) Create dogs
  console.log('\n🐕 Creating dogs...');

  for (const [name, info] of authorMap) {
    const ownerId = authorIdMap.get(name);
    if (!ownerId) continue;

    const authorPosts = allPosts.filter(p => p.authorName === name);
    const ageGroup = inferAgeGroup(authorPosts);
    const energyLevel = inferEnergyLevel(info.breed);

    const { data: existingDog } = await supabase
      .from('dogs')
      .select('id')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (existingDog) {
      console.log(`~ Dog exists for ${name}`);
      continue;
    }

    const { error } = await supabase.from('dogs').insert({
      owner_id: ownerId,
      name: info.dogName,
      breed: info.breed,
      age_group: ageGroup,
      energy_level: energyLevel,
    });

    if (error) {
      console.error(`✗ Dog insert failed for ${name}: ${error.message}`);
    } else {
      console.log(`+ Dog: ${info.dogName} (${info.breed}, ${ageGroup}, ${energyLevel})`);
    }
  }

  // 5) Insert posts + images + meetup_details
  console.log('\n📝 Inserting posts...');
  let insertedPosts = 0;
  let insertedImages = 0;
  let insertedMeetups = 0;
  let skippedPosts = 0;
  let failedPosts = 0;

  for (const post of allPosts) {
    const authorId = authorIdMap.get(post.authorName);
    if (!authorId) {
      console.warn(`⚠️ No UUID for author "${post.authorName}" — skipping: ${post.title}`);
      skippedPosts++;
      continue;
    }

    const dbType = POST_TYPE_MAP[post.type];
    if (!dbType) {
      console.warn(`⚠️ Unknown post type "${post.type}" — skipping: ${post.title}`);
      skippedPosts++;
      continue;
    }

    // Duplicate check
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', authorId)
      .eq('title', post.title)
      .maybeSingle();

    let postId: string | null = existingPost?.id ?? null;

    if (!postId) {
      const { data: insertedPost, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: authorId,
          breed: post.breed,
          type: dbType,
          tag: post.tag,
          title: post.title,
          content_text: post.contentText,
        })
        .select('id')
        .single();

      if (postError || !insertedPost) {
        console.error(`✗ Post insert failed "${post.title}": ${postError?.message}`);
        failedPosts++;
        continue;
      }

      postId = insertedPost.id;
      insertedPosts++;
    } else {
      skippedPosts++;
    }

    // post_images are skipped — seed:// placeholder URLs are not loadable by the app

    // Insert meetup_details idempotently
    if (dbType === 'MEETUP' && postId) {
      const { data: existingMeetup } = await supabase
        .from('meetup_details')
        .select('post_id')
        .eq('post_id', postId)
        .maybeSingle();

      if (!existingMeetup) {
        const start = inferMeetupStart(post.title, post.contentText);
        const end = new Date(start);
        end.setHours(end.getHours() + 2);

        const locationName = extractMeetupLocation(post.title, post.contentText);
        const meetupKind = extractMeetupKind(post.title, post.contentText);

        const { error: meetupError } = await supabase.from('meetup_details').insert({
          post_id: postId,
          location_name: locationName,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          meetup_kind: meetupKind,
          is_recurring_seeded: true,
        });

        if (meetupError) {
          console.error(`✗ meetup_details insert failed for "${post.title}": ${meetupError.message}`);
        } else {
          insertedMeetups++;
        }
      }
    }
  }

  console.log('\n✅ Done.');
  console.log(`Posts inserted:    ${insertedPosts}`);
  console.log(`Posts skipped:     ${skippedPosts}`);
  console.log(`Posts failed:      ${failedPosts}`);
  console.log(`Images inserted:   ${insertedImages}`);
  console.log(`Meetups inserted:  ${insertedMeetups}`);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});