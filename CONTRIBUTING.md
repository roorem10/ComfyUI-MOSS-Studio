# Contributing

Keep Studio a beginner-friendly interface to the existing native MOSS graph. Generation belongs to ComfyUI; the browser page should show actionable settings and clear errors.

## Source layout

| Path | Purpose |
| --- | --- |
| `__init__.py` | ComfyUI custom-node entry point and Studio routes |
| `js/moss_studio.js` | Optional Open MOSS Studio command in the ComfyUI frontend |
| `web/` | Buildless browser interface and graph adapter |
| `workflow.json` | Bundled native MOSS workflow |
| `examples/` | Showcase prompt, negative prompt and loadable starter project |
| `docs/` | Installation, validation, publishing instructions, research and images |
| `tests/` | Node.js tests and Python aiohttp route tests |
| `scripts/` | Local release packaging and documentation checks |

No runtime JavaScript packages or frontend build are required.

## Run the checks

For development only, use Python 3.10+ and Node.js 20+. From this repository directory:

```bash
python -m pip install -r requirements-dev.txt
node --test tests/*.test.mjs
python -m unittest discover -s tests -p "test_*.py" -v
python scripts/check_repository.py
```

Use a separate Python environment for isolated tests. Do not install development tools into a working ComfyUI environment unnecessarily. Users installing the add-on do not need Node.js or a separate pip step.

The tests stub ComfyUI node schemas, its queue and the browser DOM/HTTP APIs. Passing them does not run MOSS inference. Verify meaningful runtime changes in a real ComfyUI installation as well.

## Verify a runtime change

Install one copy in `custom_nodes/moss_studio`, restart ComfyUI and open `/moss-studio`. Check text-to-image generation, editable width/height/steps, result downloads, project reload, graph exports and cancellation. For image-to-image changes, test upload, fit preview, strength, output dimensions and switching back to text-to-image.

Keep API requests on the current ComfyUI origin. Do not add a global queue clear or a global interrupt as a fallback for cancelling one job. Keep generated prompts, model files, user uploads and runtime history out of commits.

## Pull requests

Describe the user-visible problem, the behavior after the change and how you checked it. Include a screenshot for interface changes when useful. Use your own sample images and remove personal information from logs and workflow notes.

## Release archive

Run:

```bash
python scripts/package_release.py --output dist
```

The script checks repository links/control references, excludes runtime files and writes a source ZIP rooted at `moss_studio/`, plus a checksum file. It does not publish, tag, push or contact GitHub. Extracted releases can be installed by copying that `moss_studio` folder into `custom_nodes`.
