# Approximate map starting points

`centers.json` is a local snapshot of Wikidata structured data, released under
[CC0](https://www.wikidata.org/wiki/Wikidata:Licensing). No map/search API key or
online address lookup is needed. It is separate from the canonical administrative
names/codes dataset. These are representative coordinates, sometimes government
seats, not exact centroids or boundary definitions.

Each key is an existing region code, and each value is
`[WGS84 latitude, longitude, canonical name, Wikidata entity ID]`.
The extraction matches P442 administrative codes and Chinese labels against our
region snapshot, uses simplified Chinese labels when available, excludes
conflicting entities/coordinates, and normalizes 9-digit town codes to 12 digits.
Province labels may omit the suffix 省. Source hashes, retrieval time and coverage
are recorded in `centers-metadata.json`. The initial extraction covers 31
provinces, 355 raw city nodes and 2,711 district/town nodes. Coverage is incomplete;
newer divisions and supplemental functional areas may lack coordinates.

`map-view.ts` validates the selected hierarchy and names, then uses district →
city → province → national view fallback. Municipalities use their province
point for a city view. A district starts at zoom 12; this is an approximate nearby
view, not a fit of its entire boundary. No center becomes a marker or saved salon
coordinate. Confirmed/device points take precedence.

To refresh, run the SPARQL query in `scripts/update-region-centers.mjs` through
the [Wikidata Query Service](https://query.wikidata.org/), save its JSON response,
then run `node scripts/update-region-centers.mjs <snapshot.json>`.
Review the diff, coverage, names and coordinates before publishing. No query runs
at runtime, and the user's address/contact data is never sent to Wikidata.
