# Changelog

All notable changes to this project will be documented in this file.


## [1.0.0] - 2026-11-21

### Added
- Theme renamed from Blank to Oeuvre (avoids clashing with the stock Blank theme).
- "Series (artwork gallery)" page template (`page-series.hbs`) with a per-page caption display option.
- Uncropped gallery grid styles, base layout and type.
- Home page grid of series (sub-pages of the page chosen in Theme settings → Portfolio), ordered by page hierarchy.
- "Portfolio (grid of sub-pages)" page template and `series-grid` partial.
- Main menu dropdowns and a small-screen menu toggle; social links and footer text settings.

- Clean text-page template for About/CV and Contact, with typography for headings, lists, quotes and tables.
- `scripts/preview.sh` (headless render with Publii's renderer) and `scripts/package.sh`.

- News: `posts.hbs` (post listing at the Post prefix), shared `post-list` partial, tag pages, post page with Older/Newer links; News title/intro settings.
- Fixture seeding (`scripts/seed.sh`), including filling an existing empty site (`--into-existing`).

- Look settings: accent colour, heading font (system font stacks), text size, content width.
- Accessibility: skip link, home page `<h1>`, visually-hidden utility, reduced-motion support.
- Correct `sizes` for featured images on text pages and for image blocks.
- Fixtures can set plugin settings (lightbox overlay opacity, download button).

- The original site's identity as defaults: sidebar layout, bundled Montserrat (SIL OFL), uppercase headings and menu, coral accent with an automatically readable link shade, square series covers with title bands, signature emblem in the footer. Each can be switched in Theme settings.

- Gallery wall layout for Series pages (page option "Artwork layout"): one work at a time with a museum-style label (title, details, a red dot for sold work) and the signature emblem beside it.
- Sidebar menu with fly-out panels on hover and keyboard focus (coral, then black for a deeper level); the sidebar is vertically centred and never grows or shrinks.
- Animated three-bar menu button on small screens: zooms and spreads on hover, swivels into an X when open.
- Series covers with black title labels and a heavy black frame on hover; series titles as black title cards.
- Home page falls back to the latest posts if the chosen Portfolio page no longer exists; the home introduction accepts `<br>` line breaks.

### Removed
- Author pages, tags-list page, search page, related posts, comments and Custom HTML positions.
- "Display author bio" and "Display child pages" options.

### Fixed
- Language file renamed to `oeuvre.lang.json` so Publii loads it.

### Removed
- Blog sidebar (selected posts, authors) and its theme options.

## [Blank 1.5.0.0] - 2023-04-09

### Added
- support for tagOptions
- support for authorOptions
- support for WYSIWYG for author/tag description fields
