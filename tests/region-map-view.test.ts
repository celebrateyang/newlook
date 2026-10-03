import { expect, test } from "vitest";
import { regionMapView } from "../shared/regions/map-view";
import centers from "../shared/regions/centers.json";
import { citiesForProvince, provinces } from "../shared/regions";

test("opens near Yangpu without creating a salon coordinate", () => {
  expect(regionMapView({ provinceCode: "31", cityCode: "3101", districtCode: "310110" })).toMatchObject({ name: "杨浦区", level: "district", zoom: 12, latitude: 31.26174, longitude: 121.52172 });
});

test("validates hierarchy and falls back to city/province for missing coordinates", () => {
  expect(regionMapView({ provinceCode: "33", cityCode: "3301", districtCode: "310110" })).toMatchObject({ name: "杭州市", level: "city", zoom: 10 });
  expect(regionMapView({ provinceCode: "31", cityCode: "3101", districtCode: "" })).toMatchObject({ name: "上海市", level: "province", zoom: 10 });
  expect(regionMapView({ provinceCode: "", cityCode: "3101", districtCode: "310110" })).toBeNull();
  expect(regionMapView({ provinceCode: "81", cityCode: "", districtCode: "" })).toBeNull();
  // Newly introduced divisions missing from Wikidata use their known parent.
  expect(regionMapView({ provinceCode: "65", cityCode: "659013", districtCode: "659013" })).toMatchObject({ name: "新疆维吾尔自治区", level: "province" });
});

test("all selectable regions get a finite view and all snapshot points are plausible", () => {
  for (const center of Object.values(centers)) {
    expect(center[0]).toBeGreaterThanOrEqual(15);
    expect(center[0]).toBeLessThanOrEqual(55);
    expect(center[1]).toBeGreaterThanOrEqual(73);
    expect(center[1]).toBeLessThanOrEqual(136);
  }
  for (const province of provinces) for (const city of citiesForProvince(province.code)) for (const district of city.children) {
    expect(regionMapView({ provinceCode: province.code, cityCode: city.code, districtCode: district.code })).not.toBeNull();
  }
});
