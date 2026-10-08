# Font sources

`roboto-mono-variable.ttf` is Roboto Mono `[wght]` from
[google/fonts](https://github.com/google/fonts/tree/main/ofl/robotomono)
(SIL OFL 1.1, see `roboto-mono-ofl.txt`). It is the face joyco.studio uses for
its mono voice.

The MSDF atlases in `public/fonts` are baked from it with lettra:

```bash
pnpm exec lettra bake fonts-src/roboto-mono-variable.ttf \
  --weights 400,500,600,700 --charset ./fonts-src/charset.txt \
  --size 64 --pxrange 8 --out public/fonts/roboto-mono
```

`charset.txt` is ASCII printable plus the typographic marks the site copy uses
(`° ′ ″ · …`, dashes, curly quotes, Spanish accents). Roboto Mono has no
box-drawing, block or arrow glyphs: the ASCII logo is drawn as quads by
`src/gl/ascii-logo.ts` instead, and UI copy avoids the rest.

Kerning reports 0 pairs: expected for a monospace face.
