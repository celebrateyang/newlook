import data from "./centers.json";
import { citiesForProvince, provinces, type RegionSelection } from "./index";

const centers: Record<string, (string | number)[]> = data;
export type RegionMapView = { latitude: number; longitude: number; zoom: number; name: string; level: "district" | "city" | "province" };

// Region centers are only view hints: never create a salon pin from them.
export function regionMapView(selection: RegionSelection): RegionMapView | null {
  const province = provinces.find(region => region.code === selection.provinceCode);
  if (!province) return null;
  const city = citiesForProvince(province.code).find(region => region.code === selection.cityCode);
  const district = city?.children.find(region => region.code === selection.districtCode);
  const choices = [
    { region: district, level: "district" as const, zoom: 12 },
    { region: city, level: "city" as const, zoom: 10 },
    { region: province, level: "province" as const, zoom: ["11", "12", "31", "50"].includes(province.code) ? 10 : 6 },
  ];
  for (const { region, level, zoom } of choices) {
    if (!region) continue;
    const center = centers[region.code];
    // Also validate the name in case region codes are reused after a data refresh.
    if (center?.[2] !== region.name) continue;
    return { latitude: Number(center[0]), longitude: Number(center[1]), zoom, name: region.name, level };
  }
  return null;
}
