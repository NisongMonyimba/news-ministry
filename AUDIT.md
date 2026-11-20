# NEWS production-readiness audit

Audit date: 20 November 2026

Repository baseline: `dfb98db` (`Publish NEWS ministry website`)

Working branch: `audit/production-readiness`

## Baseline and verified findings

The repository is a static GitHub Pages project with a home page, a complete Bible study page, a custom 404 page, CSS and JavaScript, a PDF, an infographic, two original sermon recordings (the longer sermon has MP3 and Ogg versions), a logo, and other WebP artwork. The study HTML is minified onto one line; its essay, KJV quotations, and research references match the supplied PDF. Both pages use relative links that resolve under `/news-ministry/`.

The study page lacked complete Open Graph and social metadata. Resource cards and the sitemap required separate manual edits. Both audio players preloaded metadata, including the longer sermon. The mobile navigation did not close on an outside click or return focus after Escape. Small labels and some body text had weak readability. The home page also used video-style thumbnails for lyrics and an unpublished teaching; those images could suggest that videos or recordings had been published. The earlier 404 page did not use the site's shared branding.

## Implementation

- Preserved the original NEWS logo, magenta and gold palette, ancient Bible imagery in the crest, ministry identity, complete sermon text, Bible study essay, KJV quotations, references, PDF, and original recordings.
- Added a catalog of the two published messages and the published worship lyrics. `npm run build` generates the cards and sitemap. Future sermon, publication, song, and video entries can be added when the corresponding approved content exists.
- Removed the duplicate image card section that associated unrelated video-style thumbnails with the song and planned teaching. The original files remain in the repository. The song now has a CSS-only branded card and an explicit statement that no recording exists.
- Refined card layouts, text contrast, minimum tap sizes, study navigation, mobile spacing, and the hero heading at tablet width. Added image dimensions and decoding hints to reduce layout shifts.
- Added canonical, Open Graph, Twitter card, and structured-data metadata to both content pages. Updated the project-path robots directive and generated sitemap. Reworked the 404 page with the NEWS palette and `noindex`.
- Set audio players to `preload="none"`. The longer sermon offers the smaller Ogg/Opus source first, with MP3 fallback. This reduces optional media transfer on mobile where Ogg is supported.
- Added source and asset checks using Python's standard library, plus a GitHub Actions workflow that rebuilds generated files and runs the checks on pushes and pull requests. No npm dependency installation is needed.

## Verification

| Check | Result |
| --- | --- |
| `npm run build` | 3 resource cards, 2 sitemap URLs; repeatable output |
| `npm test` | 9 tests passed, including internal anchors, media files, metadata, canonical paths, no em dashes in authored HTML, and source-text fingerprints |
| Headless Chromium at 320, 390, 820, and 1440 px | Both pages loaded without horizontal overflow; one H1 each |
| Mobile navigation and song lyrics | Menu opened and closed with Escape, focus returned to the trigger; lyrics opened and closed |
| Audio decoding with `ffmpeg -v error` | Original excerpt MP3, full sermon MP3, and full sermon Ogg decoded without reported errors |
| Production HTTP checks | Home, study page, both recordings, the Ogg alternate, PDF, and infographic returned HTTP 200 before this branch was published |
| Visual review | Desktop home, tablet home and cards, mobile home, and mobile study page reviewed in Chromium |
| Source integrity | Article text fingerprints and the PDF SHA-256 are locked in tests; no original media binary changed |

The 24.72-second first recording is an original excerpt, and the second sermon is approximately 7 minutes 10 seconds. The PDF remains a 10-page publication. The direct download links point to local project assets.

## Hosting limits and review notes

GitHub Pages currently sends `Cache-Control: max-age=600` for these assets. A project site cannot set custom response headers or the host root `/robots.txt`; the repository's robots file and sitemap document the intended crawl paths, while the canonical and Open Graph URLs point to the project URL. The production HTTP results describe the existing published `main` branch. The branch changes require review and merge before they appear on the live site.
