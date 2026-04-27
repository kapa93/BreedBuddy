/** Slug of the Ocean Beach Dog Beach place record in the `places` table. */
export const OB_DOG_BEACH_SLUG = 'ocean-beach-dog-beach';

/**
 * When true, Home requests foreground location on load (and every 5m) to show
 * the nearby Dog Beach check-in banner. Set false to avoid prompting for location
 * on initial Home open.
 */
export const ENABLE_HOME_PLACE_PROXIMITY_LOCATION = false;

/**
 * Dev helper — set to true to force the "nearby" check-in banner to appear
 * regardless of GPS proximity (only active in __DEV__ builds).
 */
export const DEBUG_FORCE_NEARBY = false;
