# Publishing new NEWS resources

The HTML pages remain static so they work directly on GitHub Pages. `catalog.json` is the index of published resources and generates the home page cards and sitemap.

1. Add the approved page or section and its media under this repository. Use relative paths so the site works at `/news-ministry/`.
2. Add one entry to `catalog.json`. Supported `kind` values are `sermon`, `publication`, `song`, and `video`. The `url` can be a local page such as `study.html` or an anchor such as `#worship`. Supply actual image dimensions and descriptive alternative text. A song may omit the image to use the branded lyrics artwork.
3. Run `npm run build` and `npm test`, then review the generated cards and sitemap before committing.

Do not add an entry for a planned recording or video until it exists. The current song entry links to published lyrics and says that the recording has not been produced.
