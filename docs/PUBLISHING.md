# Put MOSS Image Studio on GitHub

Suggested repository name: **ComfyUI-MOSS-Studio**.

This folder is prepared for GitHub, but has not been uploaded to an account. The source ZIP contains the full project, documentation and images. No model files are included.

## Upload through GitHub's website

1. Extract the project ZIP somewhere easy to find.
2. Open the extracted add-on folder. You should see `README.md`, `__init__.py`, `workflow.json`, `docs`, `web`, `js` and the other project files together.
3. Sign in to GitHub and choose **New repository**.
4. Name it **ComfyUI-MOSS-Studio** and use a description such as **A local browser interface for MOSS image generation in ComfyUI, with previews, editable settings and experimental image-to-image.**
5. Select Public if you want anyone to download it. Leave the automatic README/license/gitignore options off, because the project already includes those files.
6. Create the repository, then choose the option to **upload an existing file** or **Add file → Upload files**.
7. Upload the **contents inside** the extracted project folder. Do not upload only the outer folder: `README.md` and `__init__.py` should appear at the repository's top level.
8. Include the `.github` directory and Git configuration files. They provide checks and issue templates. If your file picker hides them, use GitHub Desktop or another Git client to add the full folder.
9. Commit the upload. Open the repository homepage and confirm both README images load and the installation links point to the included documents.

GitHub Actions may need to be enabled in the repository settings. Review the Actions tab after uploading; the presence of a workflow file alone is not a passed hosted run.

## Create a downloadable release

A release ZIP named `MOSS_Image_Studio-v1.1.0.zip` can be made with:

```bash
python scripts/package_release.py --output dist
```

This command is for the maintainer. It creates the installable ZIP and `SHA256SUMS.txt` in `dist`. End users do not need to run it.

On GitHub, open **Releases → Draft a new release**, create tag **v1.1.0** from the intended branch/commit, set the title to **MOSS Image Studio v1.1.0**, and use [the included release text](RELEASE_v1.1.0.md). Attach the ZIP and checksum file, then publish when ready.

The automatic GitHub source ZIP is installable too: extract it, rename the folder containing `__init__.py` to `moss_studio`, and copy it into ComfyUI's `custom_nodes` directory.

## Git users

You can instead initialize a Git repository in this directory and push it using your normal GitHub workflow. Use the repository URL GitHub actually creates. No username, remote URL, registry publisher ID or personal account details have been guessed in this package.

This project is prepared for GitHub source sharing. It has not been submitted to Comfy Registry or listed in ComfyUI Manager. Registry publication is a separate step requiring the owner's real repository URL and publisher identity.
