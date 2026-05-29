-- Allow posts to have no breed when created from a place feed.
-- Place-only posts carry breed = NULL and are therefore excluded from
-- breed-specific feeds (getFeed filters with .eq('breed', breed)).
ALTER TABLE posts ALTER COLUMN breed DROP NOT NULL;
