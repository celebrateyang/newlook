import { expect, test } from "vitest";
import { locationFromDevice, locationFromMap, salonLocationSchema } from "../shared/salon-location";

test("GPS coordinates retain accuracy and map changes remove that accuracy", () => {
  const gps = locationFromDevice({ latitude: 31.2, longitude: 121.4, accuracy: 15 });
  expect(gps).toMatchObject({ coordinateSystem: "WGS84", source: "geolocation", accuracyMeters: 15 });
  const pin = locationFromMap(gps.latitude + 0.01, gps.longitude);
  expect(pin.source).toBe("map");
  expect(pin).not.toHaveProperty("accuracyMeters");
  expect(salonLocationSchema.safeParse({ ...pin, accuracyMeters: 15 }).success).toBe(false);
});

test("invalid coordinates and incompatible coordinate systems are rejected", () => {
  const pin = locationFromMap(31.2, 121.4);
  for (const patch of [{ latitude: 91 }, { longitude: 181 }, { latitude: NaN }, { longitude: Infinity }, { coordinateSystem: "GCJ-02" }, { source: "unknown" }, { source: "geolocation", accuracyMeters: -1 }]) {
    expect(salonLocationSchema.safeParse({ ...pin, ...patch }).success).toBe(false);
  }
  expect(locationFromMap(31.2, 481.4).longitude).toBeCloseTo(121.4);
});
