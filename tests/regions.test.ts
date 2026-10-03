import { expect, test } from "vitest";
import { changeRegion, citiesForProvince, provinces, resolveRegion } from "../shared/regions";

test("mainland dataset includes selectable regions for all 31 provinces", () => {
  expect(provinces).toHaveLength(31);
  for (const province of provinces) {
    const cities = citiesForProvince(province.code);
    expect(cities.length).toBeGreaterThan(0);
    expect(new Set(cities.map(city => city.code)).size).toBe(cities.length);
    for (const city of cities) {
      expect(city.children.length).toBeGreaterThan(0);
      for (const area of city.children) {
        expect(resolveRegion({ provinceCode: province.code, cityCode: city.code, districtCode: area.code })).toMatchObject({ province: province.name, city: city.name, district: area.name });
      }
    }
  }
});

test("municipalities combine urban districts and counties; direct counties and towns remain selectable", () => {
  expect(citiesForProvince("50")).toHaveLength(1);
  expect(resolveRegion({ provinceCode: "50", cityCode: "5001", districtCode: "500235" })).toMatchObject({ city: "重庆市", district: "云阳县" });
  expect(resolveRegion({ provinceCode: "46", cityCode: "469001", districtCode: "469001" })).toMatchObject({ city: "五指山市", district: "五指山市" });
  expect(resolveRegion({ provinceCode: "44", cityCode: "4419", districtCode: "441900003000" })).toMatchObject({ city: "东莞市", district: "东城街道" });
  expect(resolveRegion({ provinceCode: "81", cityCode: "8101", districtCode: "810101" })).toBeNull();
});

test("refreshed administrative snapshot includes newer regions and preserves town codes", () => {
  expect(resolveRegion({ provinceCode: "46", cityCode: "4603", districtCode: "460302" })).toMatchObject({ district: "西沙区" });
  expect(resolveRegion({ provinceCode: "46", cityCode: "4603", districtCode: "460303" })).toMatchObject({ district: "南沙区" });
  expect(resolveRegion({ provinceCode: "54", cityCode: "5404", districtCode: "540481" })).toMatchObject({ district: "米林市" });
  expect(resolveRegion({ provinceCode: "65", cityCode: "659013", districtCode: "659013" })).toMatchObject({ city: "草湖市" });
  expect(resolveRegion({ provinceCode: "44", cityCode: "4419", districtCode: "441900401000" })).toMatchObject({ district: "松山湖" });
  expect(resolveRegion({ provinceCode: "46", cityCode: "4603", districtCode: "460321" })).toBeNull();
});

test("changing a parent clears dependent selections and only auto-selects a unique option", () => {
  const shanghai = { provinceCode: "31", cityCode: "3101", districtCode: "310104" };
  expect(changeRegion(shanghai, "provinceCode", "33")).toEqual({ provinceCode: "33", cityCode: "", districtCode: "" });
  expect(changeRegion(shanghai, "provinceCode", "11")).toEqual({ provinceCode: "11", cityCode: "1101", districtCode: "" });
  expect(changeRegion({ provinceCode: "33", cityCode: "3301", districtCode: "330106" }, "cityCode", "3302")).toEqual({ provinceCode: "33", cityCode: "3302", districtCode: "" });
  expect(changeRegion({ provinceCode: "46", cityCode: "4601", districtCode: "460105" }, "cityCode", "469001")).toEqual({ provinceCode: "46", cityCode: "469001", districtCode: "469001" });
});
