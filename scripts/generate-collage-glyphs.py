"""One-time asset generation: python -m pip install fonttools

Run with the upstream Manrope[wght].ttf path as the only argument.
The committed JSON is consumed directly; production needs no font installation.
"""
import json
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

font = instantiateVariableFont(TTFont(sys.argv[1]), {"wght": 600})
cmap = font.getBestCmap()
glyph_set = font.getGlyphSet()
characters = "Which hairstyle suits me best?newself.Help me choose · Rate A–F · No sign-in neededABCDEF"
glyphs = {}
for character in sorted(set(characters)):
    glyph_name = cmap[ord(character)]
    pen = SVGPathPen(glyph_set, ntos=lambda n: f"{n:.2f}".rstrip("0").rstrip("."))
    glyph_set[glyph_name].draw(pen)
    glyphs[character] = {"advance": font["hmtx"][glyph_name][0], "path": pen.getCommands()}
target = Path(__file__).resolve().parents[1] / "src/lib/shares/assets/collage-glyphs.json"
target.write_text(json.dumps({"unitsPerEm": font["head"].unitsPerEm, "glyphs": glyphs}, ensure_ascii=True, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Generated {len(glyphs)} glyphs: {target.name}")
