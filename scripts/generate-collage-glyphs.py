"""One-time asset generation: python -m pip install fonttools

Run with upstream Manrope[wght].ttf and NotoSansSC[wght].ttf paths.
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
characters = "Which hairstyle suits me best?newself.Help me choose · Rate A–FABCDEF"
glyphs = {}
for character in sorted(set(characters)):
    glyph_name = cmap[ord(character)]
    pen = SVGPathPen(glyph_set, ntos=lambda n: f"{n:.2f}".rstrip("0").rstrip("."))
    glyph_set[glyph_name].draw(pen)
    glyphs[character] = {"advance": font["hmtx"][glyph_name][0], "path": pen.getCommands()}
chinese = TTFont(sys.argv[2])
# Only instantiate the required Chinese glyphs, keeping generation fast.
from fontTools import subset
options = subset.Options()
subsetter = subset.Subsetter(options=options)
subsetter.populate(text="哪款发型最适合我？帮我选发型给评分")
subsetter.subset(chinese)
chinese = instantiateVariableFont(chinese, {"wght": 600})
chinese_glyphs = chinese.getGlyphSet()
ratio = font["head"].unitsPerEm / chinese["head"].unitsPerEm
from fontTools.pens.transformPen import TransformPen
for character in sorted(set("哪款发型最适合我？帮我选发型给评分")):
    glyph_name = chinese.getBestCmap()[ord(character)]
    pen = SVGPathPen(chinese_glyphs, ntos=lambda n: f"{n:.2f}".rstrip("0").rstrip("."))
    chinese_glyphs[glyph_name].draw(TransformPen(pen, (ratio, 0, 0, ratio, 0, 0)))
    glyphs[character] = {"advance": chinese["hmtx"][glyph_name][0] * ratio, "path": pen.getCommands()}
target = Path(__file__).resolve().parents[1] / "src/lib/shares/assets/collage-glyphs.json"
target.write_text(json.dumps({"unitsPerEm": font["head"].unitsPerEm, "glyphs": glyphs}, ensure_ascii=True, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Generated {len(glyphs)} glyphs: {target.name}")
