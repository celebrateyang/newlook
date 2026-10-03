import { expect, test } from "vitest";
import { pageMetadata, PUBLIC_PATHS, SITE_URL } from "../src/lib/seo/site";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
import { GET } from "../src/app/llms.txt/route";

test("Chinese public pages have distinct metadata and matching language canonicals", () => {
  const titles = new Set();
  for (const route of PUBLIC_PATHS) {
    const metadata = pageMetadata("zh", `/zh${route}/`);
    titles.add(JSON.stringify(metadata.title));
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/zh${route}`);
    expect(metadata.alternates?.languages?.en).toBe(`${SITE_URL}/en${route}`);
    expect(metadata.alternates?.languages?.["zh-CN"]).toBe(metadata.alternates?.canonical);
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({ locale: "zh_CN", description: metadata.description, url: metadata.alternates?.canonical });
  }
  expect(titles.size).toBe(PUBLIC_PATHS.length);
});

test("private, shared, login and duplicate tool pages cannot be indexed", () => {
  for (const locale of ["zh", "en"] as const) {
    for (const route of ["/results/private-id", "/looks", "/share/token", "/poll/token", "/sign-in", "/sign-in/sso-callback", "/upload"]) {
      const metadata = pageMetadata(locale, `/${locale}${route}`);
      expect(metadata.robots).toMatchObject({ index: false });
      expect(metadata.alternates?.languages).toBeUndefined();
    }
  }
});

test("sitemap contains only public official URLs with reciprocal language links", () => {
  const entries = sitemap();
  expect(entries).toHaveLength(PUBLIC_PATHS.length * 2);
  expect(new Set(entries.map(entry => entry.url)).size).toBe(entries.length);
  for (const entry of entries) {
    expect(entry.url).toMatch(/^https:\/\/newself\.cc\/(en|zh)(\/|$)/);
    expect(entry.lastModified).toBeUndefined();
    for (const url of Object.values(entry.alternates?.languages ?? {})) {
      expect(entries.some(other => other.url === url)).toBe(true);
      const counterpart = entries.find(other => other.url === url);
      expect(Object.values(counterpart?.alternates?.languages ?? {})).toContain(entry.url);
    }
  }
});

test("crawler policy permits public search and AI discovery without blocking noindex pages", () => {
  expect(robots()).toEqual({ rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/trpc/"] }, sitemap: `${SITE_URL}/sitemap.xml` });
});

test("AI text reference includes public facts and links without user-resource URLs", async () => {
  const response = GET();
  expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  const text = await response.text();
  expect(text).toContain(`${SITE_URL}/zh/pricing`);
  expect(text).toContain("6 次生成");
  expect(text).toContain("默认私有");
  expect(text).toContain("尚未开放");
  expect(text).not.toMatch(/\/results\/|\/share\/|\/poll\/|r2Key|userId/);
});
