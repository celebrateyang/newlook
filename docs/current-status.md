# newself Current Status

Last updated: 2026-10-02

## Planning decisions recorded on 2026-10-01

- Recorded the [Web and WeChat mini-program plan](wechat-miniprogram-plan.md) as the basis for future development; no mini-program implementation was added.
- Plan two frontends: Web primarily for overseas users and `NewSelf发型设计` primarily for domestic users, sharing the same Convex database and core business functions.
- Treat Clerk/Web users and WeChat users as separate accounts in the first phase, without binding or automatic merging. Credits, membership, orders, photos and results remain separate per user, even when their business system is shared.
- Credits and membership are possible future monetization options; pricing and payment providers remain undecided and checkout remains deferred.
- Mini-program HTTP API access is technically supported by Convex, but WeChat authentication, production domain configuration, domestic connectivity, AI provider eligibility and data-handling requirements remain unverified.
- Web result sharing and friend ratings were requested on 2026-10-02 and are now implemented as described below. Mini-program sharing, Taro, domestic AI/storage options and salon scenarios remain proposals. Registration, filing and release preparation are documented in the linked plan.

## Completed foundation

- Confirmed `newself` as the official brand and `newself.cc` as the production domain.
- Created the standalone Git repository at `D:\code\newlook`.
- Added a responsive editorial-style marketing homepage.
- Reworked the landing page into a tool-first advisor workspace with direct selfie upload, an original before/after example, progressive analysis details, and in-place try-on results.
- Added a local selfie picker with type/size validation and preview.
- Added About, Pricing, Privacy, Terms, and Clerk-ready sign-in pages.
- Added a user-scoped R2 presigned upload endpoint.
- Added the initial Convex schema for users, uploads, analyses, hairstyles, recommendations, generations, results, favorites, stylist guides, credits, orders, prompts, and model usage.
- Added provider-neutral AI types and routing.
- Selected OpenAI GPT Image as the first image provider.
- Added an identity-preservation prompt.
- Added Convex Clerk authentication configuration and authenticated upload CRUD.
- Added an upload-completion endpoint that verifies the R2 object's size and MIME type before persisting metadata.
- Connected and deployed the development Convex backend with Clerk JWT verification.
- Added the first GPT Image hairstyle try-on provider using the Images edit API.
- Added six controlled hairstyle styles and made each ranked recommendation card a direct try-on action.
- Switched image edits to automatic output sizing and strengthened composition/proportion preservation constraints.
- Made selfie and try-on comparisons follow the source photo's aspect ratio and use uncropped image fitting so the full hairstyle remains visible.
- Added authenticated result detail pages with front/side viewing, zoom and fullscreen controls, optional real side-photo generation, structured salon instructions, individual downloads, PDF guides, and ZIP salon packs.
- Restored the latest saved selfie and most recent completed hairstyle result on the homepage for returning signed-in users, with a direct result link and new-photo reset.
- Added a guided three-path discovery step after selfie selection: personal AI recommendations, a six-style self-service library with direct try-on, and reference-photo hairstyle transfer.
- Added private reference-photo upload, two-image GPT Image hairstyle transfer, optional hair-color copying, identity-preserving transfer prompts, and reference-aware result details.
- Added the first six newself-owned, reviewed AI hairstyle catalog previews using two fictional anchor models, consistent salon photography, structured bilingual metadata, and image-led browse and recommendation cards.
- Reworked the self-service catalog into a compact horizontal thumbnail browser with manual Female/Male collections, defaulting to Female without inferring gender from appearance.
- Reworked the signed-in homepage into a compact returning-user workspace with immediately visible latest photos, an optional hide control, a clear continue action, and direct latest-result access.
- Rebalanced discovery around one primary recommendation path plus compact library/reference alternatives, with persistent method switching and clearer generation time/preview-cost cues.
- Reduced mobile image repetition by combining the current selfie and latest result into a side-by-side summary, and added signed-in header shortcuts plus explicit upload labels.
- Cached completed recommendations per selfie in component state and session storage, so switching discovery methods or returning within the same browser session does not repeat the analysis call; added an immediate accessible loading panel and skeleton cards while analysis runs.
- Standardized pointer, unavailable, wait, and zoom cursor feedback across interactive controls, and strengthened hover feedback on the discovery method switcher.
- Added a reversible change-selfie flow for returning users: after opening the new-photo picker they can restore the saved selfie, latest result, upload association, and cached recommendations without uploading again.
- Turned the main result workspace into an active generation stage: generation scrolls into view immediately, preserves the prior result beneath a branded progress treatment, communicates identity preservation and expected time, then swaps in the new result in place.
- Added a polished hover and keyboard-focus treatment to the latest-result image with zoom affordance, coral focus framing, and a clear route to comparison and salon details.
- Added a mobile-only latest-result affordance with a gently animated "Tap to explore" cue and periodic light sweep, while respecting reduced-motion preferences.
- Moved image zoom into a full-window viewer and converts downloadable preview images to widely compatible high-quality JPEG files.
- Added generation lifecycle, result, provider request, duration, and failure persistence in Convex.
- Kept payments behind an interface; implementation is intentionally deferred.
- Added `.env.example` and local setup documentation.

