import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import type { StylistApplicationInput } from "../convex/stylistApplicationFields";

const modules = {
  "../convex/_generated/server.js": () => import("../convex/_generated/server"),
  "../convex/stylistApplications.ts": () => import("../convex/stylistApplications"),
};
const application: StylistApplicationInput = { name: " 小林 ", phone: "13800138000", wechat: "", provinceCode: "31", cityCode: "3101", districtCode: "310104", salon: "测试门店", address: "测试路 10 号 2 楼", experienceYears: 5, specialties: ["cut", "short"], portfolioUrl: "https://example.com/work", introduction: "短发设计", consent: true };

test("applications require authentication for every read and mutation", async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(api.stylistApplications.mine, {})).rejects.toThrow("UNAUTHENTICATED");
  await expect(t.mutation(api.stylistApplications.submit, application)).rejects.toThrow("UNAUTHENTICATED");
  await expect(t.mutation(api.stylistApplications.withdraw, {})).rejects.toThrow("UNAUTHENTICATED");
});

test("applicants can only read, update and withdraw their own application", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "stylist-owner" });
  const other = t.withIdentity({ subject: "other-stylist" });
  const id = await owner.mutation(api.stylistApplications.submit, application);
  expect(await other.query(api.stylistApplications.mine, {})).toBeNull();
  await other.mutation(api.stylistApplications.withdraw, {});
  expect(await owner.query(api.stylistApplications.mine, {})).toMatchObject({ _id: id, name: "小林", status: "received", consentVersion: "stylist-recruitment-v1" });
  await other.mutation(api.stylistApplications.submit, { ...application, name: "另一个理发师" });
  await owner.mutation(api.stylistApplications.withdraw, {});
  expect(await owner.query(api.stylistApplications.mine, {})).toBeNull();
  expect((await other.query(api.stylistApplications.mine, {}))?.name).toBe("另一个理发师");
});

test("repeat and concurrent submissions keep one application per account", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "stylist-owner" });
  const ids = await Promise.all([owner.mutation(api.stylistApplications.submit, application), owner.mutation(api.stylistApplications.submit, application)]);
  expect(ids[0]).toBe(ids[1]);
  const original = await owner.query(api.stylistApplications.mine, {});
  await owner.mutation(api.stylistApplications.submit, { ...application, provinceCode: "33", cityCode: "3301", districtCode: "330106" });
  expect(await owner.query(api.stylistApplications.mine, {})).toMatchObject({ _id: ids[0], province: "浙江省", city: "杭州市", district: "西湖区", districtCode: "330106", createdAt: original?.createdAt });
  expect(await t.run(ctx => ctx.db.query("stylistApplications").collect())).toHaveLength(1);
});

test("backend rejects missing consent, invalid contact, unsupported specialties and unsafe links", async () => {
  const t = convexTest(schema, modules).withIdentity({ subject: "stylist-owner" });
  for (const patch of [{ consent: false }, { phone: "123" }, { name: " " }, { provinceCode: " " }, { address: " " }, { districtCode: "330106" }, { cityCode: "1101" }, { provinceCode: "81" }, { experienceYears: -1 }, { experienceYears: 1.5 }, { specialties: [] }, { specialties: ["unknown"] }, { specialties: ["cut", "cut"] }, { portfolioUrl: "javascript:alert(1)" }, { portfolioUrl: "https://user:secret@example.com" }, { introduction: "a".repeat(1001) }]) {
    await expect(t.mutation(api.stylistApplications.submit, { ...application, ...patch })).rejects.toThrow("INVALID_APPLICATION");
  }
  expect(await t.query(api.stylistApplications.mine, {})).toBeNull();
});

test("region names are derived from codes and indexed for future location filtering", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "stylist-owner" });
  await owner.mutation(api.stylistApplications.submit, { ...application, city: "伪造城市", district: "伪造区县" });
  expect(await owner.query(api.stylistApplications.mine, {})).toMatchObject({ countryCode: "CN", province: "上海市", city: "上海市", district: "徐汇区", regionDatasetVersion: "cn-division-2026.0.1-88f2021-v1" });
  const matches = await t.run(ctx => ctx.db.query("stylistApplications").withIndex("by_service_region", q => q.eq("countryCode", "CN").eq("provinceCode", "31").eq("cityCode", "3101").eq("districtCode", "310104")).collect());
  expect(matches).toHaveLength(1);
});

