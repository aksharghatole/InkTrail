# InkTrail

Every chapter. Every story. Never lose your place.

Local-first manga, manhua and manhwa reading tracker for Chromium browsers. No account, backend, paid API or analytics.

## Install (developer mode)

1. Download the repository ZIP and extract it.
2. Open `chrome://extensions` (Edge: `edge://extensions`; Brave: `brave://extensions`).
3. Enable Developer mode, click Load unpacked, and select the `extension/` folder.
4. Open a reading site, click InkTrail and enable tracking for that site. Approve its permission.
5. Open a chapter and read for at least 10 visible seconds. Open the popup to see progress, resume or export.

## Current scope

Generic English chapter detection from URLs, headings and titles, including decimals. Completion is a heuristic (20 visible seconds and 90% page scroll); short or paginated readers may not complete automatically. The extension saves local progress, strips URL query strings and fragments, and opens the last chapter without restoring precise scroll position. Query-dependent readers may not resume correctly. Series are grouped by title and origin; cross-site merging is not implemented. Live website compatibility has not yet been verified.

## Privacy

Only user-enabled websites are eligible for tracking. Page headings, titles, URL paths, image counts and scroll position are processed locally. No data is sent to a server. Disabling a site retains past history; uninstalling removes local data. Export before uninstalling.

## Development

No build step or dependencies. Run `node --test tests/*.test.cjs` with Node 22. GitHub Actions tests and packages a ZIP artifact.

## Roadmap

Site adapters, manual correction/deletion, import, cross-site merging, precise resume, paginated readers, permitted release alerts and optional sync.
