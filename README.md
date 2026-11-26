# Oeuvre: a Publii theme for artists

Oeuvre is a portfolio theme for [Publii](https://getpublii.com) (0.46 or newer, developed on 0.48.3), made for an artist's
site that is maintained entirely in Publii, with no code.

- **Series pages** (page template *Series*): a statement and a Gallery block, shown as a **gallery wall** (each work with its museum-style label and the artist's mark beside it) or as a grid. Works are never cropped.
- **Home page grid** of series covers, from the sub-pages of a chosen page (e.g. *Work*), in Pages → Edit hierarchy order.
- **About / CV and Contact** as clean text pages; **News** (posts) at the Post prefix, with tag pages and Older/Newer links.
- **Menus**: a sidebar whose sub-menus open as fly-out panels (so the sidebar never changes size), and an animated three-bar menu button on small screens.
- **Look settings**: sidebar or top menu, Montserrat (bundled, SIL OFL) or other fonts, capitals, accent colour (links use a readable shade automatically), square or whole covers, signature emblem.
- Works with the official **Core Lightbox Gallery** plugin for the enlarged view.

## Install
1. Build the zip with `scripts/package.sh` (or use a release zip): `dist/oeuvre-<version>.zip`.
2. In Publii: ⋯ → **Themes** → **Install theme** (or drag the zip onto the Themes screen).
3. Site settings → **Theme** → *Oeuvre* → Save. Install and enable **Core Lightbox Gallery** under Plugins.
4. Site settings → URLs → **Post prefix**: `news` if you want a News page. Theme → Custom settings → Portfolio → **Portfolio page**.

## License and credits
MIT. Based on the Publii *Blank* starter theme by TidyCustoms. Montserrat © The Montserrat Project Authors, SIL Open Font License 1.1 (`assets/fonts/montserrat/OFL.txt`).

Author: Adeeb Missaghi (AdeebMDesign)

### Development

Test against a separate Publii test site (default name `oeurve-test`), never the live site.

- `scripts/preview.sh [site] [--serve]` copies the test site to a temporary folder, drops in this working copy of the theme, and renders it with Publii's own renderer (the installed app, run in Node mode). No GUI is needed. Add `--serve` to view it at http://127.0.0.1:8765/.
- `scripts/seed.sh` (Publii closed) builds a throwaway `oeuvre-dev` site from `fixtures/` with Publii's own code. Then run `scripts/preview.sh oeuvre-dev`. See `fixtures/oeuvre-dev.json` for the fixture format.
- `scripts/package.sh` builds `dist/oeuvre-<version>.zip` for **⋯ → Themes → Install theme**.
- After changing `config.json`, Publii only picks up new templates and options after **Site settings → Theme ⋮ → Reinstall Oeuvre from your theme library → Save settings**.

Requires Publii 0.46 or newer (Pages). Developed against 0.48.3 with the Core Lightbox Gallery plugin.
