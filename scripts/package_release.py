"""Build a local installable source release. Does not upload or publish anything."""
import argparse
import hashlib
from pathlib import Path
import zipfile

from check_repository import check

ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = {"__init__.py", "workflow.json", "README.md", "LICENSE", "CHANGELOG.md",
              "CONTRIBUTING.md", "THIRD_PARTY_NOTICES.md", "requirements-dev.txt",
              "pyproject.toml", ".gitignore", ".gitattributes", "START_HERE.html"}
SOURCE_DIRS = {"web", "js", "docs", "examples", "scripts", "tests", ".github"}
SUFFIXES = {".py", ".js", ".mjs", ".css", ".html", ".md", ".json", ".txt", ".png", ".yml", ".yaml", ".toml"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    version = check()
    directory = args.output.resolve()
    directory.mkdir(parents=True, exist_ok=True)
    archive = directory / f"MOSS_Image_Studio-v{version}.zip"
    count = 0
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for path in sorted(ROOT.rglob("*")):
            if not path.is_file() or path.is_symlink():
                continue
            relative = path.relative_to(ROOT)
            if any(part in {".git", "__pycache__", ".venv", "node_modules", "dist", "build"} for part in relative.parts):
                continue
            if relative.as_posix() not in ROOT_FILES:
                if len(relative.parts) < 2 or relative.parts[0] not in SOURCE_DIRS or path.suffix not in SUFFIXES:
                    continue
            info = zipfile.ZipInfo("moss_studio/" + relative.as_posix(), date_time=(2026, 10, 21, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            output.writestr(info, path.read_bytes(), compresslevel=9)
            count += 1
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (directory / "SHA256SUMS.txt").write_text(f"{digest}  {archive.name}\n", encoding="utf-8")
    print(f"Created {archive.name}: {count} files, {archive.stat().st_size:,} bytes")
    print(f"SHA256 {digest}")


if __name__ == "__main__":
    main()
