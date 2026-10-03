import { v } from "convex/values";

const fields = {
  latitude: v.number(), longitude: v.number(), coordinateSystem: v.literal("WGS84"),
  source: v.union(v.literal("geolocation"), v.literal("map")), accuracyMeters: v.optional(v.number()),
};
export const salonLocationInput = v.union(v.null(), v.object(fields));
export const savedSalonLocation = v.union(v.null(), v.object({ ...fields, confirmedAt: v.number() }));