## Verification already completed

- Live deployment diagnosis: both linked Convex dev and production deployments lacked `generations:startSide` while the Web side endpoint calls it before AI generation. Synchronized the current backend to both deployments after a schema/index dry run (no index deletions), including quota and sharing functions. Added `convex/tsconfig.json` so deployments run strict backend typechecking. Confirmed the required functions are present after deployment. This removes the missing-function failure; a real signed-in side-image generation remains to be verified. The local Web progress/diagnostic improvements have not been deployed to Vercel.

- Side-view follow-up: the result page now shows upload/generation progress and displays the saved side image directly from the POST response, avoiding an extra read as a prerequisite for display. Regression coverage confirms side results survive reload, replacement preserves the front result, ownership is enforced, and quota is charged. The reported browser failure has not yet been reproduced; real side-photo generation still needs end-to-end verification.
- Side API diagnostics now distinguish authentication, configuration, quota reservation, source loading, AI generation, image storage, database save and preview-signing failures with safe localized messages and a request ID in server logs/responses. Mock route tests cover Cornrows generation, output persistence, auth refresh, upload ownership, quota rejection and stage-specific failures. These checks do not verify production services or establish the cause of the reported screenshot error.

- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `/`, `/upload`, `/sign-in`, and `/pricing` returned HTTP 200 locally.

## Not implemented yet

- Signed-in browser verification of the complete Clerk → R2 → Convex → OpenAI → R2 flow with a real selfie.
- Persistence of face and hair analysis results in Convex.
- Hairstyle seed data and recommendation engine.
- Background generation jobs, feasibility analysis, and stylist guides.
- Payments and production deployment.

## Next recommended milestone

Verify the signed-in end-to-end try-on with a real selfie. Then persist face/hair analysis and replace the starter-style bridge with seeded hairstyle data and a deterministic recommendation engine.

## English and Chinese localization — 2026-10-02

- Moved Web pages under `/en` and `/zh`, with language selection in the header, a saved locale cookie, browser-language detection for older unprefixed links, and localized canonical/hreflang metadata. API and asset URLs remain unprefixed.
- Added centralized UI translations, Chinese legal pages, official Clerk Chinese localization, and Chinese text throughout the upload, recommendation, result, quota, sharing and rating flows. Existing ownership and quota enforcement remain unchanged.
- Localized AI analysis prompts and structured salon instructions. Analysis session caches are separated by locale. PDF guides and ZIP salon packs currently retain English guide text; Chinese download buttons state this explicitly.
- Local checks cover language preference, route preservation, translations, guide dimensions and AI prompt constraints, alongside the existing generation/sharing regression suite. Signed-in generation and social-platform integration still require real end-to-end verification.

