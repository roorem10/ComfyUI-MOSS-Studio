# MOSS Image Studio — start here

**Version 1.1.0 — tested successfully by the project owner. Image-to-image remains labeled Experimental.**

If you already installed an earlier version: stop ComfyUI, replace its existing `custom_nodes/moss_studio` folder with the `moss_studio` folder in this ZIP, and start ComfyUI again. Refresh the Studio page; on Windows, use Ctrl+F5 if it still shows v1.0. Keep only one installed copy. Projects saved with version 1.0 can still be opened.

This gives your existing MOSS image workflow an ordinary browser interface: a prompt box, model menu, image settings, a Generate button and an image preview.

**ComfyUI still does the image generation. Start ComfyUI before using Studio, and leave it running.** This download adds a page to your existing ComfyUI installation. It does not install another web server, Python, Node.js or AI models.

## 1. Unzip the download

1. Save the release or GitHub source ZIP somewhere easy to find, such as Downloads.
2. In Windows File Explorer, right-click it and choose **Extract All…**.
3. Click **Extract**. Open the newly extracted folder.
4. Find the extracted folder that directly contains `__init__.py`, `workflow.json`, `js` and `web`. If it is named `ComfyUI-MOSS-Studio-main`, rename that folder to **moss_studio**. A packaged release already uses the `moss_studio` folder name. This entire folder is the add-on you copy into ComfyUI.

The repository README shows the example images. You can also open the `START_HERE.html` file at the add-on root for a short offline setup guide.

## 2. Find the correct ComfyUI folder

Find the **custom_nodes** folder used by the ComfyUI installation you normally run.

| Installation | Where to look |
| --- | --- |
| Windows Portable | Open your `ComfyUI_windows_portable` folder, then `ComfyUI`, then `custom_nodes`. |
| Manual installation | Open your ComfyUI program folder, then `custom_nodes`. |
| ComfyUI Desktop | Use the local installation/data location shown by your Desktop installation or instance settings. Find its existing `custom_nodes` folder. Desktop locations vary by version and by the folder you selected during setup. |

Use the same custom-node location as your other installed add-ons. If Desktop uses an extra custom-node directory, that configured directory is also suitable. Do not assume the `models` folder is the right location: this is an add-on, not a model.

## 3. Copy the add-on

1. Close ComfyUI completely. For Desktop, quit the app; for Portable, stop/close its running command window too.
2. Copy the entire **moss_studio** folder from the extracted download.
3. Paste it **inside** ComfyUI's **custom_nodes** folder.
4. Open the copied `moss_studio` folder. You should immediately see `__init__.py`, `workflow.json`, `web` and `js`.

The final file location should end in **custom_nodes/moss_studio/__init__.py**. If it ends in **custom_nodes/moss_studio/moss_studio/__init__.py**, there is an extra folder level: move the inner `moss_studio` folder up one level.

No installation commands or extra packages are required for this add-on. Its Python dependency is aiohttp, which ComfyUI already uses. Your ComfyUI installation must allow custom-node add-ons to load.

## 4. Start ComfyUI and open Studio

1. Start ComfyUI the way you normally do.
2. Wait until ComfyUI finishes starting.
3. In ComfyUI's top menu, try **Extensions → Open MOSS Studio**. This opens a browser tab.
4. If that menu is not available in your frontend version, use your browser's address bar instead. Take the address of your running ComfyUI server and add **/moss-studio**.

For example, if ComfyUI runs at `http://127.0.0.1:8188`, open:

**http://127.0.0.1:8188/moss-studio**

If yours uses port 8000, open **http://127.0.0.1:8000/moss-studio** instead. Keep whatever host and port your installation actually uses. For a ComfyUI address containing a workflow or other page path, keep the server address and replace the page path with `/moss-studio`.

You do **not** need to load the workflow into the main graph editor first. Studio includes the supplied graph and submits a copy with your chosen settings. Your open graph and original JSON are not edited.

Do not double-click the add-on's `web/index.html` file. The actual Studio page needs to be opened through the running ComfyUI address.

## 5. Check the models

The top of Studio should say **ComfyUI connected**. The message above the prompt tells you whether the workflow is ready. Expand **Connection & model checks** for details.

The model menu supports all four MOSS variants from your workflow, provided they are installed. Missing variants are shown as unavailable. You only need one diffusion model to generate an image.

| Component | Filename from the supplied workflow | ComfyUI model category |
| --- | --- | --- |
| Diffusion model, choose one | `moss_image_sft_int8_convrot.safetensors`, `moss_image_sft_bf16.safetensors`, `moss_image_base_int8_convrot.safetensors`, or `moss_image_base_bf16.safetensors` | `diffusion_models` |
| Text encoder | `qwen3.5_9b_w4a8_gptq.safetensors`; the workflow also mentions `qwen3.5_9b_int8_convrot.safetensors` as an alternative | `text_encoders` |
| VAE | `flux2-vae.safetensors` | `vae` |

