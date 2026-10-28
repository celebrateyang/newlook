# Recommendation readiness — 2026-10-27

## User-facing changes

- Recommendation order is explained with reasons. Removed model-generated match percentages; they were not calibrated measurements.
- Users explicitly choose acceptable length change, perm preference and daily styling budget. The analysis prompt includes these preferences. The saved assessment is owned by the account, bound to its exact original upload, and attached to the generated hairstyle.
- A versioned photo analysis feeds conservative feasibility rules: insufficient visible length, length-change conflicts, fine/lower-density hair, curl shrinkage, styling budget and a no-perm preference. The plan never invents an exact growth date or claims a salon examination. Unclear features remain uncertain.
- Result pages and English PDF/ZIP exports derive their plan from the same saved assessment. Older/direct catalog results are labelled general style references. Reference transfers do not receive a fabricated technical feasibility report.
- Owners can compare original and output from the same view and record an editable quality review. Reviews are user feedback, not automatic face verification. There is no face embedding or biometric identity scoring. A new preview uses the existing daily allowance.
- English and Chinese public pages explain capabilities, limitations, processing, sign-in and daily quota. The top before/after is one actual API edit of an owned fictional catalog model; see [asset provenance](ai-example-provenance.md). The separate fictional consultation demo uses reviewed catalog images. Neither represents a customer or verified salon outcome. Three bilingual haircut discussion pages have reciprocal language metadata and public sitemap entries. Genuine customer/salon case studies still require permission and evidence.

## Media and account deletion

- `/en/settings/privacy` and `/zh/settings/privacy` are noindex owner tools, linked from navigation, the gallery and privacy pages. They list private five-minute photo thumbnails, type and date so owners can identify what they are deleting.
- Deleting an original/reference/linked side photo removes dependent hairstyle results. Deleting a hairstyle preserves original photos and other hairstyles. Deleting all media preserves account quota; deletion cannot reset daily generation limits.
- Deletion removes app metadata and affected public single/comparison shares transactionally. Physical R2 objects enter an idempotent deletion queue. Previously issued signed URLs may continue until expiry or object cleanup; external copies cannot be recalled.
- The queue waits 15 minutes for in-flight uploads/edits before physical deletion. Hourly cleanup retries failed deletes with backoff and continues full batches. The owner sees pending/retrying counts; accepting a request is never displayed as completed file cleanup.
- Register every new object before browser signing or generated-file PUT. This also tracks interrupted operations. Unused registered files become eligible after seven days. Saved results retain their original/reference/side sources. A daily paginated job adopts legacy **database-owned** uploads/results. No whole-bucket orphan deletion is performed: development and production can share a bucket, and absence from one backend is not proof that a file is unused. Legacy files lacking any database record require a scoped operator inventory.
- Account deletion removes app records, private stylist applications, media, owner shares, ratings and account-linked data, then deletes the Clerk sign-in account. A Clerk failure is explicitly pending/retriable. A minimal deletion marker prevents stale credentials from recreating data. `user.deleted` webhooks cover deletion initiated through Clerk's profile UI/dashboard; the verified webhook uses a short-lived, domain-separated HMAC proof to request backend cleanup.

## Release configuration and verification

Deploy Convex and Web together with the existing integrated build. New fields are additive; old results remain readable with clearly labelled general guidance. New Web upload/analysis/deletion functions require the matching new backend.

1. Set `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET_NAME` in the **matching Convex deployment**, as well as Web. Use the existing bucket-scoped credentials with object read/write/delete permission. Do not print secrets or add public-prefixed variables. A successful Web R2 test does not prove the Convex worker is configured.
2. Keep the existing server-only `SHARING_SIGNING_SECRET` identical in Web and Convex. It signs ratings and the separate account-deletion proof format.
3. In the corresponding Clerk instance, configure a webhook for `user.deleted` to `https://newself.cc/api/webhooks/clerk` (use the correct URL for previews/development). Save its provided signing secret as `CLERK_WEBHOOK_SIGNING_SECRET` in that Web environment. Invalid signatures fail closed. Without the webhook, account deletion initiated outside the new privacy page is not verified end-to-end.
4. Use a disposable account and an owned fictional fixture to check sign-in → direct upload → analysis/preferences → generation → reload → original comparison → quality review → guide export. Test each deletion scope and sharing revocation; verify eventual queue completion and object 404. Do not delete an existing user's photos as a smoke test.
5. Monitor failed Convex cron/action runs and `mediaDeletions` retries. Check daily legacy adoption before treating retention as operational. Reconcile unregistered old files only after confirming the correct environment and ownership.

## Verification evidence and limits

- 2026-10-28 production configuration: the existing Web R2 account, key and secret matched the local tested values by SHA-256 comparison; bucket `newlook` matched. All four values were added to the matching Convex production deployment and read back without printing credentials. Created the Clerk production endpoint for `user.deleted` only, and saved its signing secret as a Production-only Vercel Secret. Publication and joined-flow verification follow separately below.

- Local checks passed: application/backend TypeScript, lint, the production build and 79 tests across 15 files. Coverage includes ownership/deletion/retention/retry/assessment binding, HTTP index controls and browser checks at desktop and 390px.
- The application PDF exporter was exercised with a personalised two-page guide; both rendered pages were visually checked for clipping and page numbering.
- Real credentials successfully uploaded, read and deleted a temporary R2 object containing an existing fictional catalog image; HEAD after deletion returned 404. The temporary object was removed.
- The real application OpenAI analysis call returned three schema-valid recommendations with the new preference prompt in approximately 5.3 seconds. One real image edit using the existing provider completed in approximately 43 seconds. The output was visually reviewed against the fictional source. A single fixture is not a benchmark, a guarantee of identity preservation or proof of salon feasibility.
- These isolated provider/storage checks do not prove the joined signed-in browser flow, hosted Convex worker or Clerk deletion webhook. Those deployment checks remain explicit release requirements. No production publication is implied by local validation.
