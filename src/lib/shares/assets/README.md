Preview lettering is a subset of Manrope and Noto Sans SC at weight 600 converted to SVG outlines.
Source: https://github.com/google/fonts/tree/main/ofl/manrope
License: SIL Open Font License 1.1, included in OFL-Manrope.txt.
Chinese source: https://github.com/google/fonts/tree/main/ofl/notosanssc
Chinese license: OFL-NotoSansSC.txt.

To regenerate, install Python fonttools and run:
`python scripts/generate-collage-glyphs.py path/to/Manrope[wght].ttf path/to/NotoSansSC[wght].ttf`.

Only fixed English/Chinese preview copy and A–F labels are supported. Do not pass user
titles or arbitrary translated text to this renderer without adding glyphs.
The JSON is bundled through a static import; no fontconfig, system font, remote
font download, or runtime asset file read is required.
