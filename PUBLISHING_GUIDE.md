# NEWS publishing guide

This repository publishes static pages on GitHub Pages. Local commands never push or deploy. Ministry reviewers approve each source and a pull request before new material appears online.

## Publication files and fields

Each public publication has `content/publications/<id>/publication.json` and optional small HTML files in the same directory. The build writes `publications/<id>/index.html`. Media remains in `assets/` and is referenced by path, without copying large files. A reusable draft record is in `content/publications/TEMPLATE/publication.example.json`.

Required fields: `id`, `number`, `kind`, `title`, `summary`, `status`, `approved`, and `url`. A published entry also needs approved `writtenMessage`, `essay`, `lyrics`, or `transcription`. IDs and URLs are permanent. Use `message-003`, `song-002`, `study-001`, or `video-001` and a matching `MESSAGE 003` style number.

Optional fields: `subtitle`, `speaker`, `recordedAt`, `publishedAt`, `primaryScripture`, `additionalScriptures`, `categories`, `topics`, `artwork`, `audio`, `transcription`, `writtenMessage`, `essay`, `pdf`, `infographic`, `thumbnail`, `youtube`, `lyrics`, `worshipAudio`, `reflectionQuestions`, `related`, `sourceNote`, `label`, `action`, and `legacyUrl`. Dates use `YYYY-MM-DD` only when known. Scripture references use a form such as `Galatians 1:11-12`. Omit unknown fields. Optional sections appear only when supplied resources exist.

Example format, not a NEWS sermon:

```json
{
  "id": "message-003",
  "number": "MESSAGE 003",
  "kind": "sermon",
  "title": "Approved title",
  "summary": "Approved summary",
  "status": "published",
  "approved": true,
  "url": "publications/message-003/",
  "primaryScripture": "Romans 8:2",
  "categories": ["Christian message"],
  "topics": ["Scripture"],
  "writtenMessage": "content/publications/message-003/written.html",
  "audio": ["assets/message-003.mp3"],
  "sourceNote": "Original recording and separately approved edited message."
}
```

## States and private staging

The states are `draft`, `under_review`, `approved`, `published`, and `archived`. Only `published` with `approved: true` enters the public build. Approval is explicit. A draft preview is written to ignored `preview/` and never enters the public build. `.news-private/` and `content/drafts/` are ignored by Git. Keep WhatsApp exports, private transcripts, personal data, and review notes there or in another private location. Never use `git add -f` on these paths. Review `git status` before committing.

```sh
npm run publish -- create message-003
npm run publish -- list
npm run publish -- validate message-003
npm run publish -- media message-003
npm run publish -- readiness message-003
npm run publish -- preview message-003
```

Edit `.news-private/message-003.json` during private work. Store working text and media outside tracked paths. After review, move only public-ready HTML and media into `content/publications/message-003/` and `assets/`, update the metadata paths, set `approved: true` and `status: "published"`. The public directory contains published records only. To archive, move the full source directory out of the public repository in a reviewed change; the build removes its generated page. Plan a reviewed notice or redirect separately if an old link must continue working.

```sh
npm run publish -- validate
npm run publish -- readiness message-003
npm run publish -- build
npm test
npm run publish -- preview message-003
git status --short
```

Preview serves `http://localhost:8000/news-ministry/preview/message-003/` from an ignored local directory. Stop with Ctrl+C. Inspect the page and its media, then commit source and generated files on a branch and request review. The tools never deploy.

## Preparing resources

- **Sermons:** Preserve the original recording. Add `transcription` only for a checked verbatim text. Put a separately approved edited message in `writtenMessage` and explain the distinction in `sourceNote`.
- **Bible study essays:** Put reviewed HTML in `essay`. Preserve quotations and reference lists. Use `additionalScriptures` only for verified references. Add approved `reflectionQuestions` if desired.
- **Audio:** Use `audio` for original speech and `worshipAudio` for a finished song. MP3, Ogg, M4A, and WAV are accepted. Retain the raw original privately.
- **PDFs and infographics:** Put approved files in `assets/` and set `pdf` and `infographic`. The build validates paths and types.
- **YouTube videos:** Set `youtube` to the actual public watch URL. `thumbnail` is optional and does not imply a video exists.
- **Worship songs:** Put approved lyrics in `lyrics`. Add `worshipAudio` only when an approved recording exists.

For a new WhatsApp sermon, export the recording to private storage and note the real date if known. Listen to it, transcribe it faithfully, and compare the text with the audio. Prepare any edited message or expanded study as a separate document. A ministry reviewer approves the public text, Scripture references, artwork, and media. No tool automatically rewrites theology. Unknown dates, speakers, or media remain omitted.

## Existing material

MESSAGE 001, MESSAGE 002, and SONG 001 have permanent generated pages. `index.html#message`, `index.html#worship`, and `gospel.html` still work. The Romans 8:2 teaser is an approved public announcement in `content/announcements/upcoming-teaching.json`, with no teaching page or recording. The existing text, lyrics, and PDF are protected by fingerprints and tests. A correction requires an authorized source change and an explicit update to the integrity lock after review.
