"""Exercise the add-on against an aiohttp app with a stub ComfyUI queue."""
import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer


class Queue:
    def __init__(self):
        self.pending = [(1, "other"), (2, "mine")]
        self.running = [(0, "running")]
        self.interrupted = []

    def delete_queue_item(self, predicate):
        self.pending = [row for row in self.pending if not predicate(row)]

    def get_current_queue(self):
        return self.running, self.pending


class AtomicQueue(Queue):
    def interrupt_if_running(self, prompt_id):
        if any(row[1] == prompt_id for row in self.running):
            self.interrupted.append(prompt_id)
            return True
        return False


class RoutesTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.queue = AtomicQueue()
        instance = types.SimpleNamespace(routes=web.RouteTableDef(), prompt_queue=self.queue)
        self.previous_server = sys.modules.get("server")
        sys.modules["server"] = types.SimpleNamespace(PromptServer=types.SimpleNamespace(instance=instance))
        source = Path(__file__).resolve().parents[1] / "__init__.py"
        spec = importlib.util.spec_from_file_location("moss_studio_test", source)
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        app = web.Application()
        app.add_routes(instance.routes)
        self.client = TestClient(TestServer(app))
        await self.client.start_server()

    async def asyncTearDown(self):
        await self.client.close()
        if self.previous_server is None:
            sys.modules.pop("server", None)
        else:
            sys.modules["server"] = self.previous_server

    async def test_serves_page_workflow_and_modules(self):
        for path in ["/moss-studio", "/moss-studio/", "/moss-studio/assets/app.mjs", "/moss-studio/assets/style.css", "/moss-studio/assets/workflow.mjs"]:
            response = await self.client.get(path)
            self.assertEqual(response.status, 200, path)
        response = await self.client.get("/moss-studio/workflow.json")
        self.assertEqual((await response.json())["id"], "0367da29-31a7-4e90-8e0e-3c5f43a6a146")

    async def test_asset_route_does_not_serve_arbitrary_files(self):
        response = await self.client.get("/moss-studio/assets/__init__.py")
        self.assertEqual(response.status, 404)

    async def test_cancel_pending_leaves_other_jobs_alone(self):
        response = await self.client.post("/moss-studio/cancel", json={"prompt_id": "mine"})
        self.assertEqual(response.status, 200)
        self.assertEqual(self.queue.pending, [(1, "other")])
        self.assertEqual(self.queue.interrupted, [])

    async def test_cancel_running_is_scoped_by_id(self):
        response = await self.client.post("/moss-studio/cancel", json={"prompt_id": "running"})
        self.assertEqual(response.status, 200)
        self.assertEqual(self.queue.interrupted, ["running"])

    async def test_cancel_missing_id_is_rejected(self):
        response = await self.client.post("/moss-studio/cancel", json={})
        self.assertEqual(response.status, 400)
        self.assertEqual(self.queue.pending, [(1, "other"), (2, "mine")])

    async def test_older_core_running_cancel_explains_limit(self):
        queue = Queue()
        self.module.PromptServer.instance.prompt_queue = queue
        response = await self.client.post("/moss-studio/cancel", json={"prompt_id": "running"})
        self.assertEqual(response.status, 409)
        self.assertIn("Use Stop in ComfyUI", (await response.json())["error"])


if __name__ == "__main__":
    unittest.main()
