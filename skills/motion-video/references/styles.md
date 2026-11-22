# Styles

| Preset | Look | Fits |
|---|---|---|
| `midnight-glow` | navy-black, luminous indigo/cyan glows, Inter Tight | AI, fintech, SaaS, premium launches |
| `pastel-pop` | lilac and peach, round shapes, Nunito, bouncy | consumer apps, kids, food, lifestyle |
| `bold-type` | black, white and one loud colour, condensed Archivo caps | teasers, ads, "Introducing", events |
| `clean-light` | white and soft grey, floating cards, Plus Jakarta Sans | productivity, B2B, finance, health |
| `neon-lime` | green-black with acid lime, Space Grotesk | fitness, gaming, Gen-Z, dev tools |
| `warm-editorial` | cream paper, Fraunces serif, forest green and ochre | education, culture, food, hospitality |

## Brand a preset
Keep the preset's structure and override the variables at the top of the video (or in `style.css`):
```css
:root { --accent: #0a7b4b; --accent-ink: #fff; --accent2: #f5b700; --font: "Outfit", sans-serif; }
```
Use the brand's own font when it is on Google Fonts (add the `@import` to `style.css`) or as a local `.woff2` with
`@font-face`. Check contrast on the end card: `--end-btn` and `--end-btn-ink` must read on `--end-bg`.

## Mixing
One preset per video series, so the posts look like one campaign. Vary the template and the moves between videos,
not the palette.
