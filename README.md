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

Generic chapter detection from URLs, headings and titles, including decimals, English, French, Spanish, German and common CJK numeric labels. MangaDex chapter routes and WEBTOON viewer routes have initial fixture-tested adapters. WEBTOON preserves only numeric title_no and episode_no identifiers for resume; all other query parameters are removed. On WEBTOON the visible episode label is preferred to the internal episode identifier. Completion is a heuristic (30 focused active seconds, a scroll-related input and 90% page scroll); short or paginated readers may not complete automatically. The extension saves local progress, strips most URL query strings and all fragments, and offers to restore a saved scroll position on reopening an unfinished chapter. Query-dependent readers may not resume correctly. Sources are recorded independently and can be explicitly linked into a unified story across websites. Live website compatibility has not yet been verified.

## Manage your library

Open **Manage library** from the popup (or the extension options). Search and filter series, set reading status, expand chapter history, correct chapter numbers, mark chapters read/unread, delete entries, and export or merge a JSON backup. Manual completion overrides subsequent automatic completion; a correction is remembered for its chapter URL. Deleting entries does not block future automatic tracking on that site. Imports validate and sanitize chapter URLs, retain existing series, and merge chapter progress without overwriting higher progress. Back up your library before major changes.

## Link reading websites

In Manage library, choose another source under a series and click Link stories. Exact normalized title matches appear first as suggestions; no links are created automatically. Linked stories show a unified chapter history, read counts, alternate titles, source-specific resume links and the highest tracked chapter. A chapter is shown as read in the unified view if any source marks it read; underlying source progress is kept independently. Linking existing groups joins their membership. Unlink source restores its independent view without deleting history. Rename story changes the group display label. Links are included in JSON backups; importing an existing source retains its current group if present. Chapter numbers must correspond across sources for the unified view to be meaningful; season offsets are not automatically resolved.

## Resume and active reading time

InkTrail stores the latest vertical page position separately from furthest chapter progress. Reopening an unfinished chapter near its top shows an optional Resume prompt for 30 seconds. Resume uses saved pixels when the layout is similar and proportional position otherwise. Lazy-loaded pages, nested scroll containers and paginated layouts may restore imperfectly. Completed chapters do not prompt automatically. Active time is estimated from focused visible intervals, pauses after two minutes without interaction, and excludes large timing gaps. It is saved periodically, so a quick close or navigation may lose the last few seconds. Backup merges keep the larger time estimate instead of double-counting overlapping exports.

## Release tracking (optional)

Open Release tracker, paste a MangaDex title URL or UUID, set a label, language and manual read-through chapter, then approve access to api.mangadex.org. Followed titles are checked in the background while the browser runs: up to five due titles per 15-minute alarm, each due after six hours. Use Check now for a manual refresh (one minute per-title cooldown). Only selected title IDs and languages are sent to the public API, not reading records. The first successful check establishes a baseline; new higher numbered chapters increase the toolbar badge. Clear new badges acknowledges alerts. The ahead-of-read-through count is limited to distinct numeric chapters in the latest 100 feed records, not the complete catalog. Link a subscription explicitly to a reading source to exclude individually completed chapters from the returned feed, including other sources in its linked group. The manual read-through remains a baseline; missing or unfinished chapters above it remain unread. Title matches are suggestions only; confirm that chapter numbering agrees between sources. Newly discovered chapters already marked read in the linked library do not generate new alerts. Existing toolbar alerts remain until acknowledged. Release follows are stored locally; use Export follows and Import follows on the release dashboard for a separate subscription backup. This includes source links and manual baselines, not cached feed data or alerts. Restore the reading-library backup separately to resolve saved source links. Existing subscriptions take precedence during import. API availability and catalog coverage vary; no desktop push notification or live API validation yet.

## Privacy

Only user-enabled websites are eligible for tracking. Page headings, titles, URL paths, image counts and scroll position are processed locally. Reading history is not sent to a server. Optional release checks send selected MangaDex title IDs and languages to its public API. Disabling a site retains past history; uninstalling removes local data. Export before uninstalling.

## Development

No build step or dependencies. Run `node --test tests/*.test.cjs` with Node 22. GitHub Actions tests and packages a ZIP artifact.

## Roadmap

More site adapters, paginated readers, additional release sources, desktop notifications and optional sync.
