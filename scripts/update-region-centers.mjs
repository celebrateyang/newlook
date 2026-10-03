import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Refresh deliberately from a reviewed Wikidata query snapshot, not on app startup.
// Query: SELECT ?item ?code ?coord ?label WHERE { ?item wdt:P442 ?code;
// wdt:P625 ?coord. OPTIONAL { ?item rdfs:label ?hans. FILTER(LANG(?hans)="zh-hans") }
// OPTIONAL { ?item rdfs:label ?zh. FILTER(LANG(?zh)="zh") } BIND(COALESCE(?hans, ?zh) AS ?label) }
const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/update-region-centers.mjs <Wikidata SPARQL JSON snapshot>");
const raw = await readFile(input, "utf8");
const rows = JSON.parse(raw.replace(/^\uFEFF/, "")).results.bindings;
const regions = JSON.parse(await readFile(new URL("../shared/regions/china-mainland.json", import.meta.url), "utf8"));
const candidates = new Map();
for (const row of rows) {
  const compactCode = row.code.value.replace(/\s/g, "");
  const code = compactCode.length === 9 ? compactCode.padEnd(12, "0") : compactCode;
  const match = /^Point\(([-\d.]+) ([-\d.]+)\)$/.exec(row.coord.value);
  if (!match || !row.label) continue;
  const longitude = Number(match[1]), latitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 15 || latitude > 55 || longitude < 73 || longitude > 136) continue;
  const entry = [latitude, longitude, row.label.value, row.item.value.split("/").at(-1)];
  const list = candidates.get(code) ?? [];
  if (!list.some(item => JSON.stringify(item) === JSON.stringify(entry))) list.push(entry);
  candidates.set(code, list);
}
const centers = {};
const counts = { province: 0, city: 0, district: 0 };
function add(region, kind) {
  // Wikidata stores short province/city codes and occasionally six-digit ones.
  const keys = [...new Set([region.code, region.code.padEnd(6, "0")])];
  const matches = keys.flatMap(key => candidates.get(key) ?? []).filter(item => item[2] === region.name || (kind === "province" && region.name === `${item[2]}省`));
  // Conflicting coordinates/entities are excluded rather than selected arbitrarily.
  if (matches.length === 1 && !centers[region.code]) { centers[region.code] = [matches[0][0], matches[0][1], region.name, matches[0][3]]; counts[kind]++; }
}
for (const province of regions) {
  add(province, "province");
  for (const city of province.children) {
    add(city, "city");
    for (const district of city.children) add(district, "district");
  }
}
if (!centers["310110"] || counts.province !== 31 || counts.district < 2000) throw new Error(`Insufficient coverage: ${JSON.stringify(counts)}; missing provinces: ${regions.filter(p => !centers[p.code]).map(p => p.name).join(", ")}`);
const output = JSON.stringify(Object.fromEntries(Object.entries(centers).sort(([a], [b]) => a.localeCompare(b)))) + "\n";
await writeFile(new URL("../shared/regions/centers.json", import.meta.url), output);
await writeFile(new URL("../shared/regions/centers-metadata.json", import.meta.url), JSON.stringify({
  source: "Wikidata P442 (China division code), P625 (coordinate location), Chinese label",
  license: "CC0-1.0", retrievedAt: new Date().toISOString(),
  snapshotSha256: createHash("sha256").update(raw).digest("hex"),
  outputSha256: createHash("sha256").update(output).digest("hex"), counts,
  coordinateSystem: "WGS84", purpose: "Approximate initial map view only; not salon coordinates or administrative boundaries",
}, null, 2) + "\n");
console.log(JSON.stringify(counts));
