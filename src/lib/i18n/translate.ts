import zh from "./zh.json";
import { STARTER_HAIRSTYLES } from "../hairstyles/catalog";
import type { Locale } from "./locale";

const dictionary: Readonly<Record<string, string>> = zh;
const styleNames = Object.fromEntries(STARTER_HAIRSTYLES.map(style => [style.name, style.nameZh]));
export type Translate = (text: string | undefined, values?: Record<string, string | number>) => string;

export function translator(locale: Locale): Translate {
  return (text = "", values) => {
    let result = locale === "zh" ? dictionary[text] ?? styleNames[text] ?? text : text;
    if (values) for (const [key, value] of Object.entries(values)) result = result.replaceAll(`{${key}}`, String(value));
    return result;
  };
}
