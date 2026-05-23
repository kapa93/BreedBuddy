# web-deploy — files to copy into the `nuzzleapp.io` repo

This folder is **not** part of the React Native app. It stages the files that need
to live in your separate Next.js / Vercel repo at `nuzzleapp.io` so that
Universal Links and App Links resolve to a real web fallback when the Nuzzle app
isn't installed.

## What to copy where

The folder layout below mirrors the target paths inside your Next.js project:

| File in this folder | Target path in the `nuzzleapp.io` repo |
| --- | --- |
| `public/.well-known/apple-app-site-association` | `public/.well-known/apple-app-site-association` (no extension) |
| `public/.well-known/assetlinks.json` | `public/.well-known/assetlinks.json` |
| `vercel.json` | `vercel.json` (project root) |
| `app/post/[postId]/page.tsx` | `app/post/[postId]/page.tsx` (App Router) |
| `app/user/[userId]/page.tsx` | `app/user/[userId]/page.tsx` |

If your Next.js project already has a `vercel.json`, merge the `headers` array
rather than overwriting it.

## Before deploying

1. **Android signing fingerprint** — `assetlinks.json` has the placeholder
   `REPLACE_WITH_SHA256_OF_ANDROID_SIGNING_CERT`. Run `eas credentials --platform android`
   in the Nuzzle app repo and paste the SHA-256 of the upload/release keystore.
   If you maintain multiple signing keys (internal-test vs. production), list
   them all in the `sha256_cert_fingerprints` array.

2. **App Store ID** — both `page.tsx` files have `idREPLACE_APP_STORE_ID` in the
   `APP_STORE_URL` constant. Once the app ships to TestFlight/App Store, swap in
   the numeric ID from App Store Connect.

3. **Supabase env vars** — set these in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Confirm your `posts` and `profiles` Row Level Security policies permit
   anonymous SELECT of the columns the route queries (`id`, `title`, `content_text`,
   `type`, `created_at`, `name`, `bio`, `avatar_url`, `image_url`, `sort_order`).
   If not, relax the policies for those columns or use a server-only
   `SUPABASE_SERVICE_ROLE_KEY` in the route (do **not** mark it `NEXT_PUBLIC_`).

4. **Production iOS bundle ID** — when you ship a production iOS bundle (e.g.
   `com.kapa.nuzzle`), add it to the `appIDs` array in
   `apple-app-site-association`:
   ```json
   "appIDs": [
     "L3VDBFUD7G.com.kapa.nuzzle-dev",
     "L3VDBFUD7G.com.kapa.nuzzle"
   ]
   ```

## Verifying after deploy

```bash
curl -I https://www.nuzzleapp.io/.well-known/apple-app-site-association
curl -I https://www.nuzzleapp.io/.well-known/assetlinks.json
```

Both must return `200` with `Content-Type: application/json` and no redirects.

- Apple validator: https://search.developer.apple.com/appsearch-validation-tool/
- Google validator:
  `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.nuzzleapp.io&relation=delegate_permission/common.handle_all_urls`

Then install a fresh dev build of Nuzzle, tap a shared `https://www.nuzzleapp.io/post/<id>`
link from iMessage, and confirm it opens directly to `PostDetailScreen`. Uninstall
the app and tap the same link — it should land on this Next.js page with the
rich preview and store buttons.

## Optional polish

- Add an `og-default.png` (1200×630) at `public/og-default.png` for posts/users
  without their own image.
- Consider a smart `<script>` on the page that attempts the `nuzzle://` URL
  briefly on mobile load, falling back to the store buttons after a timeout, to
  ease the case where the system universal-link routing misses (rare with a
  properly configured AASA, but a nice UX safety net).
