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

Open Release tracker, paste a MangaDex title URL or UUID, set a label, language and manual read-through chapter, then approve access to api.mangadex.org. Followed titles are checked in the background while the browser runs: up to five due titles per 15-minute alarm, each due after six hours. Use Check now for a manual refresh (one minute per-title cooldown). Only selected title IDs and languages are sent to the public API, not reading records. The first successful check establishes a baseline; new higher numbered chapters increase the toolbar badge. Clear new badges acknowledges alerts. The ahead-of-read-through count is limited to distinct numeric chapters in the latest 100 feed records, not the complete catalog. Link a subscription explicitly to a reading source to exclude individually completed chapters from the returned feed, including other sources in its linked group. The manual read-through remains a baseline; missing or unfinished chapters above it remain unread. Title matches are suggestions only; confirm that chapter numbering agrees between sources. Newly discovered chapters already marked read in the linked library do not generate new alerts. Existing toolbar alerts remain until acknowledged. Release follows are stored locally; use Export follows and Import follows on the release dashboard for a separate subscription backup. This includes source links and manual baselines, not cached feed data or alerts. Restore the reading-library backup separately to resolve saved source links. Existing subscriptions take precedence during import. API availability and catalog coverage vary; live API validation remains outstanding.

## Manual tracking

For an unsupported reader, open the extension popup and expand **Save this chapter manually**. Enter the title and numeric chapter, optionally mark it read, then save. This works without enabling persistent site access. If you enable automatic tracking on that host, the same exact chapter URL can use the saved manual title and chapter even when detection fails. Chapter assignments are local and persist in library backups. Correct or delete the existing assignment in Manage library before assigning the same URL elsewhere. URLs with arbitrary query parameters are rejected in manual mode to avoid conflating query-based chapters and retaining private data; supported WEBTOON numeric identifiers are an exception. A site that reuses one URL for multiple chapters still requires manual management and is not automatically distinguishable.

## Custom website rules

On a reading page, open InkTrail and expand **Teach InkTrail this website**. Enter a reader path prefix (for example /read/), a CSS selector for the series title, and a CSS selector for the numeric chapter label. Use Pick title and chapter on page, click the two text elements, then reopen InkTrail to review the generated selectors. Alternatively use browser Inspect to identify elements. The visual picker stores only a temporary per-tab selector draft, not the selected text, and requires testing and saving before it activates a rule. Escape cancels the picker; drafts expire after ten minutes and are cleared when the tab closes. Click Test on current page to preview the title and chapter, then Save tested rule. Enable site tracking and reload. Each origin can have one rule; exact manual URL assignments take priority. A matching rule that fails to extract a valid chapter does not fall back to generic detection, to avoid false positives. Outside the rule path, generic detection continues. Rules read text only, never execute user-supplied code. Unknown query-based routes remain unsupported. Manage website rules lets you delete, export and import rules independently of your library. Importing never grants host permissions, preserves existing rules and does not live-test selectors. After updating the extension, reload existing reading tabs.

## Import browser history

Open Import history in the library, enter an exact website origin, choose a time window and approve optional browser history access. Preview recognized numeric chapter URLs and select only the chapters to import. Import adds visited chapters with zero reading progress, never marks them read and never overwrites existing chapter records. Old visits do not displace newer resume entries. Scans are limited to 1,000 history search records; unsupported URLs and ambiguous query routes are skipped. Only selected sanitized chapter records are stored locally. Revoke history access on the same page; imported records are retained. No continuous history scanning takes place.

## Paginated readers

InkTrail recognizes MangaDex chapter page routes and explicit English Page X of Y / Page X / Y counters in common page-counter elements. The latest page and URL are stored separately from maximum progress; known page totals supply a percentage. MangaDex page changes inside the same chapter retain a common session identity. Unknown totals show a page number without inventing progress. Resume opens the latest recorded URL; readers that keep the same URL for all pages do not automatically navigate to the stored page. Paginated chapters require manual Mark read, rather than treating the final page as proof that all earlier pages were read. Generic counter recognition is heuristic, and live external reader compatibility remains unverified.

## Desktop release notifications

Open Release tracker and enable desktop notifications to grant the optional browser permission. Alerts are grouped per followed title and only created for newly discovered higher-numbered unread chapters after the first successful baseline check. Story titles are hidden by default; opt in to including them. Clicking an alert opens the release dashboard. Use Send test notification to check your browser/OS notification settings. Disabling alerts removes the optional notification permission; toolbar badges remain independent. Feed state is saved before requesting desktop notifications to avoid duplicate alerts on retry. Desktop notification delivery is best-effort and may be suppressed by system settings or browser policies.

## Reading analytics

Open Analytics from Manage library to view daily and rolling 7/30-day active reading estimates, an 84-day calendar, current and longest streaks (at least one minute per day), daily goals, a 30-day story ranking and recent activity. New reading intervals are aggregated by device-local day; a session crossing midnight is assigned to the day it is saved. Up to 730 days are retained; historical library totals and browser history imports are not reconstructed. Clear activity removes daily history without removing chapter records or lifetime chapter time. Analytics are local and are not included in existing backups yet.

## Privacy

Only user-enabled websites are eligible for tracking. Page headings, titles, URL paths, image counts and scroll position are processed locally. Reading history is not sent to a server. Optional release checks send selected MangaDex title IDs and languages to its public API. Disabling a site retains past history; uninstalling removes local data. Export before uninstalling.

Open Privacy from Manage library to review registered reading sites and persistent website permissions separately. Stop individual or all reading registrations without losing data or revoking release API access. Revoke individual permissions when needed; revoking MangaDex API access pauses release checks. Reload existing reader tabs after permission changes.

## Development

No build step or dependencies. Run `node --test tests/*.test.cjs` with Node 22. GitHub Actions tests and packages a ZIP artifact. A separate browser job uses Playwright and headless Chromium with a local fixture, testing the actual extension service worker, visual picker, backup import and manual read completion. Run locally with npm install --no-save --ignore-scripts playwright@1.56.1, npx playwright install chromium, and node --test tests/browser-smoke.cjs.

## Roadmap

More site adapters, broader paginated reader support, additional release sources, optional sync.
