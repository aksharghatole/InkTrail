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

Generic chapter detection from URLs, headings and titles, including decimals, English, French, Spanish, German and common CJK numeric labels. MangaDex chapter routes and WEBTOON viewer routes have initial fixture-tested adapters. WEBTOON preserves only numeric title_no and episode_no identifiers for resume; all other query parameters are removed. On WEBTOON the visible episode label is preferred to the internal episode identifier. Completion is a heuristic (20 visible seconds and 90% page scroll); short or paginated readers may not complete automatically. The extension saves local progress, strips most URL query strings and all fragments, and opens the last chapter without restoring precise scroll position. Query-dependent readers may not resume correctly. Sources are recorded independently and can be explicitly linked into a unified story across websites. Live website compatibility has not yet been verified.

## Manage your library

Open **Manage library** from the popup (or the extension options). Search and filter series, set reading status, expand chapter history, correct chapter numbers, mark chapters read/unread, delete entries, and export or merge a JSON backup. Manual completion overrides subsequent automatic completion; a correction is remembered for its chapter URL. Deleting entries does not block future automatic tracking on that site. Imports validate and sanitize chapter URLs, retain existing series, and merge chapter progress without overwriting higher progress. Back up your library before major changes.

## Link reading websites

In Manage library, choose another source under a series and click Link stories. Exact normalized title matches appear first as suggestions; no links are created automatically. Linked stories show a unified chapter history, read counts, alternate titles, source-specific resume links and the highest tracked chapter. A chapter is shown as read in the unified view if any source marks it read; underlying source progress is kept independently. Linking existing groups joins their membership. Unlink source restores its independent view without deleting history. Rename story changes the group display label. Links are included in JSON backups; importing an existing source retains its current group if present. Chapter numbers must correspond across sources for the unified view to be meaningful; season offsets are not automatically resolved.

## Privacy

Only user-enabled websites are eligible for tracking. Page headings, titles, URL paths, image counts and scroll position are processed locally. No data is sent to a server. Disabling a site retains past history; uninstalling removes local data. Export before uninstalling.

## Development

No build step or dependencies. Run `node --test tests/*.test.cjs` with Node 22. GitHub Actions tests and packages a ZIP artifact.

## Roadmap

More site adapters, precise resume, paginated readers, permitted release alerts and optional sync.
