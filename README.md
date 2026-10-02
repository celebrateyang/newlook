# newself

newself is an AI hairstyle advisor: it analyses a person's face and current hair, recommends suitable styles, visualises the result, evaluates whether it is achievable in real life, and produces a salon-ready guide.

Official site: [newself.cc](https://newself.cc)

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

Web deployment does not deploy Convex functions. Before releasing Web code that calls new Convex functions, run `pnpm convex dev --once` for the development backend and `pnpm convex deploy` for production. Confirm that Vercel's `NEXT_PUBLIC_CONVEX_URL` points to the intended deployment and that its `CLERK_JWT_ISSUER_DOMAIN` matches the Web Clerk instance.

Use `pnpm convex function-spec` (development) or `pnpm convex function-spec --prod` to inspect deployed functions. The side-view flow requires `generations:startSide` and `generations:appendSideResult`; a missing starter causes immediate failure before AI generation.

## Saved hairstyles and comparison sharing

`/en/looks` and `/zh/looks` show the signed-in owner's saved front and side results, with pagination. Select 2–6 images to create a public comparison page. Friends can rate each image from 1–5 without signing in; the page shows averages and a ranking. Owners can disable the link. Only explicitly selected generated images and their collage become public.

Anonymous ratings use a signed HttpOnly browser cookie. Returning visitors can edit their scores, but clearing cookies or changing devices can allow another vote. These are informal friend ratings, not verified unique-person votes. Signed-in owners cannot rate their own sharing pages.

Before deploying this feature, configure the same server-only `SHARING_SIGNING_SECRET` (at least 32 random characters) in the Web environment and its matching Convex deployment. The local development secret is in `.env.local`; never publish it or prefix it with `NEXT_PUBLIC_`. Set the production value securely in Vercel and Convex, deploy Convex first, then publish the Web app. Avoid piping the value through tools that append a newline: both services must receive the exact same value.

X sharing pre-fills the message and link. Facebook shares the link preview; its message must be pasted by the user. WeChat uses copy-link or native sharing. Social previews use a 1200×630 collage; actual platform caching and preview fetching still need live verification. Revocation blocks future app access but cannot recall saved or externally cached copies.

## Languages

English and Simplified Chinese are available at `/en` and `/zh`. The header language selector preserves the current page and remembers the choice. Unprefixed page links select the saved language, then the browser language; API and asset paths remain unchanged.

UI translations live in `src/lib/i18n/zh.json`, with English source text as the fallback. Chinese analysis prompts and salon instructions are supported; downloaded PDF guides and salon packs currently retain English text and are labeled accordingly. Add future locales through `src/lib/i18n/locale.ts`, the translation loader and the language selector.

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
