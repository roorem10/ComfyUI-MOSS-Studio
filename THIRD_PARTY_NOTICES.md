# Third-party notices

MOSS Image Studio is an independent interface for a separately installed ComfyUI server and MOSS model files. It does not redistribute the ComfyUI application, AI model weights or a community editing extension.

| Upstream project | Relationship |
| --- | --- |
| [ComfyUI](https://github.com/Comfy-Org/ComfyUI) | The user installs it separately. Studio calls its documented APIs and imports its server instance. ComfyUI retains its own license. |
| [MOSS-Image / OpenMOSS](https://github.com/OpenMOSS/MOSS-Image) | Supplies the separately downloaded image models. Its repository and model cards state the applicable model/code licenses. |
| [Comfy-Org MOSS checkpoints](https://huggingface.co/Comfy-Org/MOSS-Image) | Source of the native-format files linked by the installation guide. No checkpoints are in this repository. |
| [aiohttp](https://github.com/aio-libs/aiohttp) | The installed ComfyUI environment supplies the web server dependency; it is not vendored here. |

The repository's LICENSE applies to MOSS Image Studio's original interface source and documentation. Upstream projects retain their licenses, names and trademarks. The two showcase images were supplied by the project owner for the README. No third-party fan artwork or downloaded promotional artwork is included.

The community projects discussed in the image-to-image research notes are references, not bundled components or required dependencies. Their software and weights have their own terms.
