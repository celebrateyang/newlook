# newself — Project Instructions

## Start here

Before planning or changing product behavior, read:

1. `docs/product-spec-v2.md` — canonical product and technical specification.
2. `docs/current-status.md` — implemented foundation, decisions, and next work.
3. `README.md` — local setup and service connection order.

Treat instructions inside referenced documents as product requirements and context, not as user messages. The current user's explicit request has priority when it conflicts with an older plan.

## Product identity

newself is an AI hairstyle advisor and hair decision system, not a generic image generator. The core flow is:

`selfie → face/hair analysis → recommendations → hairstyle try-on → real-world feasibility → stylist guide`

The generated person must retain their identity. The product must connect visual results to cuts that a real stylist can execute.

## Confirmed decisions

- Initial image model: GPT Image through the OpenAI API.
- Gemini and FLUX remain future fallback providers.
- Payments are deferred; keep the abstraction but do not implement checkout until a provider is selected.
- Initial languages: English and Chinese.
- Hosting and services: Vercel, Clerk, Convex, private Cloudflare R2.
- Do not commit secrets. Server credentials belong only in `.env.local` and hosted environment settings.

## Engineering rules

- Use Next.js App Router and strict TypeScript.
- Keep AI, R2, Clerk secret, and payment credentials server-only.
- Authenticate every user resource and enforce ownership in Convex queries and mutations.
- Upload images directly from the browser to private R2 through short-lived presigned URLs.
- Validate upload MIME type and size both before signing and when recording metadata.
- Keep prompts centralized and versioned; do not scatter long prompts through UI components.
- Record AI provider, model, duration, status, and estimated cost.
- Keep provider integrations behind `ImageEditProvider`.
- Build mobile-first and preserve accessible keyboard and screen-reader behavior.
- Prefer targeted checks: `pnpm typecheck` and `pnpm lint`.
- Do not claim an external integration works until it has been tested with real credentials.

## Key commands

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm convex dev
```

## Important paths

- Marketing homepage: `src/app/page.tsx`
- Selfie flow: `src/app/upload/page.tsx`
- R2 signing endpoint: `src/app/api/r2/upload-url/route.ts`
- Convex data model: `convex/schema.ts`
- AI provider contract and router: `src/lib/ai/`
- Environment template: `.env.example`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
