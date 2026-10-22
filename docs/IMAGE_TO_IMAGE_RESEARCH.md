# MOSS image-to-image research and integration decision

Reviewed October 21, 2026. This document separates verified upstream features, developer-reported experiments, and the unverified runtime behavior of this package.

## Findings

| Approach | What the primary source establishes | Decision for Studio 1.1 |
| --- | --- | --- |
| Standard latent image-to-image | ComfyUI documents encoding an input image and sampling with reduced denoise. Its effect depends on the model and settings. | Implemented as **Experimental image to image**, using the same installed MOSS model/VAE. Rendering quality and GPU memory still need local testing. |
| Ostris MOSS editing nodes | The repository provides reference-image text encoding and a model patch for edit-trained MOSS LoRAs, with up to three reference images. | A real community editing path. It needs a compatible trained LoRA and its correct settings; the node package alone is not a general editing model. It is not bundled in this revision. |
| thearkorbit editing LoRA proof of concept | The model-card search result describes a reference-latent patch and a small edit-training experiment, with one successful test out of six reported by the author. | Promising research, limited evidence. The full card was not retrievable in this review, and compatibility with Ostris's different reference-encoding/cache setup was not established. Not integrated. |
| darask0 color/depth control | The author provides an adapter that conditions generation on object-region color maps and/or depth maps. ComfyUI PR #17206 added native support and was merged October 19, 2026. | Useful for composition/pose control. It requires adapter weights and prepared control maps. It is a separate workflow feature, not the source-picture redraw mode implemented here. |

### Primary sources

1. [ComfyUI image-to-image guide](https://docs.comfy.org/tutorials/basic/image-to-image)
2. [Ostris MOSS edit nodes and requirements](https://github.com/ostris/ComfyUI-MOSS-Image-Ostris-Edit)
3. [Ostris node implementation](https://github.com/ostris/ComfyUI-MOSS-Image-Ostris-Edit/blob/main/nodes.py)
4. [thearkorbit proof-of-concept model card](https://huggingface.co/thearkorbit/moss-image-edit-lora-poc) — search-visible excerpt reviewed; full-page retrieval was unavailable.
5. [darask0 color-depth adapter](https://huggingface.co/darask0/MOSS-Image-color-depth-control)
6. [Merged ComfyUI color-depth support PR #17206](https://github.com/Comfy-Org/ComfyUI/pull/17206)
7. [Official OpenMOSS ComfyUI integration notes](https://github.com/OpenMOSS/MOSS-Image/blob/main/comfyui/README.md)

The official OpenMOSS notes recommend native ComfyUI support and distinguish its sampling scale from the older directory-loader plugin. Studio retains the supplied native AuraFlow setup. Layout-prompt editing changes scene descriptions and boxes; that does not by itself establish an uploaded-photo editing capability.

## What Studio 1.1 implements

The Text to image method continues to use the bundled original graph. The experimental method builds a separate graph copy with these changes:

1. Load the uploaded source with `LoadImage`.
2. Resize/crop it with `ImageScale` to the selected output dimensions.
3. Encode it using `VAEEncode` connected to the same `VAELoader` used for output decoding.
4. Repeat that latent with `RepeatLatentBatch` for the requested image count.
5. Feed it into the existing KSampler and apply the selected change strength as denoise.

The positive/negative prompt branches, native MOSS model, AuraFlow shift, skip-layer guidance, sampler choice and decoder remain connected. The supplied workflow generation graph remains intact; the public note uses a generic model path; generated graph exports include the actual image-to-image branch.

This is a technically reasonable integration based on the available native model interfaces. It is not an upstream-confirmed benchmark of every MOSS checkpoint, VAE or quantization. The source picture is used as the sampling starting point, not passed to an edit-trained instruction-following model.

## Test before calling it final

Use one source picture at about 768 pixels square, one output, a fixed seed, the same prompt and the same installed checkpoint. Save results at strengths 0.35, 0.55 and 0.75. Compare subject identity, composition, artifacts, color drift, prompt response, time and memory use. Repeat for another image style if this will be used for both anime artwork and photos. Change only one setting at a time.

Also verify that switching back to Text to image works; project reload finds the uploaded source; result projects retain the actual seed and strength; and the exported graph opens and runs in ComfyUI. The owner subsequently reported successful testing. The image-to-image method retains an Experimental label for variable editing quality.

Automated checks: 16 JavaScript adapter tests, 1 application integration test and 6 Python route tests passed. These use schema/queue fixtures and a simulated browser DOM/HTTP API and do not run MOSS inference. Those automated tests do not exercise a real GPU. The owner subsequently reported successful use and supplied the text-to-image example; see [validation notes](VALIDATION.md).
