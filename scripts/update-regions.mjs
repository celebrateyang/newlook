import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

// Updates are explicitly pinned and reviewed; never replace the dataset at runtime.
const revision = "88f2021ea21769bdb95d93699d8a625fcd9165ef";
const source = `https://raw.githubusercontent.com/kk-418/cn-division/${revision}/dist/code/pca.json`;
const directory = new URL("../shared/regions/", import.meta.url);
const response = await fetch(source, { signal: AbortSignal.timeout(20_000) });
if (!response.ok) throw new Error(`Region download failed: HTTP ${response.status}`);
const body = await response.text();
const input = JSON.parse(body);
if (!Array.isArray(input)) throw new Error("Invalid region root");

function node(item, pattern, children) {
  const code = String(item.c);
  if (!pattern.test(code) || typeof item.n !== "string" || !item.n.trim()) throw new Error(`Invalid region: ${code}`);
  return { code, name: item.n, ...(children ? { children } : {}) };
}
function unique(items, label) {
  if (!items.length || new Set(items.map(item => item.code)).size !== items.length) throw new Error(`Empty or duplicate ${label}`);
  return items;
}
const data = unique(input.map(province => node(province, /^\d{2}$/, unique(province.ch.map(city =>
  node(city, /^\d{4}(\d{2})?$/, unique(city.ch.map(area => node(area, /^\d{6}(\d{6})?$/)), "areas"))), "cities"))), "provinces");
const cities = data.flatMap(province => province.children);
const areas = cities.flatMap(city => city.children);
if (data.length !== 31 || cities.length < 330 || areas.length < 2800 || data.some(province => ["71", "81", "82"].includes(province.code))) {
  throw new Error("Incomplete or out-of-scope mainland snapshot; existing data preserved");
}
unique(areas, "global areas");
const oldData = JSON.parse(await readFile(new URL("china-mainland.json", directory), "utf8"));
const oldAreas = new Map(oldData.flatMap(province => province.children.flatMap(city => city.children)).map(area => [area.code, area.name]));
const newAreas = new Map(areas.map(area => [area.code, area.name]));
const added = areas.filter(area => !oldAreas.has(area.code)).length;
const removed = [...oldAreas.keys()].filter(code => !newAreas.has(code)).length;
const renamed = areas.filter(area => oldAreas.has(area.code) && oldAreas.get(area.code) !== area.name).length;
const licenseResponse = await fetch(`https://raw.githubusercontent.com/kk-418/cn-division/${revision}/LICENSE`, { signal: AbortSignal.timeout(20_000) });
if (!licenseResponse.ok) throw new Error("License download failed; existing data preserved");
const license = await licenseResponse.text();
const metadata = {
  version: "cn-division-2026.0.1-88f2021-v1",
  source, revision, upstreamVersion: "2026.0.1", upstreamCommitDate: "2026-09-02",
  upstreamDeclaredSource: "https://dmfw.mca.gov.cn/9095/xzqh/getList",
  sourceSha256: createHash("sha256").update(body).digest("hex"),
  counts: { provinces: data.length, cityNodes: cities.length, areaNodes: areas.length },
};
await writeFile(new URL("china-mainland.json", directory), JSON.stringify(data) + "\n");
await writeFile(new URL("metadata.json", directory), JSON.stringify(metadata, null, 2) + "\n");
await writeFile(new URL("LICENSE", directory), license);
console.log(JSON.stringify({ ...metadata.counts, added, removed, renamed, version: metadata.version }, null, 2));
