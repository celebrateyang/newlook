import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import type { StylistApplicationInput } from "../convex/stylistApplicationFields";

const modules = {
  "../convex/_generated/server.js": () => import("../convex/_generated/server"),
  "../convex/stylistApplications.ts": () => import("../convex/stylistApplications"),
};
const application: StylistApplicationInput = { name: " 小林 ", phone: "13800138000", wechat: "", city: "上海", district: "徐汇", salon: "测试门店", address: "测试地址", experienceYears: 5, specialties: ["cut", "short"], portfolioUrl: "https://example.com/work", introduction: "短发设计", consent: true };

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
  await owner.mutation(api.stylistApplications.submit, { ...application, city: "杭州" });
  expect(await owner.query(api.stylistApplications.mine, {})).toMatchObject({ _id: ids[0], city: "杭州", createdAt: original?.createdAt });
  expect(await t.run(ctx => ctx.db.query("stylistApplications").collect())).toHaveLength(1);
});

test("backend rejects missing consent, invalid contact, unsupported specialties and unsafe links", async () => {
  const t = convexTest(schema, modules).withIdentity({ subject: "stylist-owner" });
  for (const patch of [{ consent: false }, { phone: "123" }, { name: " " }, { city: " " }, { experienceYears: -1 }, { experienceYears: 1.5 }, { specialties: [] }, { specialties: ["unknown"] }, { specialties: ["cut", "cut"] }, { portfolioUrl: "javascript:alert(1)" }, { portfolioUrl: "https://user:secret@example.com" }, { introduction: "a".repeat(1001) }]) {
    await expect(t.mutation(api.stylistApplications.submit, { ...application, ...patch })).rejects.toThrow("INVALID_APPLICATION");
  }
  expect(await t.query(api.stylistApplications.mine, {})).toBeNull();
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
