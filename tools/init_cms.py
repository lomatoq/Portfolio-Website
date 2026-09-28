"""One-time migration of the existing hand-authored projects to editable CMS data."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")
app = (ROOT / "src/application.js").read_text(encoding="utf-8")
data = json.loads(re.search(r'<script id="portfolio-data" type="application/json">(.*?)</script>', html, re.S).group(1))
cases = json.loads(re.search(r"const caseInfo = (\{.*?\})\s*;\s*// The editor", app, re.S).group(1))
lab = dict(re.findall(r'<button class="project-row" data-case="([^"]+)" data-category="([^"]+)"', html))
bento = set(re.findall(r'<button class="bento-tile" data-case="([^"]+)"', html))
legacy_media = json.loads((ROOT / "content/media.json").read_text(encoding="utf-8"))["items"]
case_company = {case["id"]: exp["id"] for exp in data["experience"] for case in exp["cases"]}
projects = []
for id, c in cases.items():
    item = {
        "id": id, "title": c["title"], "kind": c["kind"],
        "group": "work" if id in case_company else "personal",
        "companyId": case_company.get(id, ""),
        "category": lab.get(id, "work"), "placement": "bento" if id in bento else "index" if id in lab else "work",
        "featured": id in ("vice", "companion", "party", "elemental", "color"), "legacy": True,
        "visible": True, "art": c["art"], "intro": c["intro"], "role": c["role"],
        "proof": c["proof"], "scope": c["scope"], "status": c["status"],
        "blocks": []
    }
    if id in legacy_media:
        m = legacy_media[id]
        if m["type"] == "long-image":
            sources = m.get("images") or ([{"src": m.get("src", ""), "width": m.get("width", 0), "height": m.get("height", 0), "alt": m.get("alt", "")}])
            item["blocks"] = [{"type": "image", "src": s.get("src", ""), "alt": s.get("alt", ""), "caption": "", "width": s.get("width", 0), "height": s.get("height", 0)} for s in sources]
        else:
            item["blocks"] = [{"type": "video", "src": m.get("src", ""), "mp4": "", "poster": m.get("poster", ""), "caption": "", "width": 16, "height": 9}]
    projects.append(item)

known = {p["id"] for p in projects}
for exp in data["experience"]:
    for c in exp["cases"]:
        if c["id"] in known:
            continue
        projects.append({"id": c["id"], "title": c["name"], "kind": f'{exp["company"]} / {exp["dates"]}', "group": "work", "companyId": exp["id"], "category": "work", "placement": "work", "featured": False, "visible": True, "legacy": True, "art": c.get("art", "type"), "intro": exp["summary"], "role": exp["role"], "proof": "Project material is being prepared.", "scope": exp["skills"], "status": "Case study in preparation.", "blocks": []})
        known.add(c["id"])

chapters = {}
for id in ("vice", "companion", "party", "elemental", "tools"):
    m = re.search(r'<section[^>]*\bid="' + id + r'"[^>]*>(.*?)(?=<section |<footer )', html, re.S)
    if not m:
        continue
    section = m.group(1)
    def grab(pattern):
        x = re.search(pattern, section, re.S)
        return re.sub(r'<[^>]+>', '', x.group(1)).strip() if x else ""
    slides = []
    for card in re.findall(r'<article[^>]*class="media-card"[^>]*>.*?</article>', section, re.S):
        frame = re.search(r'data-frame-id="([^"]+)"', card)
        if not frame:
            continue
        title = re.search(r'<div class="media-caption"><div><h4>(.*?)</h4><p>(.*?)</p>', card, re.S)
        slides.append({"id": frame.group(1), "title": re.sub(r'<[^>]+>', '', title.group(1)).strip() if title else "Slide", "subtitle": re.sub(r'<[^>]+>', '', title.group(2)).strip() if title else "", "type": "legacy", "src": "", "mp4": "", "poster": "", "alt": "", "width": 16, "height": 9})
    chapters[id] = {
        "eyebrow": grab(r'<div class="chapter-eyebrow mono">(.*?)</div>'),
        "title": grab(r'<h2 id="' + ("tools" if id == "tools" else id) + r'-title">(.*?)</h2>'),
        "description": grab(r'<div class="chapter-heading">.*?</h2><p>(.*?)</p>'),
        "note": grab(r'<p class="scene-note">(.*?)</p>'),
        "slides": slides
    }

copy = {}
for key, pattern in {
    "hero_tagline": r'<p class="hero-tagline[^>]*>(.*?)</p>',
    "story_title": r'<h2 id="story-title">(.*?)</h2>',
    "projects_title": r'<h2 id="projects-title">(.*?)</h2>',
    "bento_title": r'<h2 id="bento-title">(.*?)</h2>',
    "bento_intro": r'<div class="bento-head">.*?<p>(.*?)</p>',
    "lab_title": r'<h2 id="lab-title">(.*?)</h2>',
    "lab_note": r'<p class="lab-foot">(.*?)</p>',
    "footer_title": r'<footer class="footer"[^>]*>.*?<h2>(.*?)</h2>',
    "footer_note": r'<p class="footer-note">(.*?)</p>'
}.items():
    x = re.search(pattern, html, re.S)
    if x:
        copy[key] = re.sub(r'<[^>]+>', '', x.group(1)).strip()

out = {"version": 1, "copy": copy, "companies": [{"id": exp["id"], "name": exp["company"]} for exp in data["experience"]], "chapters": chapters, "projects": projects}
path = ROOT / "content/cms.json"
if path.exists() and "--force" not in __import__("sys").argv:
    raise SystemExit("content/cms.json already exists; this one-time migration would overwrite editor changes. Pass --force only to reset it.")
path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Seeded {len(projects)} projects, {len(chapters)} chapters")
