"""Check the public source layout, documentation links and UI control references."""
from pathlib import Path
import json
import re
import struct
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]


def check():
    for name in ["__init__.py", "workflow.json", "README.md", "LICENSE", "web/index.html",
                 "web/app.mjs", "web/workflow.mjs", "js/moss_studio.js"]:
        if not (ROOT / name).is_file():
            raise ValueError(f"Missing release file: {name}")
    for path in sorted(ROOT.rglob("*.md")):
        if any(part in {".git", "dist", "__pycache__"} for part in path.parts):
            continue
        for target in re.findall(r"!?\[[^\]]*\]\(([^\s)]+)\)", path.read_text(encoding="utf-8")):
            if re.match(r"^[a-zA-Z][\w+.-]*:", target) or target.startswith("#"):
                continue
            relative = unquote(target.split("#", 1)[0])
            if not relative:
                continue
            resolved = (path.parent / relative).resolve()
            if not resolved.is_relative_to(ROOT) or not resolved.exists():
                raise ValueError(f"Broken local link in {path.relative_to(ROOT)}: {target}")
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    ids = re.findall(r'\bid="([^"]+)"', html)
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate HTML control IDs")
    js = (ROOT / "web/app.mjs").read_text(encoding="utf-8")
    missing = set(re.findall(r"\$\('([^']+)'\)", js)) - set(ids)
    if missing:
        raise ValueError(f"Missing HTML controls: {sorted(missing)}")
    metadata = (ROOT / "pyproject.toml").read_text(encoding="utf-8")
    version = re.search(r'^version = "([^"]+)"', metadata, re.M).group(1)
    if f"v{version}" not in html or f'__version__ = "{version}"' not in (ROOT / "__init__.py").read_text(encoding="utf-8"):
        raise ValueError("Version mismatch between metadata, entry point and UI")
    graph = json.loads((ROOT / "workflow.json").read_text(encoding="utf-8"))
    project = json.loads((ROOT / "examples/phoenix-starter.json").read_text(encoding="utf-8"))
    if project["format"] != "moss-studio-project" or project["workflow_id"] != graph["id"]:
        raise ValueError("The example project does not match the bundled workflow")
    if project["settings"]["prompt"] != (ROOT / "examples/phoenix-positive.txt").read_text(encoding="utf-8").strip():
        raise ValueError("Showcase prompt differs between TXT and project")
    if project["settings"]["negative"] != (ROOT / "examples/phoenix-negative.txt").read_text(encoding="utf-8").strip():
        raise ValueError("Showcase negative prompt differs between TXT and project")
    for name in ["EXAMPLE_UI.png", "EXAMPLE_IMAGE.png"]:
        raw = (ROOT / "docs/images" / name).read_bytes()
        if raw[:8] != b"\x89PNG\r\n\x1a\n":
            raise ValueError(f"Invalid PNG: {name}")
        width, height = struct.unpack(">II", raw[16:24])
        if min(width, height) <= 0:
            raise ValueError(f"Invalid image dimensions: {name}")
    # The bundled public graph must not carry the original workstation path.
    if re.search(r"[A-Za-z]:[/\\]Users[/\\](?!<)[^/\\\s]+", json.dumps(graph)):
        raise ValueError("A personal Windows model-directory example remains in the graph")
    print(f"Repository checks passed: source layout, links, images, controls, version {version} and example preset.")
    return version


if __name__ == "__main__":
    check()
