"""Local-only portfolio editor. Run `python cms_server.py` and open the printed URL."""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "content/cms.json"
UPLOADS = ROOT / "assets/uploads"
MAX_MEDIA = 200 * 1024 * 1024


def revision(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def validate(data: object) -> None:
    if not isinstance(data, dict) or data.get("version") != 1:
        raise ValueError("Unsupported content version")
    projects = data.get("projects")
    if not isinstance(projects, list) or len(projects) > 500:
        raise ValueError("Projects must be a list of at most 500 items")
    ids = set()
    for project in projects:
        if not isinstance(project, dict) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,62}", str(project.get("id", ""))):
            raise ValueError("Each project needs a URL-safe ID")
        if project["id"] in ids:
            raise ValueError("Project IDs must be unique")
        ids.add(project["id"])
        if not isinstance(project.get("title"), str) or not project["title"].strip():
            raise ValueError(f"Project {project['id']} needs a title")
        blocks = project.get("blocks", [])
        if not isinstance(blocks, list) or len(blocks) > 100:
            raise ValueError("A project can contain at most 100 blocks")
        for block in blocks:
            if not isinstance(block, dict) or block.get("type") not in ("image", "video", "text"):
                raise ValueError("Invalid project block")
    chapters = data.get("chapters")
    if not isinstance(chapters, dict):
        raise ValueError("Chapters must be an object")
    for chapter in chapters.values():
        if not isinstance(chapter, dict) or not isinstance(chapter.get("slides"), list) or len(chapter["slides"]) > 100:
            raise ValueError("Each chapter needs a slide list of at most 100 items")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _json(self, status: int, value: object) -> None:
        raw = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _allowed_origin(self) -> bool:
        origin = self.headers.get("Origin", "")
        if not origin:
            return False
        parsed = urlparse(origin)
        return parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "localhost") and parsed.port == self.server.server_port

    def do_GET(self):
        if self.path == "/api/data":
            raw = DATA.read_bytes()
            self._json(200, {"data": json.loads(raw), "revision": revision(raw)})
            return
        if self.path == "/admin" or self.path == "/admin/":
            self.path = "/admin/index.html"
        super().do_GET()

    def do_POST(self):
        if not self._allowed_origin():
            self._json(403, {"error": "Open the editor from this local server"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if self.path == "/api/save":
                if length <= 0 or length > 5 * 1024 * 1024:
                    raise ValueError("Content is too large")
                payload = json.loads(self.rfile.read(length))
                data = payload.get("data")
                validate(data)
                current = DATA.read_bytes()
                if payload.get("revision") != revision(current):
                    self._json(409, {"error": "Content changed on disk. Reload before saving."})
                    return
                raw = (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
                temp = DATA.with_suffix(".tmp")
                temp.write_bytes(raw)
                temp.replace(DATA)
                built = subprocess.run([sys.executable, str(ROOT / "rebuild.py")], cwd=ROOT, capture_output=True, text=True, timeout=30)
                if built.returncode:
                    DATA.write_bytes(current)
                    raise ValueError("Build failed: " + built.stderr.strip())
                self._json(200, {"revision": revision(raw), "message": "Saved and built", "build": built.stdout.strip()})
            elif self.path == "/api/media":
                if length <= 0 or length > MAX_MEDIA:
                    raise ValueError("Media must be smaller than 200 MB")
                name = self.headers.get("X-File-Name", "media")
                kind = self.headers.get("X-Media-Kind", "")
                ext = Path(name).suffix.lower()
                if kind == "image" and ext not in (".webp", ".png", ".jpg", ".jpeg"):
                    raise ValueError("Use WebP, PNG or JPEG for images")
                if kind == "video" and ext not in (".webm", ".mp4"):
                    raise ValueError("Use WebM or MP4 for videos")
                if kind not in ("image", "video"):
                    raise ValueError("Unknown media kind")
                content = self.rfile.read(length)
                if len(content) != length:
                    raise ValueError("Incomplete upload")
                if ext == ".webp" and not (content[:4] == b"RIFF" and content[8:12] == b"WEBP"):
                    raise ValueError("Invalid WebP file")
                if ext == ".webm" and content[:4] != b"\x1a\x45\xdf\xa3":
                    raise ValueError("Invalid WebM file")
                if ext == ".mp4" and content[4:8] != b"ftyp":
                    raise ValueError("Invalid MP4 file")
                UPLOADS.mkdir(parents=True, exist_ok=True)
                filename = uuid.uuid4().hex[:12] + ext
                path = UPLOADS / filename
                path.write_bytes(content)
                self._json(200, {"path": "assets/uploads/" + filename, "bytes": length})
            else:
                self._json(404, {"error": "Unknown endpoint"})
        except (ValueError, json.JSONDecodeError, TimeoutError) as error:
            self._json(400, {"error": str(error)})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("Portfolio editor: http://127.0.0.1:8765/admin/", flush=True)
    server.serve_forever()
