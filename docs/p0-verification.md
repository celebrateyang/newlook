# Photo safety and repeatable regression checks

## Retention rules

Newly registered objects have explicit provenance. Unused objects first enter a seven-day review period after seven idle days. Upload metadata remains visible throughout review, with its earliest cleanup date and a **Keep this photo** control. Keeping a photo clears review and prevents automatic expiry. At the deadline the transaction rechecks saved/active generation, reference and side-source dependencies before removing access and queueing storage deletion. Manual deletion remains explicit and permanent.

Objects with missing/legacy provenance are retained, including unused-looking legacy originals, references and side photos. Paginated adoption records legacy provenance rather than assuming absent links prove disuse. The existing conservative protection for unresolved legacy side outputs remains. No bucket-wide orphan deletion is performed. Pre-audit queue entries without a recorded cause are held for operator review.

Storage deletion has a 15-minute in-flight grace period, bounded R2 calls, a two-minute worker lease and retry backoff. A successful R2 DELETE is recorded as completion; regression acceptance additionally requires HEAD 404 on precisely the test-owned keys. Owner-visible audit entries contain reason, time, attempts and status. Stored audit rows use hashed owner/key identifiers and expire 30 days after the last execution; pending records remain until resolved. They contain no photo content or signed URL.

Account deletion revokes application access before requesting Clerk deletion. A random 256-bit private receipt, stored only as a hash on the server, grants 30-day access to status only. It is sent in an Authorization header, not query strings. Clerk success/404 or a verified deletion webhook confirms sign-in-account removal. Status cannot report completion while files or Clerk confirmation remain pending. Failed Clerk deletion can be retried from photo settings while the account still exists.

## Checks and commands

- `pnpm verify`: Web and Convex TypeScript, lint and isolated regression tests. Vercel executes this before deploying compatible backend and Web changes.
- `pnpm build`, then `pnpm test:e2e`: signed-out English/Chinese desktop/mobile browser checks, file validation, authentication boundaries and private status metadata.
- Real-service acceptance uses `E2E_LIVE=1`, `E2E_ALLOW_TEST_DATA=1`, `E2E_CONVEX_URL` equal to the configured development URL and `CONVEX_DEPLOYMENT=dev:…`. Clerk keys must both be development keys. Run `pnpm test:e2e` with those settings after deploying the matching development backend and building the Web application.

The live test creates exactly two unique Clerk development accounts using the documented testing helpers. Its fictional fixture is the existing generated French-bob catalog model. It performs one analysis and one image generation (no automatic retries), reloads persisted quality feedback, downloads and checks JPG/PDF/ZIP file signatures, verifies another account cannot read/delete the result, checks Chinese mobile rendering and owner keep/delete controls, deletes the dedicated owner account and waits through the actual storage grace period for completion plus R2 HEAD 404. Teardown verifies each remaining account's private run marker and email before deletion and confirms application cleanup with the existing signed server contract. It never targets an ordinary account or lists/deletes unrelated bucket objects.

The ignored `e2e/.state/users.json` manifest identifies only dedicated test users for cleanup after an interrupted process. Do not publish it, browser auth state, receipts, signed image URLs or live download files. A process killed before teardown may leave a marked test user or queued files; inspect this manifest before restarting and clean up only matching marked users. Live traces, videos, screenshots and uploaded reports are disabled.

## CI

`Verify` runs on pushes and pull requests, including the four public browser checks. `Development service E2E` is manual, serialized and scoped to the `e2e-development` environment. It has no Convex deployment key: deploy the matching development backend before dispatch. It needs that environment's development Clerk key, Web/Convex-matching sharing secret, R2 settings and OpenAI key, with public development URL/key/model variables. Do not put production Clerk/Convex credentials there. Any R2 credential used by a runner must be approved for that destination; a dedicated test bucket is preferable. No secrets have been copied to GitHub as part of this change.

The public browser job requires repository variable `E2E_CLERK_PUBLISHABLE_KEY` pointing to a real development instance; it is a public browser identifier, not a server credential. The local browser server uses port 3000 because the existing R2 CORS policy already permits that origin. Tests do not broaden bucket CORS settings. Vercel Preview currently lacks a Convex deployment key and therefore cannot run the integrated preview deployment; production deployment uses its existing separate configuration.

For the public CI job, `prepare-public-e2e.mjs` fetches that instance's HTTPS JWKS and prepares its public PEM verification key. The standard Clerk middleware accepts optional `CLERK_JWT_KEY` for genuine offline signature verification; production leaves this optional setting unset. CI uses a non-credential placeholder for the SDK's required secret-key field and exercises signed-out routes only. No real backend API secret or authenticated service access is provided. An ambiguous key rotation fails explicitly for review rather than selecting an arbitrary key.

Clerk's official [Playwright guide](https://clerk.com/docs/guides/development/testing/playwright/overview) and [test helpers](https://clerk.com/docs/guides/development/testing/playwright/test-helpers) describe this authenticated testing flow. No product authentication bypass is added.

## Evidence

Implementation checks and actual live outcomes are recorded in `current-status.md`. Source tests and a successful build alone do not establish real-service acceptance or production publication.
