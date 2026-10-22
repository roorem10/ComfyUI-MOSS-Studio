"""MOSS Studio: same-origin browser interface for the supplied native MOSS graph."""
from pathlib import Path

from aiohttp import web
from server import PromptServer

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
WEB_DIRECTORY = "./js"
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

__version__ = "1.1.0"

ROOT = Path(__file__).resolve().parent
routes = PromptServer.instance.routes


@routes.get("/moss-studio")
@routes.get("/moss-studio/")
async def moss_studio_index(request):
    return web.FileResponse(ROOT / "web" / "index.html", headers={"Cache-Control": "no-cache"})


@routes.get("/moss-studio/assets/{name}")
async def moss_studio_asset(request):
    name = request.match_info["name"]
    if name not in {"style.css", "app.mjs", "workflow.mjs"}:
        raise web.HTTPNotFound()
    path = ROOT / "web" / name
    content_type = "text/css" if name.endswith(".css") else "text/javascript"
    return web.Response(body=path.read_bytes(), content_type=content_type,
                        headers={"Cache-Control": "no-cache"})


@routes.get("/moss-studio/workflow.json")
async def moss_studio_workflow(request):
    return web.FileResponse(ROOT / "workflow.json", headers={"Cache-Control": "no-cache"})


@routes.post("/moss-studio/cancel")
async def moss_studio_cancel(request):
    """Cancel only the requested job; never issue an unscoped global interrupt."""
    try:
        data = await request.json()
    except (ValueError, TypeError):
        raise web.HTTPBadRequest(text="Expected a JSON object")
    prompt_id = data.get("prompt_id") if isinstance(data, dict) else None
    if not isinstance(prompt_id, str) or not prompt_id or len(prompt_id) > 128:
        raise web.HTTPBadRequest(text="A prompt_id is required")
    queue = PromptServer.instance.prompt_queue
    # Recent ComfyUI can atomically interrupt by ID. Older versions can safely
    # remove a pending job, but must use ComfyUI's own controls for running jobs.
    queue.delete_queue_item(lambda item: item[1] == prompt_id)
    interrupt = getattr(queue, "interrupt_if_running", None)
    if callable(interrupt):
        interrupted = bool(interrupt(prompt_id))
        return web.json_response({"status": "cancel_requested", "interrupted": interrupted})
    running, _ = queue.get_current_queue()
    if any(item[1] == prompt_id for item in running):
        return web.json_response({"error": "This ComfyUI version cannot safely stop one running job. Use Stop in ComfyUI, or let this image finish."}, status=409)
    return web.json_response({"status": "removed_or_finished"})
