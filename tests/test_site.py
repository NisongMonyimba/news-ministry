import json
import hashlib
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
BASE = "https://nisongmonyimba.github.io/news-ministry/"
PAGES = (ROOT / "index.html", ROOT / "gospel.html")


class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.images = []
        self.meta = {}
        self.canonical = None
        self.audio_sources = []
        self.audio_depth = 0
        self.headings = []
        self.static_resources = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if data.get("id"):
            self.ids.add(data["id"])
        if tag == "a":
            self.links.append(data.get("href", ""))
        elif tag == "img":
            self.images.append(data)
        elif tag == "link" and data.get("rel") == "canonical":
            self.canonical = data.get("href")
        elif tag == "link" and data.get("rel") in {"stylesheet", "icon"}:
            self.static_resources.append(data.get("href"))
        elif tag == "meta":
            self.meta[data.get("property") or data.get("name")] = data.get("content")
        elif tag == "audio":
            self.audio_depth += 1
            self.audio_sources.append((data.get("preload"), []))
        elif tag == "source" and self.audio_depth:
            self.audio_sources[-1][1].append(data.get("src"))
        elif tag == "h1":
            self.headings.append("h1")
        elif tag == "script" and data.get("src"):
            self.static_resources.append(data["src"])

    def handle_endtag(self, tag):
        if tag == "audio":
            self.audio_depth -= 1


def parse(page):
    parser = SiteParser()
    parser.feed(page.read_text(encoding="utf-8"))
    return parser


