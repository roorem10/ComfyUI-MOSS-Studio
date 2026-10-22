# MOSS Image Studio v1.1.0

A local browser interface for native MOSS image workflows in ComfyUI. Write a prompt, choose an installed model, set the actual image resolution and steps, then generate, preview and download.

## Highlights

- Text-to-image with installed MOSS Base/SFT INT8/BF16 selection.
- Experimental image-to-image with source upload, fit preview and change strength.
- Editable prompts, dimensions, steps, image count, seeds and advanced sampling settings.
- Job tracking, scoped cancellation, image previews and downloads.
- Save/open Studio projects and export the workflow used for a result.
- Showcase screenshots, full example prompt and a loadable starter project.

## Installation

Download `MOSS_Image_Studio-v1.1.0.zip` and extract it. Stop ComfyUI, copy the extracted `moss_studio` folder into your `custom_nodes` directory, and start ComfyUI again. Open **Extensions → Open MOSS Studio** or add `/moss-studio` to your running ComfyUI server's address.

ComfyUI and the required MOSS models must be installed separately. There are no extra runtime package-install commands for this add-on. Read the repository README for model download links and detailed folder instructions.

For an update, replace the old add-on folder, keep one installed copy, restart ComfyUI and refresh Studio with Ctrl+F5.

## Validation

The project owner reported successful local testing and supplied the example render. The repository includes 23 automated adapter/application/route tests plus a repository consistency check. Image-to-image remains Experimental because editing quality and preservation vary with the source and settings.
