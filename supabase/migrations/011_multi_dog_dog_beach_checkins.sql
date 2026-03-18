-- Allow one owner to check in multiple dogs at the same beach location
DROP INDEX IF EXISTS uq_dog_location_checkins_user_location_active;
