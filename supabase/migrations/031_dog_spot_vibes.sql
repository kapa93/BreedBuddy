-- ── Dog Spot Vibe Options ────────────────────────────────────────────────────
-- Canonical list of vibe tags that can be applied to any dog spot.

create table dog_spot_vibe_options (
  id         uuid        primary key default gen_random_uuid(),
  key        text        unique not null,
  label      text        not null,
  icon       text,                          -- Ionicons name, nullable
  sort_order int         not null default 0,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now()
);

-- ── Dog Spot Vibes ───────────────────────────────────────────────────────────
-- One row per (dog spot × vibe option × user).  Dog spots are identified by
-- their Google Place ID (a plain text string), not a FK, because they live
-- in the Google Places API and are not stored in our `places` table.

create table dog_spot_vibes (
  id              uuid        primary key default gen_random_uuid(),
  google_place_id text        not null,
  vibe_option_id  uuid        not null references dog_spot_vibe_options(id),
  user_id         uuid        not null references profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (google_place_id, vibe_option_id, user_id)
);

create index dog_spot_vibes_place_idx on dog_spot_vibes(google_place_id);
create index dog_spot_vibes_user_idx  on dog_spot_vibes(user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table dog_spot_vibe_options enable row level security;
alter table dog_spot_vibes        enable row level security;

-- Vibe options: any authenticated user can read; no client-side writes.
create policy "Authenticated users can read vibe options"
  on dog_spot_vibe_options for select
  to authenticated
  using (true);

-- Vibe votes: any authenticated user can read all rows.
create policy "Authenticated users can read vibes"
  on dog_spot_vibes for select
  to authenticated
  using (true);

-- Insert: only your own rows.
create policy "Users can insert their own vibes"
  on dog_spot_vibes for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Delete: only your own rows.
create policy "Users can delete their own vibes"
  on dog_spot_vibes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ── Seed default vibe options ────────────────────────────────────────────────

insert into dog_spot_vibe_options (key, label, icon, sort_order) values
  ('water_bowls',         'Water bowls',         'water-outline',       1),
  ('dog_friendly_patio',  'Dog-friendly patio',  'umbrella-outline',    2),
  ('gives_treats',        'Gives treats',        'gift-outline',        3),
  ('dog_friendly_staff',  'Dog-friendly staff',  'people-outline',      4),
  ('quiet',               'Quiet',               'leaf-outline',        5),
  ('shady_seating',       'Shady seating',       'partly-sunny-outline',6),
  ('spacious_patio',      'Spacious patio',      'expand-outline',      7),
  ('good_for_small_dogs', 'Good for small dogs', 'paw-outline',         8),
  ('good_for_social_dogs','Good for social dogs','happy-outline',       9),
  ('usually_busy',        'Usually busy',        'trending-up-outline', 10),
  ('loud',                'Loud',                'volume-high-outline', 11),
  ('limited_parking',     'Limited parking',     'car-outline',         12);
