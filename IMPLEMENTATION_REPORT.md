# NEWS digital publishing system v1

## Baseline

Started from clean `main` at merge commit `45607e5cb8086cbea097b6a4f192551985e56351`. Reviewed `AUDIT.md`, the catalog, dependency-free Node build, existing Python regression tests, and GitHub Actions workflow.

## Implementation

- Added structured records for MESSAGE 001, MESSAGE 002, and SONG 001, with one permanent URL each.
- Extracted approved article and lyric HTML into publication source files without changing the original pages. Existing article text fingerprints and PDF hash remain locked.
- Added reusable static publication pages with conditional audio, text, study, Scripture, downloads, video, worship, related items, and sharing sections.
- Kept legacy links at `index.html#message`, `index.html#worship`, and `gospel.html`. The resource library now links to permanent pages.
- Preserved original audio and artwork paths. No new recording, transcript, video, date, speaker, or theological text was invented.
- Structured the existing Romans 8:2 teaser as an approved public announcement, separate from published teachings.
- Added local creation, validation, listing, media, readiness, build, and private preview commands.
- Added Git exclusions for private work and tests that prevent unpublished publication records from entering public source.
- Extended validation for IDs, URLs, states, approval, required content, references, media paths and signatures, unsafe paths and HTML, source integrity, and em dashes.

## Verification

- `npm run build`: 3 permanent pages and 3 library cards generated.
- `npm test`: 14 tests pass, including disposable draft fixtures, deterministic output, legacy URLs, links, assets, source integrity, and draft exclusion.
- Chromium at 320, 390, 820, and 1440 px: home, legacy study, and all three permanent publication pages returned HTTP 200, had one main heading, loaded visible images, and had no horizontal overflow or JavaScript page errors.
- Visual review: MESSAGE 002 permanent page inspected at 320 and 1440 px.
- `git diff --check`: clean.
- No original media files or `gospel.html` were changed.

GitHub Actions results are recorded in the pull request review. This branch is for review and is not merged.