## Hairstyle gallery and comparison ratings — 2026-10-02

- Added owner-only, paginated saved hairstyle galleries at `/en/looks` and `/zh/looks`, including front and side outputs. The header now links to this gallery.
- Added selection of 2–6 saved outputs, optional question text, public comparison pages, 1–5 ratings per image, average scores and rankings, and owner-controlled revocation. Public responses expose only explicitly selected outputs; selfies, reference photos and account details stay private.
- Added 1200×630 collage previews with A–F image labels, Open Graph/X metadata, native sharing, WeChat copy-link, post-text copying, Facebook link sharing and X message/link prefill. Facebook post text must be pasted manually.
- Replaced sign-in requirements for the Web rating UI with anonymous voting, including existing single-image links. Server-issued HMAC proofs prevent direct unsigned anonymous mutations. Browser identifiers are signed HttpOnly cookies; authenticated voters use their account identity. Scores can be edited without adding another rating. Anonymous device/cookie changes can allow repeat participation, so this is an informal choice aid.
- Added atomic limits of 20 rating requests per visitor and 60 per network per minute across sharing pages, short-lived signed proofs, same-origin POST checks, hashed network identifiers, and daily cleanup of expired rate-limit records. Updated privacy disclosures in both languages.
- Verification: all 28 tests passed, covering ownership, selection validation, signed voting, edits, concurrent aggregates, limits, revocation and collage dimensions. Local English/Chinese gallery routes returned 200; unauthenticated owner APIs returned 401; invalid public pages/images returned 404. Collage layout was visually inspected. Real development Convex verified a Node-generated HMAC proof; no real signed-in user vote or social-platform publish/preview has been verified.
- Development Convex schema/functions and the matching local/development `SHARING_SIGNING_SECRET` are configured. This feature has not been published to Vercel or the production Convex deployment. Production requires the same server-only signing secret in both services, Convex deployment first, then Web deployment. See README for setup. This section supersedes the earlier absence of a history gallery and the earlier sign-in-only rating requirement.

## Environment

Copy `.env.example` to `.env.local`. Never commit `.env.local` or paste secret values into chat messages.

## Daily generation limit and Web sharing — 2026-10-02

- Added a server-enforced limit of 6 generation attempts per Clerk account per calendar day, resetting at midnight Asia/Shanghai (UTC+8). Try-on, reference transfer and side-view requests share the limit. Failed attempts count; validation failures before reservation do not. Convex mutations reserve quota atomically before the AI call. Existing same-day front generations are included at first reservation.
- Generated output images already persist in private R2, with lifecycle and result metadata in Convex. The existing homepage restores the most recent result; this change does not add a full history gallery.
- Added remaining-quota notices and aligned the pricing page with free early access; credits, membership and checkout remain deferred.
- Added owner-controlled public links for individual saved result views. Sharing starts disabled; reopening a disabled share rotates the token, keeping old links invalid. Only the selected output is public; original selfies, reference photos and account details are excluded.
- Added Facebook and X share links, browser-native sharing, and WeChat copy-link instructions. No WeChat JS SDK or automatic Moments publishing is integrated.
- Added bilingual public rating pages, 1–5 ratings, atomic aggregate counts, one editable rating per signed-in account and a try-your-own CTA. Owners cannot rate their own share. Public visitors can view without signing in; submitting a rating requires sign-in.
- Shared images use a revocation-checked server endpoint with no-store responses, plus Open Graph and X card metadata. Turning off sharing blocks future app access; externally saved or cached copies cannot be recalled.
- Social-platform publishing, preview fetching and the authenticated browser flow still require real end-to-end verification. Deploy the updated Convex schema/functions alongside the Web app.
- Verification: `pnpm typecheck`, `pnpm lint`, and Convex regression tests (`pnpm test`). Local HTTP smoke checks confirmed pricing returns 200, invalid/revoked share paths return 404, and unauthenticated quota access returns 401. Tests use an isolated mock Convex backend and do not prove external integrations.
