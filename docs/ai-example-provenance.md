# Public AI edit example provenance

- Produced: 2026-10-27, as an integration/visual smoke check for recommendation readiness.
- Source: `public/images/hairstyles/catalog/french-bob-v1.webp`, an existing reviewed newself fictional catalog model. See `hairstyle-library-production.md` and `hairstyle-catalog.md`.
- Output: `public/images/examples/curtain-bangs-api-example-v1.webp`, copied without image manipulation from the real application image provider's output.
- Output SHA-256: `e9a7fee13496fe97236153bee91cd04f9e6f03038a5c67ba1fabf2ffc200a06e`.
- Task: `hair_try_on`, one curtain-bangs edit using `buildHairTryOnPrompt` and the existing OpenAI provider. The source and request contain no customer photo or account data.
- Configured model fallback used by this check: `gpt-image-2.5-sunburst`. Output: 1254×1254 WebP. Observed generation duration: 43,066 ms, not an advertised latency guarantee.
- The source and output were visually compared. This is one fictional-model example, not a benchmark, automatic identity certification, customer testimonial, stylist review or real haircut outcome.
- Keep the public caption and accessible descriptions explicit about the fictional source and AI edit. Do not present the independent fictional consultation scenario lower on the page as this model's measured personal profile.
