# NEWS | Nazarite Early World Synagogue

Static ministry website for GitHub Pages. No backend or paid hosting is required.

- `index.html`: ministry home, message library, first message, original recording, worship lyrics, upcoming teaching and vision.
- `gospel.html`: second message, complete study from the supplied PDF, original sermon, PDF, downloadable infographic and research references.
- `content/catalog.json`: published sermons, publications, and worship lyrics. The build script also supports future videos when a real video page and artwork exist.
- `assets/`: original ministry media, including both sermon recordings and the PDF.
- `styles.css`, `script.js`: responsive layout and interactions.
- `tools/build.mjs`: generates resource cards and the sitemap from the catalog.
- `tests/`: standard-library checks for links, assets, metadata, content preservation, and project paths.

Run `npm run build` after editing the catalog, then `npm test`. No package installation is needed. To preview the same path as GitHub Pages, run `python3 -m http.server 8000 --directory ..` from this directory and open `http://localhost:8000/news-ministry/`.

GitHub Pages source: main branch, root directory. The canonical URLs target `NisongMonyimba/news-ministry`. Content publishing instructions are in [content/README.md](content/README.md). See [AUDIT.md](AUDIT.md) for the production-readiness report and verification results.

The worship track is represented by its lyrics and arrangement only. No finished audio track, official contact address, donation account or YouTube channel was supplied. The original sermon audio and the expanded articles are explicitly distinguished. The Romans 8:2 teaching is marked upcoming, not a published sermon.
