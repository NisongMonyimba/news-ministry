# NEWS | Nazarite Early World Synagogue

Static ministry publishing website for GitHub Pages. No backend or paid hosting is required.

- `index.html`: ministry home, message library, first message, original recording, worship lyrics, upcoming teaching and vision.
- `gospel.html`: second message, complete study from the supplied PDF, original sermon, PDF, downloadable infographic and research references.
- `content/publications/`: publication metadata and approved text, with generated permanent pages under `publications/`.
- `content/catalog.json`: generated public library catalog.
- `assets/`: original ministry media, including both sermon recordings and the PDF.
- `styles.css`, `script.js`: responsive layout and interactions.
- `tools/build.mjs`: generates pages, cards, and the sitemap from approved publication records.
- `tools/publish.mjs`: local draft, validation, media, readiness, preview, and build commands.
- `tests/`: standard-library checks for links, assets, metadata, content preservation, and project paths.

Run `npm run build` after approving publication metadata, then `npm test`. No package installation is needed. See [PUBLISHING_GUIDE.md](PUBLISHING_GUIDE.md) for exact commands and private staging.

GitHub Pages source: main branch, root directory. The canonical URLs target `NisongMonyimba/news-ministry`. See [AUDIT.md](AUDIT.md) for the production-readiness baseline.

The worship track is represented by its lyrics and arrangement only. No finished audio track, official contact address, donation account or YouTube channel was supplied. The original sermon audio and the expanded articles are explicitly distinguished. The Romans 8:2 teaching is marked upcoming, not a published sermon.