Studio uses the installed file lists reported by ComfyUI, including configured extra model locations. It does not move or download models. Model filenames above come from your supplied workflow; select the actual installed matching file, including its subfolder, when needed.

Your workflow had **SFT BF16** selected. Studio keeps that choice. If you installed an INT8 version instead, choose it in the model menu. Open **Advanced settings** if you need to change the text encoder or VAE. After installing files or updating ComfyUI, restart ComfyUI, then click **Check again**.

If a node such as `EmptyFlux2LatentImage`, `SkipLayerGuidanceDiTSimple` or the `moss_image` encoder type is unavailable, your running ComfyUI core does not support this graph yet, or a component failed to load. Update through your installation's supported update process, restart, and recheck. Installing this interface does not add model support to an older core.

## 6. Generate a first test image

1. In **Your prompt**, describe a simple image, for example: “A small red cabin beside a lake, pine forest, soft morning light, detailed illustration.” The original saved prompt is already available; **Use workflow prompt** restores it.
2. Select a MOSS model that is installed.
3. Choose **Quick test · 768 × 768**.
4. Set **Images** to **1**. Leave **Steps** at **50** initially.
5. Click **Generate image** once.
6. Wait. The first run may take several minutes while ComfyUI loads the models. If another job is ahead, Studio shows that it is queued.
7. When finished, the image appears in the canvas. Click **Download PNG** to save a browser copy. ComfyUI also saves the image in its own output directory under the filename prefix shown in Advanced settings.

An installed-model check does not prove the render will fit in GPU memory. If generation fails, Studio displays the error. For an out-of-memory error, keep Images at 1, reduce width/height, and consider an installed INT8 diffusion model. The original workflow's notes mention INT8 and the W4A8 encoder as a lower-memory starting point, not a guarantee.

## 7. Everyday controls

- **Prompt / negative prompt:** what to include and leave out. Both start with the text saved in your JSON.
- **Image size:** presets or custom width and height. Custom dimensions must be multiples of 16 and within the installed node's limits.
- **Seed:** leave it fixed for repeatable settings, enable **Random each time**, or click the circular-arrow button for a new number. Seeds are limited to integers JavaScript can store exactly.
- **Advanced settings:** encoder, VAE, precision, encoder device, CFG, AuraFlow shift, sampler, scheduler, denoise, layer guidance and filename prefix. The native AuraFlow → skip-layer guidance → sampler chain stays connected.
- **Cancel this job:** removes this job if queued. It interrupts a running job by ID when your ComfyUI version supports that safely. On older versions, it explains that you need to use ComfyUI's own Stop control for a running job.
- **Expand image:** opens the result larger. Press Escape or click the close button to return.

Studio opens at **768 × 768 for a first test**. Your uploaded graph was saved at **2560 × 1088**; that size is available as **Original workflow**. The other original settings, including your positive and negative prompts, model, seed, 50 steps, CFG 3, AuraFlow shift 5 and skipped single layer 22, are retained. **Restore all original workflow settings** also restores the original large size.

## 7a. Try experimental image-to-image

This mode starts from an uploaded picture. It uses your installed MOSS model and VAE plus standard ComfyUI image-loading, resizing and encoding nodes. It does not require a community extension or an editing LoRA. The owner has reported successful testing. Image-to-image remains Experimental because output preservation and editing quality vary with the source and settings.

1. At the top of the settings, change **Generation method** to **Image to image · Experimental**.
2. Click **Choose source image** and select a PNG, JPG or WebP smaller than 32 MB. Wait until the upload completes. Studio sends it to your running ComfyUI server and stores it in ComfyUI's input folder under a unique filename.
3. Choose a small output size. **Use source proportions** adjusts the output dimensions to approximately match the source's shape while keeping roughly the current output pixel count. Dimensions are rounded to multiples of 16.
4. Choose how the source fits the output: **Crop center** preserves proportions but can trim the edges; **Stretch** retains the edges but can distort shapes. The source preview shows that fit.
5. Describe the complete image you want in the prompt, including the parts you want to keep. This mode does not promise reliable instruction-based edits such as “change only the jacket.”
6. Start with **Change strength 0.55**, **1 image**, **50 steps**, and a fixed seed. Click **Generate image**.
7. Repeat with strengths **0.35** and **0.75**, keeping the source, size, prompt and seed unchanged. Lower values usually retain more of the source; higher values allow more change. Evaluate the results on your machine.

Change strength controls the sampler's denoise in this mode. The separate Advanced denoise field is disabled to avoid conflicting controls. Switching to Text to image restores that mode's own denoise setting.

