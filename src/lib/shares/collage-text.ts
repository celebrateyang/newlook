import data from "./assets/collage-glyphs.json";

// Fixed preview copy is drawn as outlines, so SVG rasterization never needs
// system fonts (which are absent in some serverless runtimes).
const glyphs: Record<string, { advance: number; path: string }> = data.glyphs;
export function collageText(text: string, x: number, y: number, size: number, anchor: "start" | "middle" | "end" = "start") {
  const scale = size / data.unitsPerEm;
  const characters = Array.from(text).map(character => {
    const glyph = glyphs[character];
    if (!glyph) throw new Error("Unsupported collage character");
    return glyph;
  });
  const width = characters.reduce((total, glyph) => total + glyph.advance * scale, 0);
  let offset = x - (anchor === "middle" ? width / 2 : anchor === "end" ? width : 0);
  return characters.map(glyph => {
    const path = glyph.path ? `<path d="${glyph.path}" transform="translate(${offset.toFixed(3)} ${y}) scale(${scale} ${-scale})"/>` : "";
    offset += glyph.advance * scale;
    return path;
  }).join("");
}
