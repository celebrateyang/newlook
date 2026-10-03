# newself

newself is an AI hairstyle advisor: it analyses a person's face and current hair, recommends suitable styles, visualises the result, evaluates whether it is achievable in real life, and produces a salon-ready guide.

Official site: [newself.cc](https://newself.cc)

## Stylist recruitment

`/zh/stylists` and `/en/stylists` introduce mainland China stylist recruitment. The navigation link is available to signed-out and signed-in visitors on mobile and desktop. Clerk sign-in and the matching Convex backend are required to save applications; visitors can read the recruitment page without signing in.

Deploy the new `stylistApplications` schema/functions with the Web update. Applicants can manage only their own application and withdraw to delete it. Review received applications privately in the Convex dashboard table `stylistApplications`; no email/WeChat notification or admin approval workflow is configured. Contact details are for recruitment only. Public profiles, appointments, order acceptance and payments are future work.

Salon locations use province/city/district (or town) selectors, with server-validated codes, derived names and a dataset version. Street/building address is entered separately. The shared mainland dataset is pinned to `cn-division`'s 2026.0.1 snapshot, whose upstream source is the MCA public interface; it requires no API key at runtime. See [coverage, provenance and update notes](shared/regions/README.md), including `pnpm regions:update`. Deploy Convex and Web together. Additive optional schema fields support deployment compatibility; all new saves require a valid region.

Optional salon pins use browser geolocation and a lazily opened Leaflet/OpenStreetMap map, with no paid service or key. Device location requires HTTPS (localhost also works) and user permission. Applicants must confirm the point; GPS accuracy belongs only to unadjusted device coordinates. Pins use WGS84 and remain private with the application, with a server-generated confirmation timestamp. Editing the region/street address clears the pin. Address-only saves, coordinate replacement/removal and withdrawal remain supported.

Without a salon pin, the map starts near the selected district/town using local CC0 Wikidata points, falling back to city/province when unavailable. This does not select or save a salon location. Existing pins take precedence; no street-address lookup is performed. See [map starting point coverage and refresh](shared/regions/CENTERS.md).

OSM tiles load directly from the browser only when the map is opened, with visible attribution, normal referrers and browser caching. No geocoding, automatic search, tile proxy, bulk download, offline map or service worker cache is used. `NEXT_PUBLIC_OSM_TILE_URL` can override the tile template; any replacement must permit this use and have appropriate attribution. Public OSM tiles are best-effort and may block heavy use. Mainland device positioning, map connectivity and detail coverage require real-device testing; do not claim unlimited free hosted maps. See [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/). Customer matching and navigation are not implemented.

## Stack

- Next.js App Router, TypeScript and Tailwind CSS
- Clerk authentication
- Convex database, realtime state and jobs
- Private Cloudflare R2 image storage with browser-direct uploads
- GPT Image as the initial provider, with pluggable Gemini and FLUX Kontext fallbacks
- Vercel hosting

## Local setup

1. Copy `.env.example` to `.env.local` and add the project credentials.
2. Run `pnpm dev`.
3. Open `http://localhost:3000`.

The marketing site can render before credentials are configured. Authentication, uploads and analysis become active after Clerk, Convex and R2 values are present.

## Service setup order

1. Create the Clerk application, add its keys, create a JWT template named `convex`, and set `CLERK_JWT_ISSUER_DOMAIN` in both local and Convex environment settings.
2. Run `pnpm convex dev` to create/link the Convex project and deploy `convex/schema.ts`.
3. Create the private R2 bucket named `newlook`, allow browser PUT requests from the app origin, and add its S3 credentials.
4. Add `OPENAI_API_KEY` for the initial GPT Image integration.
5. Choose a payment provider later; checkout and webhook handling are intentionally deferred.

Never prefix AI, R2, Clerk secret, or payment credentials with `NEXT_PUBLIC_`.

## Deploying backend changes

The repository's `vercel.json` sets the Vercel Build Command to `pnpm build:vercel`. This runs Convex's integrated deploy command with strict backend typechecking and `pnpm build`, passing the target backend URL as `NEXT_PUBLIC_CONVEX_URL`. Vercel publishes the Web deployment only after the combined command succeeds. Convex's command builds the Web app before pushing backend functions; publication follows both steps. Backend and Web publication are not a single atomic transaction, so keep schema/function changes compatible with the currently published Web app.

One-time dashboard setup:

1. In the existing Convex project's **production deployment → Settings → General**, generate a production deploy key with `deployment:deploy` permission.
2. In **Vercel project → Settings → Environment Variables**, save it as `CONVEX_DEPLOY_KEY`, scoped **only to Production**. This is separate from `SHARING_SIGNING_SECRET`.
3. In **Vercel → Settings → Build and Deployment**, remove any old Build Command override of `pnpm build`/`next build`, or change it to `pnpm build:vercel`.
4. Keep the Git repository connected and set the intended production branch. Push this configuration and redeploy once; future production-branch pushes will deploy both services automatically. Confirm the first build logs show successful Convex deployment as well as a successful Next.js build.

For branch/PR previews, generate a separate **Preview Deploy Key** in Convex project settings and add it under the same `CONVEX_DEPLOY_KEY` name scoped **only to Preview**. Configure Convex preview defaults such as `CLERK_JWT_ISSUER_DOMAIN` and `SHARING_SIGNING_SECRET` to match the Web Preview environment. Preview backends have separate data and do not include production hairstyle history. Without a preview deploy key, this build command cannot deploy a branch preview; do not reuse the production key there.

Official setup: [Convex with Vercel](https://docs.convex.dev/production/hosting/vercel). Dashboard deploy keys are not stored in the repository. Local `pnpm build` still only builds Next.js; use `pnpm convex dev --once` for manual development backend deployment or `pnpm convex deploy` for manual production deployment. Ensure Convex's Clerk issuer matches the corresponding Web Clerk instance. Web environment variables are not automatically copied into Convex by deployment.

Use `pnpm convex function-spec` (development) or `pnpm convex function-spec --prod` to inspect deployed functions. The side-view flow requires `generations:startSide` and `generations:appendSideResult`; a missing starter causes immediate failure before AI generation.

## Saved hairstyles and comparison sharing

`/en/looks` and `/zh/looks` show the signed-in owner's saved front and side results, with pagination. Select 2–6 images to create a public comparison page. Friends can rate each image from 1–5 without signing in; the page shows averages and a ranking. Owners can disable the link. Only explicitly selected generated images and their collage become public.

Anonymous ratings use a signed HttpOnly browser cookie. Returning visitors can edit their scores, but clearing cookies or changing devices can allow another vote. These are informal friend ratings, not verified unique-person votes. Signed-in owners cannot rate their own sharing pages.

Before deploying this feature, configure the same server-only `SHARING_SIGNING_SECRET` (at least 32 random characters) in the Web environment and its matching Convex deployment. The local development secret is in `.env.local`; never publish it or prefix it with `NEXT_PUBLIC_`. Set the production value securely in Vercel and Convex, deploy Convex first, then publish the Web app. Avoid piping the value through tools that append a newline: both services must receive the exact same value.

X sharing pre-fills the message and link. Facebook shares the link preview; its message must be pasted by the user. WeChat uses copy-link or native sharing. Social previews use a 1200×630 collage; actual platform caching and preview fetching still need live verification. Revocation blocks future app access but cannot recall saved or externally cached copies.

## Languages

English and Simplified Chinese are available at `/en` and `/zh`. The header language selector preserves the current page and remembers the choice. Unprefixed page links select the saved language, then the browser language; API and asset paths remain unchanged.

UI translations live in `src/lib/i18n/zh.json`, with English source text as the fallback. Chinese analysis prompts and salon instructions are supported; downloaded PDF guides and salon packs currently retain English text and are labeled accordingly. Add future locales through `src/lib/i18n/locale.ts`, the translation loader and the language selector.

## Google Analytics

GA4 uses the public measurement ID `G-RFVZLETJDJ`. Override it with `NEXT_PUBLIC_GA_MEASUREMENT_ID` (an empty value disables it). The tag loads only in production builds on `newself.cc` or `www.newself.cc`, excluding localhost and Vercel preview domains. Both languages record initial visits and client-side page navigation.

Before publishing, open GA4 **Admin → Data streams → Web stream** and turn **Enhanced measurement off**. The app sends manual pageviews; automatic history, form, outbound-link and download measurement would duplicate visits or expose resource URLs. Page locations are category paths with no query strings, fragments, sharing tokens or result IDs. Referrers are limited to sanitized internal page categories; external acquisition URLs are intentionally omitted. Do not add a second GA tag through GTM. Advertising personalization and Google signals are disabled in the tag.

Publish the Web change, then use Google tag's **Test installation** and GA4 **Realtime** to verify a real visit and navigation. Local code checks do not verify Google collection. This integration does not add a consent-management platform or product funnel events.

## Checks

```bash
pnpm typecheck
pnpm lint
```

## Current foundation

- Responsive product landing page and selfie upload experience
- Clerk-ready sign-in route with an unconfigured development state
- Validated, user-scoped R2 presigned upload endpoint and verified upload metadata persistence
- Convex schema covering users, analyses, hairstyles, generations, credits, orders, guides, prompts and model usage
- Provider-neutral AI and payment interfaces
- Central identity-preservation prompt

The canonical product and technical specification is available at [`docs/product-spec-v2.md`](docs/product-spec-v2.md). Current implementation status and the recommended next milestone are tracked in [`docs/current-status.md`](docs/current-status.md).

The future Web and WeChat mini-program direction, shared Convex backend, separate user accounts, credits/membership boundaries, sharing scenarios, and registration/release research are recorded in [`docs/wechat-miniprogram-plan.md`](docs/wechat-miniprogram-plan.md). Confirmed decisions and proposals are distinguished there; mini-program and payment integrations have not been implemented or verified by this planning work.