class SiteQualityTests(unittest.TestCase):
    def test_pages_have_metadata_and_one_main_heading(self):
        for page in PAGES:
            with self.subTest(page=page.name):
                parsed = parse(page)
                expected = BASE if page.name == "index.html" else BASE + page.name
                self.assertEqual(parsed.canonical, expected)
                self.assertEqual(parsed.meta.get("og:url"), expected)
                self.assertTrue(parsed.meta.get("description"))
                self.assertTrue(parsed.meta.get("og:description"))
                self.assertTrue(parsed.meta.get("og:image:alt"))
                self.assertEqual(parsed.meta.get("twitter:card"), "summary_large_image")
                self.assertEqual(parsed.headings, ["h1"])

    def test_links_and_anchors_resolve_under_project_path(self):
        parsed_pages = {page.name: parse(page) for page in PAGES}
        for page in PAGES:
            for href in parsed_pages[page.name].links:
                with self.subTest(page=page.name, href=href):
                    self.assertTrue(href, "Empty link")
                    target = urlparse(href)
                    if target.scheme:
                        self.assertEqual(target.scheme, "https")
                        self.assertEqual(target.netloc, "nisongmonyimba.github.io")
                        self.assertTrue(target.path.startswith("/news-ministry/"))
                        target_path = target.path.removeprefix("/news-ministry/")
                    else:
                        self.assertFalse(target.netloc)
                        self.assertFalse(target.path.startswith("/"))
                        target_path = unquote(target.path)
                    local = ROOT / (target_path or page.name)
                    if not target_path and href.startswith("#"):
                        local = page
                    if target_path.endswith("/"):
                        local = local / "index.html"
                    self.assertTrue(local.is_file(), f"Missing {local}")
                    if target.fragment and local.suffix == ".html":
                        self.assertIn(target.fragment, parsed_pages.get(local.name, parse(local)).ids)

    def test_images_and_audio_are_available_and_responsive(self):
        found_audio = set()
        for page in PAGES:
            parsed = parse(page)
            for resource in parsed.static_resources:
                self.assertTrue((ROOT / resource).is_file(), resource)
            for image in parsed.images:
                with self.subTest(page=page.name, image=image.get("src")):
                    self.assertTrue(image.get("alt"))
                    self.assertGreater(int(image.get("width", 0)), 0)
                    self.assertGreater(int(image.get("height", 0)), 0)
                    self.assertTrue((ROOT / image["src"]).is_file())
            for preload, sources in parsed.audio_sources:
                self.assertEqual(preload, "none")
                self.assertTrue(sources)
                for source in sources:
                    self.assertTrue((ROOT / source).is_file())
                    found_audio.add(source)
        self.assertEqual(found_audio, {"assets/original-message.mp3", "assets/gospel-sermon.mp3", "assets/gospel-sermon.ogg"})

    def test_404_uses_project_path_and_noindex(self):
        not_found = (ROOT / "404.html").read_text()
        self.assertIn('name="robots" content="noindex"', not_found)
        self.assertIn('href="/news-ministry/"', not_found)
        for path in re.findall(r'(?:href|src)="(/news-ministry/[^"]+)"', not_found):
            local = ROOT / path.removeprefix("/news-ministry/")
            if path == "/news-ministry/":
                local = ROOT / "index.html"
            self.assertTrue(local.is_file(), path)

    def test_publication_assets_have_expected_file_signatures(self):
        self.assertTrue((ROOT / "assets/gospel-study.pdf").read_bytes().startswith(b"%PDF-"))
        for path in (ROOT / "assets").glob("*.webp"):
            data = path.read_bytes()[:12]
            self.assertEqual((data[:4], data[8:12]), (b"RIFF", b"WEBP"), path.name)
        for name in ("original-message.mp3", "gospel-sermon.mp3"):
            self.assertEqual((ROOT / "assets" / name).read_bytes()[:3], b"ID3")
        self.assertEqual((ROOT / "assets/gospel-sermon.ogg").read_bytes()[:4], b"OggS")

    def test_catalog_and_sitemap_match_published_pages(self):
        catalog = json.loads((ROOT / "content/catalog.json").read_text())
        ids = [entry["id"] for entry in catalog]
        self.assertEqual(len(ids), len(set(ids)))
        home = (ROOT / "index.html").read_text()
        self.assertEqual(home.count('class="library-card"'), len(catalog))
        self.assertIn(f"{len(catalog)} PUBLISHED RESOURCES", home)
        tree = ElementTree.parse(ROOT / "sitemap.xml")
        urls = {node.text for node in tree.findall(".//{*}loc")}
        expected = {BASE} | {BASE + entry["url"].split("#")[0] for entry in catalog if not entry["url"].startswith("#")}
        self.assertEqual(urls, expected)
        robots = (ROOT / "robots.txt").read_text()
        self.assertIn(BASE + "sitemap.xml", robots)

    def test_authored_web_content_has_no_em_dash(self):
        for path in [*ROOT.glob("*.html"), ROOT / "content/catalog.json"]:
            with self.subTest(path=path.name):
                self.assertNotRegex(path.read_text(), r"—|&mdash;|&#(?:8212|x2014);")

    def test_study_and_references_remain_present(self):
        study = (ROOT / "gospel.html").read_text()
        for text in (
            "The Question Every Christian Must Confront",
            "The Final Question: What Is the Source of Your Gospel?",
            "Galatians 1:11-12 (KJV)",
            "Acts 17:11 (KJV)",
            "Additional Biblical References for Deeper Research",
            "Questions for Personal Reflection and Bible Study",
            "All direct biblical quotations are from the King James Version (KJV).",
        ):
            self.assertIn(text, study)

    def test_authored_messages_match_approved_baseline(self):
        class TextOnly(HTMLParser):
            def __init__(self):
                super().__init__(convert_charrefs=True)
                self.parts = []

            def handle_data(self, data):
                self.parts.append(data)

        expected = {
            "index.html": "5d5312642a208eeb2e73e2d5ba97c58e250beb36b9eed58a7d7d2c4671e87be7",
            "gospel.html": "95ecb1176ad2b55c250196496113d12cbbc19b77f37c358183f695c064616894",
        }
        for name, digest in expected.items():
            with self.subTest(page=name):
                source = (ROOT / name).read_text()
                article = re.search(r'<article\b[^>]*class="[^"]*\bsermon\b[^"]*"[^>]*>(.*?)</article>', source, re.S)
                self.assertIsNotNone(article)
                parser = TextOnly()
                parser.feed(article.group(1).split('<div class="sermon-tools"')[0])
                normalized = " ".join(" ".join(parser.parts).split())
                self.assertEqual(hashlib.sha256(normalized.encode()).hexdigest(), digest)
        self.assertEqual(
            hashlib.sha256((ROOT / "assets/gospel-study.pdf").read_bytes()).hexdigest(),
            "99ea3a0cba072561e783f14dbd9b559d51a71b6eed5219bafbcc30215d9a9873",
        )


if __name__ == "__main__":
    unittest.main()
