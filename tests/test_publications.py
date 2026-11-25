import hashlib
import json
import shutil
import subprocess
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://nisongmonyimba.github.io/news-ministry/"


class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.ids = set()
        self.headings = 0

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if data.get("id"):
            self.ids.add(data["id"])
        if tag == "h1":
            self.headings += 1
        for attr in ("href", "src"):
            if data.get(attr):
                self.refs.append(data[attr])


class PublicationTests(unittest.TestCase):
    def test_generated_pages_and_local_resources(self):
        records = [json.loads(p.read_text()) for p in (ROOT / "content/publications").glob("*/publication.json")]
        self.assertEqual(len(records), 3)
        for record in records:
            with self.subTest(record=record["id"]):
                page = ROOT / record["url"] / "index.html"
                html = page.read_text()
                parsed = Resources()
                parsed.feed(html)
                self.assertEqual(parsed.headings, 1)
                self.assertIn(BASE + record["url"], html)
                for href in parsed.refs:
                    if href.startswith(("https://", "http://")):
                        continue
                    if href.startswith("#"):
                        self.assertIn(href[1:], parsed.ids)
                        continue
                    target, _, fragment = href.partition("#")
                    target_path = (page.parent / target).resolve()
                    self.assertTrue(target_path.is_relative_to(ROOT), href)
                    if target.endswith("/"):
                        target_path /= "index.html"
                    self.assertTrue(target_path.is_file(), href)
                    if fragment and target_path.suffix == ".html":
                        other = Resources()
                        other.feed(target_path.read_text())
                        self.assertIn(fragment, other.ids)
                for optional, marker in [
                    ("transcription", 'id="transcription"'),
                    ("writtenMessage", 'id="written-message"'),
                    ("essay", 'id="bible-study"'),
                    ("lyrics", 'id="worship-lyrics"'),
                    ("pdf", 'Download PDF publication'),
                    ("infographic", 'Download infographic'),
                    ("youtube", 'id="video"'),
                ]:
                    self.assertEqual(optional in record, marker in html)
                self.assertNotIn("—", html)

    def test_legacy_pages_and_sitemap(self):
        self.assertTrue((ROOT / "gospel.html").is_file())
        home = (ROOT / "index.html").read_text()
        for anchor in ('id="message"', 'id="worship"', 'id="upcoming"'):
            self.assertIn(anchor, home)
        catalog = json.loads((ROOT / "content/catalog.json").read_text())
        self.assertEqual(json.loads((ROOT / "publications/.generated.json").read_text()), [p["id"] for p in catalog])
        urls = {x.text for x in ElementTree.parse(ROOT / "sitemap.xml").findall(".//{*}loc")}
        self.assertEqual(urls, {BASE, BASE + "gospel.html"} | {BASE + p["url"] for p in catalog})

    def test_private_staging_is_not_tracked(self):
        tracked = subprocess.run(
            ["git", "ls-files", ".news-private", "content/drafts", "preview"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
        self.assertEqual(tracked.stdout.strip(), "")
        for path in (".news-private/example.json", "content/drafts/example.html", "preview/example.html"):
            result = subprocess.run(["git", "check-ignore", path], cwd=ROOT, capture_output=True)
            self.assertEqual(result.returncode, 0, path)

    def test_deterministic_build(self):
        tracked = [ROOT / "index.html", ROOT / "sitemap.xml", ROOT / "content/catalog.json", *sorted((ROOT / "publications").glob("*/index.html"))]
        before = [hashlib.sha256(p.read_bytes()).hexdigest() for p in tracked]
        result = subprocess.run(["node", "tools/build.mjs"], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(before, [hashlib.sha256(p.read_bytes()).hexdigest() for p in tracked])

    def test_disposable_draft_and_validation_failures(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / "tools").mkdir()
            for name in ("build.mjs", "publications.mjs", "publish.mjs"):
                shutil.copy2(ROOT / "tools" / name, site / "tools" / name)
            (site / "package.json").write_text('{"type":"module"}')
            (site / "index.html").write_text('<span class="discover-note">0 PUBLISHED RESOURCES</span><!-- catalog:start --><!-- catalog:end --><!-- announcement:start --><!-- announcement:end -->')
            announcements = site / "content/announcements"
            announcements.mkdir(parents=True)
            shutil.copy2(ROOT / "content/announcements/upcoming-teaching.json", announcements / "upcoming-teaching.json")
            directory = site / "content/publications/message-003"
            directory.mkdir(parents=True)
            (directory / "written.html").write_text("<p>Fixture text.</p>")
            published = {
                "id": "message-003", "number": "MESSAGE 003", "kind": "sermon",
                "title": "Fixture", "summary": "Fixture summary", "status": "published",
                "approved": True, "url": "publications/message-003/",
                "writtenMessage": "content/publications/message-003/written.html",
            }
            metadata = directory / "publication.json"
            metadata.write_text(json.dumps(published))
            private = site / ".news-private"
            private.mkdir()
            draft = dict(published, id="message-004", number="MESSAGE 004", url="publications/message-004/", status="draft", approved=False, writtenMessage=None)
            (private / "message-004.json").write_text(json.dumps(draft))
            created = subprocess.run(["node", "tools/publish.mjs", "create", "message-005"], cwd=site, capture_output=True, text=True)
            self.assertEqual(created.returncode, 0, created.stderr)
            self.assertTrue((private / "message-005.json").is_file())
            readiness = subprocess.run(["node", "tools/publish.mjs", "readiness", "message-005"], cwd=site, capture_output=True, text=True)
            self.assertNotEqual(readiness.returncode, 0)
            self.assertIn("explicit approval", readiness.stderr)
            def build():
                return subprocess.run(["node", "tools/build.mjs"], cwd=site, capture_output=True, text=True)
            self.assertEqual(build().returncode, 0)
            self.assertFalse((site / "publications/message-004").exists())
            self.assertNotIn("message-004", (site / "sitemap.xml").read_text())
            preview = subprocess.run(["node", "tools/build.mjs", "message-004"], cwd=site, capture_output=True, text=True)
            self.assertEqual(preview.returncode, 0, preview.stderr)
            self.assertIn('name="robots" content="noindex,nofollow"', (site / "preview/message-004/index.html").read_text())
            self.assertFalse((site / "publications/message-004").exists())
            for change, expected in [
                (dict(published, approved=False), "explicit approval"),
                (dict(published, pdf="assets/missing.pdf"), "missing file"),
                (dict(published, pdf="content/publications/message-003/written.html"), "unsupported file type"),
                (dict(published, writtenMessage="../outside.html"), "Unsafe path"),
                (dict(published, primaryScripture="Galatians nope"), "invalid Scripture"),
                (dict(published, status="released"), "invalid status"),
                (dict(published, status="draft"), "unpublished record"),
            ]:
                metadata.write_text(json.dumps(change))
                result = build()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(expected, result.stderr)
            metadata.write_text(json.dumps(published))
            duplicate_dir = site / "content/publications/message-006"
            duplicate_dir.mkdir()
            (duplicate_dir / "publication.json").write_text(json.dumps(dict(published, id="message-006", number="MESSAGE 006")))
            result = build()
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("duplicate ID, URL, or number", result.stderr)
            shutil.rmtree(duplicate_dir)
            announcement_file = announcements / "upcoming-teaching.json"
            announcement = json.loads(announcement_file.read_text())
            announcement_file.write_text(json.dumps(dict(announcement, status="draft")))
            result = build()
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Invalid approved upcoming teaching announcement", result.stderr)
            announcement_file.write_text(json.dumps(announcement))
            shutil.rmtree(directory)
            result = build()
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse((site / "publications/message-003/index.html").exists())
            self.assertNotIn("message-003", (site / "sitemap.xml").read_text())


if __name__ == "__main__":
    unittest.main()
