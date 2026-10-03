import { z } from "zod";

// Browser geolocation and OSM pins use WGS84. A user-confirmed pin is not a
// verified address; GPS accuracy applies only to the unchanged device position.
export const salonLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  coordinateSystem: z.literal("WGS84"),
  source: z.enum(["geolocation", "map"]),
  accuracyMeters: z.number().finite().nonnegative().optional(),
}).refine(value => value.source !== "map" || value.accuracyMeters === undefined, {
  path: ["accuracyMeters"], message: "GPS accuracy cannot describe a manually adjusted pin.",
});

export type SalonLocation = z.infer<typeof salonLocationSchema>;

export function locationFromDevice(coords: Pick<GeolocationCoordinates, "latitude" | "longitude" | "accuracy">): SalonLocation {
  return salonLocationSchema.parse({ latitude: coords.latitude, longitude: coords.longitude, accuracyMeters: coords.accuracy, coordinateSystem: "WGS84", source: "geolocation" });
}

export function locationFromMap(latitude: number, longitude: number): SalonLocation {
  // Leaflet can pan across wrapped worlds; keep longitude in the WGS84 range.
  const wrappedLongitude = ((longitude + 180) % 360 + 360) % 360 - 180;
  return salonLocationSchema.parse({ latitude, longitude: wrappedLongitude, coordinateSystem: "WGS84", source: "map" });
}
