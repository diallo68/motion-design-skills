# Styles

| Preset | Look | Fits |
|---|---|---|
| `midnight-glow` | navy-black, luminous indigo/cyan glows, Inter Tight | AI, fintech, SaaS, premium launches; sectors 5, 7, 8 (night), 10 |
| `pastel-pop` | lilac and peach, round shapes, Nunito, bouncy | consumer apps, kids, food, lifestyle; sectors 1, 6, 13 |
| `bold-type` | black, white and one loud colour, condensed Archivo caps | teasers, ads, "Introducing", events; sectors 1, 3, 11 |
| `clean-light` | white and soft grey, floating cards, Plus Jakarta Sans | productivity, B2B, finance, health; sectors 2, 4, 5, 7, 8, 9, 12 |
| `neon-lime` | green-black with acid lime, Space Grotesk | fitness, gaming, Gen-Z, dev tools; sectors 3, 10, 11 |
| `warm-editorial` | cream paper, Fraunces serif, forest green and ochre | education, culture, food, hospitality; sectors 2, 4, 6, 9, 12, 13 |

Sector numbers point to the cards of `references/sectors.md`. The client's palette always comes before the
preset: the preset gives the character (type, shapes, rhythm), the brand gives the colours.

## Brand a preset
Keep the preset's structure and override the variables at the top of the video (or in `style.css`):
```css
:root { --accent: #0a7b4b; --accent-ink: #fff; --accent2: #f5b700; --font: "Outfit", sans-serif; }
```
Use the brand's own font when it is on Google Fonts (add the `@import` to `style.css`) or as a local `.woff2` with
`@font-face`. Check contrast on the end card: `--end-btn` and `--end-btn-ink` must read on `--end-bg`. A dark accent
(deep green, navy) disappears on the templates' dark grounds (map-story's night map, grid-montage's band): give a
lighter tint of it as `--accent-on-dark`, as `warm-editorial` does.

## Mixing
One preset per video series, so the posts look like one campaign. Vary the template and the moves between videos,
not the palette.
