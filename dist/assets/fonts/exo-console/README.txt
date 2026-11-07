EXO console typography — locally hosted subsets, 2026-11-06

Chakra Petch, by the Chakra Petch Project Authors (2018).
Source: https://github.com/google/fonts/tree/main/ofl/chakrapetch
Downloaded files: ChakraPetch-Medium.ttf, ChakraPetch-SemiBold.ttf
License: SIL Open Font License 1.1. Full text: OFL-ChakraPetch.txt.

WDXL Lubrifont SC, by the WDXL Lubrifont Project Authors (2025),
based on ZCOOL QingKe HuangYou Project Authors (2018-2020).
Source: https://github.com/google/fonts/tree/main/ofl/wdxllubrifontsc
Upstream: https://github.com/NightFurySL2001/WD-XL-font
Downloaded file: WDXLLubrifontSC-Regular.ttf
License: SIL Open Font License 1.1. Full text: OFL-WDXL.txt.

The shipped files are derived subsets, not the original complete fonts.
WOFF2 packaging uses FontTools subset and Brotli compression. Hinting is
removed; ccmp, locl and kern layout features are retained. Copyright and
license metadata stay in the font name table; the license files accompany
all font files. No Reserved Font Name is stated in either included license.

Latin fonts include supported glyphs within U+0020–U+024F and common instrument
symbols. Chinese includes every CJK character found in dist JS/MJS/HTML/JSON/
CSS at generation time, plus supported Chinese punctuation. All source CJK
characters were present in the upstream font. Characters outside the subset
fall back to the native Chinese font, not to missing-glyph boxes.

Use Exo Console Latin + Exo Console Han for large titles and section headings.
Use native Chinese sans for paragraphs, instructions, small controls and captions.
All fonts use font-display:swap; there are no third-party runtime font requests.

font-manifest.json contains source/output SHA-256, byte counts and character
coverage for validation. Regenerate the CJK subset when adding new headings
if they should use the display face rather than its native fallback.
