# Changelog

## 1.1.0 — 2026-10-21

First GitHub-ready release of the locally tested MOSS Image Studio interface.

### Included

- Local browser page served by the running ComfyUI installation.
- Native MOSS Base/SFT model selection with installed-file checks.
- Positive/negative prompts, editable generation size, steps, batch count and seed.
- Advanced encoder, VAE, sampling, guidance and save settings.
- Experimental latent image-to-image with source upload, crop/stretch preview, source proportions and change strength.
- Queue/progress tracking, scoped cancellation, previews and downloads.
- Save/open projects, exact result-settings saves, workflow exports and technical details.
- Owner-supplied interface and output screenshots, showcase prompt and loadable starter preset.
- Beginner installation instructions, project license, contribution guide, issue templates, CI and release packaging.

### Validation

The owner reported successful local testing and supplied a completed SFT BF16 text-to-image showcase. Automated checks cover the adapter, simulated application flow and HTTP routes. Image-to-image remains labeled Experimental; this release does not claim a comprehensive quality or hardware compatibility benchmark.

### Packaging changes

The ComfyUI entry point is at the repository root so the repository folder itself can be installed as an add-on. Tests and documentation were updated for that layout. A machine-specific model-directory example was removed from the workflow note; its generation nodes, connections and saved widget values were retained.
