# NewLook

NewLook is an AI hairstyle advisor: it analyses a person's face and current hair, recommends suitable styles, visualises the result, evaluates whether it is achievable in real life, and produces a salon-ready guide.

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