Image-to-image can alter faces, hands, text, colors and composition. It redraws the full image; this version does not have a mask painter or a guarantee of preserving character identity. The experimental path is a technical integration to evaluate, not a claim of validated MOSS editing quality.

**Save project** retains the uploaded source filename, dimensions, method, fit and strength. It does not embed the source picture. Keep the original picture and the uploaded file in ComfyUI/input if you want to reproduce the result. Re-upload the picture if you move the project to another ComfyUI installation. **Remove source** clears the project selection without deleting files from disk.

The included [image-to-image research notes](IMAGE_TO_IMAGE_RESEARCH.md) explains the community editing and control projects found during the October 21, 2026 review, and why they are separate from this initial experimental mode.

## 8. Save, reopen and export

- **Save project:** downloads the current settings as JSON. Later, click **Open project** to load that file into Studio.
- **Save result project:** saves the exact settings and seed used for the displayed result, even if you have changed the form since generating it.
- **Export workflow:** downloads the displayed result's ComfyUI graph, with its actual settings. Drag that exported JSON into ComfyUI if you want to inspect the graph.
- **Technical details:** saves the API prompt, settings and ComfyUI history response for troubleshooting.

Project files hold settings and output filenames, not the image data or AI model files. Download the PNG separately. Everyday form settings are also stored in this browser. Refreshing the same tab can resume tracking its last known job while that job remains in ComfyUI's queue/history. Closing the tab does not cancel a submitted job. Browser storage can be cleared or unavailable, so use **Save project** for settings you want to keep.

Changing settings here does not change the widgets in an already-open ComfyUI graph. Changes made in the graph editor likewise do not automatically update Studio. Studio uses the supplied bundled graph; its project loader accepts Studio project files, not arbitrary ComfyUI workflows.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Page not found / 404 | Confirm the folder placement, fully restart ComfyUI, and check that you are using its actual host and port. Look for add-on import errors in the startup log. |
| No “Open MOSS Studio” menu item | Refresh ComfyUI after restart, or open the `/moss-studio` address directly. Menu support varies by frontend version. |
| ComfyUI connected but Generate is unavailable | Read the message above the prompt. Choose installed models, fill in a prompt, and fix any invalid settings. Expand the checks for missing nodes. |
| A model is unavailable even though you downloaded it | Check its ComfyUI model category, restart ComfyUI and choose its actual filename from the dropdown. A model in a subfolder has that subfolder in its name. |
| No progress percentage for a while | ComfyUI may be loading models or running a stage without step progress. Keep it running. HTTP polling still checks completion if live progress is unavailable. |
| “Submission not confirmed” | Open ComfyUI and inspect its queue before clicking Generate again. A lost response can occur after a job was accepted; Studio never automatically resubmits it. |
| An image was generated but cannot be loaded later | Its file may have been moved or deleted from ComfyUI's output folder. Keep downloaded copies of important results. |
| Settings seem different after reopening | Browser settings are remembered. Use Restore all original workflow settings or Open project to choose a known starting point. |

To uninstall: stop ComfyUI, move `moss_studio` out of its `custom_nodes` directory, and restart. Your models, original workflow and generated images are separate from this add-on.

## What was verified

The package passes JavaScript syntax checks, sixteen workflow-adapter tests, one application integration test and six Python route tests. These cover original graph connections, settings and seed mapping, unavailable components, invalid inputs, output batches, error/cancellation history, asset routes and cancellation scoped to one job. New checks cover the image-to-image connections, saved graph link consistency, resizing, batch count, strength validation, missing image nodes and returning to text-to-image.

The project owner reported successful local testing and supplied the completed text-to-image showcase. Automated checks use node-schema fixtures, a simulated browser DOM/HTTP API and a stub queue; they do not load model weights. Test a small image on your own setup before using larger settings. See [validation notes](VALIDATION.md).

## Technical references

The add-on follows ComfyUI's documented custom routes and JavaScript extension mechanism. Generation uses its local `/object_info`, `/prompt`, `/ws`, `/queue`, `/history` and `/view` APIs.

- [Official ComfyUI server routes](https://docs.comfy.org/development/comfyui-server/comms_routes)
- [Official JavaScript extensions](https://docs.comfy.org/custom-nodes/js/javascript_overview)
- [Official topbar menu API](https://docs.comfy.org/custom-nodes/js/javascript_topbar_menu)
- [Official custom-node installation guide](https://docs.comfy.org/installation/install_custom_node)

To rerun developer checks from this package folder, use `node --test tests/*.test.mjs` and `python -m unittest discover -s tests -p 'test_*.py'`. Node.js is needed only for development checks, not for using Studio.
