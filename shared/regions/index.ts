import data from "./china-mainland.json";
import metadata from "./metadata.json";

export const regionDatasetVersion = metadata.version;
export type Region = { code: string; name: string };
export type City = Region & { children: Region[] };
export const provinces: Region[] = data.map(({ code, name }) => ({ code, name }));

export function citiesForProvince(provinceCode: string): City[] {
  const province = data.find(item => item.code === provinceCode);
  if (!province) return [];
  // Municipalities have statistical groupings (市辖区/县), not separate cities.
  if (["11", "12", "31", "50"].includes(provinceCode)) {
    return [{ code: province.children[0].code, name: province.name, children: province.children.flatMap(city => city.children) }];
  }
  // Directly administered counties/cities are selectable by their actual name.
  return province.children.flatMap(city => city.name.endsWith("直辖县级行政区划")
    ? city.children.map(area => ({ ...area, children: [area] }))
    : [city]);
}

export type RegionSelection = { provinceCode: string; cityCode: string; districtCode: string };

export function resolveRegion(selection: RegionSelection) {
  const province = provinces.find(item => item.code === selection.provinceCode);
  const city = citiesForProvince(selection.provinceCode).find(item => item.code === selection.cityCode);
  const district = city?.children.find(item => item.code === selection.districtCode);
  if (!province || !city || !district) return null;
  return { countryCode: "CN" as const, ...selection, province: province.name, city: city.name, district: district.name, regionDatasetVersion };
}

export function changeRegion(selection: RegionSelection, key: keyof RegionSelection, value: string): RegionSelection {
  if (key === "provinceCode") {
    const cities = citiesForProvince(value);
    const city = cities.length === 1 ? cities[0] : undefined;
    return { provinceCode: value, cityCode: city?.code ?? "", districtCode: city?.children.length === 1 ? city.children[0].code : "" };
  }
  if (key === "cityCode") {
    const city = citiesForProvince(selection.provinceCode).find(item => item.code === value);
    return { ...selection, cityCode: value, districtCode: city?.children.length === 1 ? city.children[0].code : "" };
  }
  return { ...selection, districtCode: value };
}

// Transitional support for the published form: accept only an unambiguous,
// exact canonical name pair, and derive codes on the server. Never store free text.
export function resolveLegacyRegion(cityName?: string, districtName?: string) {
  const matches = provinces.flatMap(province => citiesForProvince(province.code).flatMap(city =>
    city.name === cityName?.trim() ? city.children.filter(area => area.name === districtName?.trim()).map(area =>
      ({ provinceCode: province.code, cityCode: city.code, districtCode: area.code })) : []));
  return matches.length === 1 ? matches[0] : null;
}
