import { z } from "zod";
import { resolveRegion } from "../shared/regions";
import { salonLocationSchema } from "../shared/salon-location";

export const stylistSpecialties = ["cut", "short", "layers", "perm", "color", "men", "curly"] as const;
export const stylistApplicationSchema = z.object({
  name: z.string().trim().min(1).max(50),
  phone: z.string().trim().regex(/^1[3-9]\d{9}$/),
  wechat: z.string().trim().max(50),
  provinceCode: z.string().regex(/^\d{2}$/),
  cityCode: z.string().regex(/^\d{4}(\d{2})?$/),
  districtCode: z.string().regex(/^\d{6}(\d{6})?$/),
  salon: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(200),
  location: salonLocationSchema.nullable().optional(),
  experienceYears: z.number().int().min(0).max(60),
  specialties: z.array(z.enum(stylistSpecialties)).min(1).max(stylistSpecialties.length).refine(items => new Set(items).size === items.length),
  portfolioUrl: z.union([z.literal(""), z.url().max(500).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  })]),
  introduction: z.string().trim().max(1000),
  consent: z.literal(true),
}).refine(input => resolveRegion(input) !== null, { path: ["districtCode"], message: "Select a valid province, city and district." });
export type StylistApplicationInput = z.infer<typeof stylistApplicationSchema>;
