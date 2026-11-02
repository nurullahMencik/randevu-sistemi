"""Builds the tiny "Turkish" font subsets used next to the stock Latin subsets.

Fontsource splits Inter and Fraunces into unicode-range subsets. Turkish text needs only six
glyphs from the large latin-ext subset (Ğ ğ İ Ş ş, plus the lira sign), so instead of downloading
~120 kB of latin-ext we ship these subsets of a few kB each.

    python3 -m pip install fonttools brotli   # once
    python3 scripts/subset-fonts.py
"""

from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
SOURCES = {
    "inter-turkish-wght.woff2": "node_modules/@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2",
    "fraunces-turkish-wght.woff2": "node_modules/@fontsource-variable/fraunces/files/fraunces-latin-ext-wght-normal.woff2",
}
UNICODES = [0x011E, 0x011F, 0x0130, 0x015E, 0x015F, 0x20BA]

for target, source in SOURCES.items():
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    font = subset.load_font(str(ROOT / source), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)
    out = ROOT / "src" / "assets" / "fonts" / target
    subset.save_font(font, str(out), options)
    print(f"{out.relative_to(ROOT)}: {out.stat().st_size} bytes")