test("published legacy form can submit canonical names but arbitrary or partial regions are rejected", async () => {
  const t = convexTest(schema, modules).withIdentity({ subject: "stylist-owner" });
  const legacy = { ...application, provinceCode: undefined, cityCode: undefined, districtCode: undefined };
  await t.mutation(api.stylistApplications.submit, { ...legacy, city: "上海市", district: "徐汇区" });
  expect(await t.query(api.stylistApplications.mine, {})).toMatchObject({ provinceCode: "31", cityCode: "3101", districtCode: "310104" });
  await expect(t.mutation(api.stylistApplications.submit, { ...legacy, city: "随意填写", district: "徐汇区" })).rejects.toThrow("INVALID_APPLICATION");
  await expect(t.mutation(api.stylistApplications.submit, { ...legacy, city: "上海市", district: "徐汇区", provinceCode: "31" })).rejects.toThrow("INVALID_APPLICATION");
});

test("town-level salon applications retain the full source code", async () => {
  const owner = convexTest(schema, modules).withIdentity({ subject: "dongguan-stylist" });
  await owner.mutation(api.stylistApplications.submit, { ...application, provinceCode: "44", cityCode: "4419", districtCode: "441900003000" });
  expect(await owner.query(api.stylistApplications.mine, {})).toMatchObject({ city: "东莞市", district: "东城街道", districtCode: "441900003000" });
});

test("optional coordinates persist privately, can be replaced or removed and get a server timestamp", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "located-stylist" });
  const pin = { latitude: 31.2, longitude: 121.4, coordinateSystem: "WGS84" as const, source: "geolocation" as const, accuracyMeters: 10 };
  await owner.mutation(api.stylistApplications.submit, { ...application, location: pin });
  const saved = await owner.query(api.stylistApplications.mine, {});
  expect(saved?.location).toMatchObject(pin);
  expect(saved?.location?.confirmedAt).toBeGreaterThan(0);
  expect(await t.withIdentity({ subject: "other" }).query(api.stylistApplications.mine, {})).toBeNull();
  await owner.mutation(api.stylistApplications.submit, { ...application, name: "Updated name" });
  expect((await owner.query(api.stylistApplications.mine, {}))?.location).toEqual(saved?.location);
  await owner.mutation(api.stylistApplications.submit, { ...application, location: { latitude: 31.21, longitude: 121.41, coordinateSystem: "WGS84", source: "map" } });
  expect((await owner.query(api.stylistApplications.mine, {}))?.location).toMatchObject({ latitude: 31.21, source: "map" });
  expect((await owner.query(api.stylistApplications.mine, {}))?.location).not.toHaveProperty("accuracyMeters");
  await owner.mutation(api.stylistApplications.submit, { ...application, location: null });
  expect((await owner.query(api.stylistApplications.mine, {}))?.location).toBeNull();
});

test("address-only saves work and legacy address changes clear stale coordinates", async () => {
  const owner = convexTest(schema, modules).withIdentity({ subject: "located-stylist" });
  await owner.mutation(api.stylistApplications.submit, application);
  expect((await owner.query(api.stylistApplications.mine, {}))?.location).toBeNull();
  const location = { latitude: 31.2, longitude: 121.4, coordinateSystem: "WGS84" as const, source: "map" as const };
  await owner.mutation(api.stylistApplications.submit, { ...application, location });
  await owner.mutation(api.stylistApplications.submit, { ...application, address: "另一个门店地址" });
  expect((await owner.query(api.stylistApplications.mine, {}))?.location).toBeNull();
  await owner.mutation(api.stylistApplications.submit, { ...application, location });
  await owner.mutation(api.stylistApplications.submit, { ...application, provinceCode: "33", cityCode: "3301", districtCode: "330106" });
  expect((await owner.query(api.stylistApplications.mine, {}))?.location).toBeNull();
});

test("backend rejects invalid pin ranges and misleading GPS accuracy for map pins", async () => {
  const owner = convexTest(schema, modules).withIdentity({ subject: "located-stylist" });
  const pin = { latitude: 31.2, longitude: 121.4, coordinateSystem: "WGS84" as const, source: "map" as const };
  for (const patch of [{ latitude: 91 }, { longitude: -181 }, { accuracyMeters: 10 }]) {
    await expect(owner.mutation(api.stylistApplications.submit, { ...application, location: { ...pin, ...patch } })).rejects.toThrow("INVALID_APPLICATION");
  }
});

test("withdrawal deletes contact details and allows a fresh application", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "stylist-owner" });
  const first = await owner.mutation(api.stylistApplications.submit, application);
  await owner.mutation(api.stylistApplications.withdraw, {});
  expect(await t.run(ctx => ctx.db.query("stylistApplications").collect())).toEqual([]);
  const next = await owner.mutation(api.stylistApplications.submit, { ...application, portfolioUrl: "" });
  expect(next).not.toBe(first);
});
