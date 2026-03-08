-- Seed Australian Shepherd feed with varied post types (some with images)
-- Uses the first existing profile as author (run after at least one user has signed up)

-- Post 1: Training question (with image)
WITH new_post AS (
  INSERT INTO posts (author_id, breed, type, tag, content_text, title)
  SELECT p.id, 'AUSTRALIAN_SHEPHERD', 'QUESTION', 'TRAINING',
    'What age did you start agility training with your Aussie? Mine is 10 months and I''m wondering if we can start the basics.',
    'When to start agility?'
  FROM profiles p LIMIT 1
  RETURNING id
)
INSERT INTO post_images (post_id, image_url, sort_order)
SELECT id, 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800', 0 FROM new_post;

-- Post 2: Grooming tip (with image)
WITH new_post AS (
  INSERT INTO posts (author_id, breed, type, tag, content_text, title)
  SELECT p.id, 'AUSTRALIAN_SHEPHERD', 'TIP', 'GROOMING',
    'Pro tip: Brush your Aussie''s double coat at least 2-3x a week during shedding season. A slicker brush + undercoat rake combo works wonders!',
    'Coat maintenance during shedding'
  FROM profiles p LIMIT 1
  RETURNING id
)
INSERT INTO post_images (post_id, image_url, sort_order)
SELECT id, 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800', 0 FROM new_post;

-- Post 3: Puppy update (with image)
WITH new_post AS (
  INSERT INTO posts (author_id, breed, type, tag, content_text, title)
  SELECT p.id, 'AUSTRALIAN_SHEPHERD', 'UPDATE_STORY', 'PUPPY',
    'Our 4-month-old mini Aussie just learned "place"! Took about 2 weeks of consistent training. So proud of this little herder.',
    'First "place" command success'
  FROM profiles p LIMIT 1
  RETURNING id
)
INSERT INTO post_images (post_id, image_url, sort_order)
SELECT id, 'https://picsum.photos/id/237/800/600', 0 FROM new_post;

-- Post 4: Health question (no image)
INSERT INTO posts (author_id, breed, type, tag, content_text, title)
SELECT p.id, 'AUSTRALIAN_SHEPHERD', 'QUESTION', 'HEALTH',
  'Has anyone dealt with hip dysplasia in their Aussie? Our vet mentioned it''s common in the breed. Looking for management tips.',
  'Hip dysplasia experiences?'
FROM profiles p LIMIT 1;

-- Post 5: Behavior tip (with image)
WITH new_post AS (
  INSERT INTO posts (author_id, breed, type, tag, content_text, title)
  SELECT p.id, 'AUSTRALIAN_SHEPHERD', 'TIP', 'BEHAVIOR',
    'Aussies need a "job" or they''ll invent one (usually herding your ankles). Puzzle toys, nose work, and short training sessions keep ours happy.',
    'Giving your Aussie a job'
  FROM profiles p LIMIT 1
  RETURNING id
)
INSERT INTO post_images (post_id, image_url, sort_order)
SELECT id, 'https://images.unsplash.com/photo-1612536058410-2c5e04b88f66?w=800', 0 FROM new_post;

-- Post 6: Gear recommendation (with image)
WITH new_post AS (
  INSERT INTO posts (author_id, breed, type, tag, content_text, title)
  SELECT p.id, 'AUSTRALIAN_SHEPHERD', 'UPDATE_STORY', 'GEAR',
    'Finally found a harness that doesn''t rub our Aussie''s chest fur! The Ruffwear Front Range has been a game changer for our daily hikes.',
    'Harness recommendation'
  FROM profiles p LIMIT 1
  RETURNING id
)
INSERT INTO post_images (post_id, image_url, sort_order)
SELECT id, 'https://images.unsplash.com/photo-1558785463-51d7a24c80f7?w=800', 0 FROM new_post;

-- Post 7: Food question (no image)
INSERT INTO posts (author_id, breed, type, tag, content_text, title)
SELECT p.id, 'AUSTRALIAN_SHEPHERD', 'QUESTION', 'FOOD',
  'What do you feed your adult Aussie? We''re switching from puppy food and overwhelmed by options. Looking for something that supports energy without the zoomies.',
  'Adult food recommendations?'
FROM profiles p LIMIT 1;

-- Post 8: Playdate tip (with image)
WITH new_post AS (
  INSERT INTO posts (author_id, breed, type, tag, content_text, title)
  SELECT p.id, 'AUSTRALIAN_SHEPHERD', 'TIP', 'PLAYDATE',
    'Aussie playdate tip: They often do better with other high-energy herding breeds (collies, heelers) than with more laid-back dogs. Match the energy!',
    'Playdate compatibility'
  FROM profiles p LIMIT 1
  RETURNING id
)
INSERT INTO post_images (post_id, image_url, sort_order)
SELECT id, 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=800', 0 FROM new_post;
