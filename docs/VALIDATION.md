# Validation

## Owner testing

On October 21, 2026, the project owner reported that testing had concluded and everything worked. The owner then supplied an interface screenshot and an example image for the release documentation.

The interface screenshot documents a completed **Text to image** run using **MOSS Image SFT BF16**, **2560 × 1440**, **100 steps** and **one image**. It shows **8:24 elapsed**. That is the interface timer for a particular run, including any waiting/loading, not a controlled speed benchmark. The supplied example PNG is **2048 × 1152**. Both files are included as provided.

The screenshot does not expose every advanced setting. The example prompt supplied during testing is included, but the starter project deliberately uses smaller settings and seed 42. It is not an exact export of that run. No exact visual reproduction is promised from the starter preset.

## Automated checks

| Check | Coverage |
| --- | --- |
| 16 workflow-adapter tests | Original graph links, mapped settings/seeds, missing components, invalid inputs, output/error history, image-to-image branch, export consistency, resizing, batches, strength and returning to text-to-image |
| 1 application integration test | Simulated DOM/HTTP initialization, upload, image-to-image request submission, result display and switching back to text-to-image |
| 6 Python route tests | Serving assets/workflow, rejecting unexpected asset paths, scoped pending/running cancellation, missing-ID rejection and older-core fallback |
| Repository check | Documentation/image links, HTML control references, source layout, version consistency and example preset format |

GitHub Actions runs the automated checks on pushes and pull requests. A workflow file is included; the project must be uploaded to GitHub before a hosted CI run can occur.

## Limits

Automated tests use schema and queue fixtures. They do not load model weights, use a GPU or replace live ComfyUI testing. The owner report and example establish successful use on the owner's setup; they do not establish every model, operating system or driver combination.

Image-to-image uses a source latent and reduced denoise. It retains an Experimental label because identity, fine details and prompt adherence vary. There is no mask painter or separately trained general instruction-editing model bundled in this release.

## Re-run

From the repository root:

```bash
node --test tests/*.test.mjs
python -m unittest discover -s tests -p "test_*.py" -v
python scripts/check_repository.py
```

Python's route tests require the aiohttp package already supplied by ComfyUI or installed separately using `requirements-dev.txt`. Normal installation of the add-on does not require running these development commands.
