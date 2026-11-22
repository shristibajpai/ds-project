import json
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT_DIR / "public"
BACKEND_DIR = ROOT_DIR / "backend"
HOST = "127.0.0.1"
PORT = 8080


def find_binary() -> Path:
    candidates = [
        BACKEND_DIR / "task_manager.exe",
        BACKEND_DIR / "task_manager",
    ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError(
        "Compiled C binary not found. Compile first:\n"
        "  gcc backend/task_manager.c -o backend/task_manager"
    )


class CBackendBridge:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.proc = None
        BACKEND_DIR.mkdir(parents=True, exist_ok=True)
        self._start_process()

    def _start_process(self) -> None:
        binary = find_binary()
        self.proc = subprocess.Popen(
            [str(binary), "--server"],
            cwd=str(ROOT_DIR),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            bufsize=1,
        )

    def send_command(self, command: str) -> dict:
        clean_cmd = command.replace("\r", " ").replace("\n", " ").strip()
        with self.lock:
            if self.proc is None or self.proc.poll() is not None:
                self._start_process()

            assert self.proc.stdin is not None
            assert self.proc.stdout is not None

            self.proc.stdin.write(clean_cmd + "\n")
            self.proc.stdin.flush()

            response_line = self.proc.stdout.readline()
            if not response_line:
                self._start_process()
                raise RuntimeError("C backend closed stdout unexpectedly.")

            return json.loads(response_line)


bridge = CBackendBridge()


class AppHandler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/api/tasks":
            try:
                data = bridge.send_command("LIST")
                self._send_json(200, data)
            except Exception as exc:
                self._send_json(500, {"ok": False, "message": str(exc)})
            return

        if parsed.path in ("/", "/index.html"):
            index_file = PUBLIC_DIR / "index.html"
            if not index_file.exists():
                self.send_error(404, "public/index.html not found")
                return
            content = index_file.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        self.send_error(404, "Not Found")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/tasks":
                body = self._read_json()
                name = str(body.get("name", "")).replace("\n", " ").replace("\r", " ")
                priority = int(body.get("priority", 0))
                data = bridge.send_command(f"INSERT {priority}|{name}")
                self._send_json(200 if data.get("ok") else 400, data)
                return

            if parsed.path == "/api/tasks/process":
                data = bridge.send_command("PROCESS")
                self._send_json(200 if data.get("ok") else 400, data)
                return

            if parsed.path == "/api/tasks/clear-completed":
                data = bridge.send_command("CLEAR_COMPLETED")
                self._send_json(200, data)
                return

            if parsed.path == "/api/tasks/reset":
                data = bridge.send_command("RESET")
                self._send_json(200, data)
                return

            self.send_error(404, "Not Found")
        except (ValueError, json.JSONDecodeError) as exc:
            self._send_json(400, {"ok": False, "message": f"Invalid payload: {exc}"})
        except Exception as exc:
            self._send_json(500, {"ok": False, "message": str(exc)})

    def do_PATCH(self) -> None:
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) == 4 and parts[0] == "api" and parts[1] == "tasks" and parts[3] == "priority":
            try:
                task_id = int(parts[2])
                body = self._read_json()
                priority = int(body.get("priority", 0))
                data = bridge.send_command(f"UPDATE {task_id} {priority}")
                self._send_json(200 if data.get("ok") else 400, data)
            except (ValueError, json.JSONDecodeError) as exc:
                self._send_json(400, {"ok": False, "message": f"Invalid payload: {exc}"})
            except Exception as exc:
                self._send_json(500, {"ok": False, "message": str(exc)})
            return
        self.send_error(404, "Not Found")

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) == 3 and parts[0] == "api" and parts[1] == "tasks":
            try:
                task_id = int(parts[2])
                body = self._read_json()
                name = str(body.get("name", "")).replace("\n", " ").replace("\r", " ")
                priority = int(body.get("priority", 0))
                data = bridge.send_command(f"EDIT {task_id} {priority}|{name}")
                self._send_json(200 if data.get("ok") else 400, data)
            except (ValueError, json.JSONDecodeError) as exc:
                self._send_json(400, {"ok": False, "message": f"Invalid payload: {exc}"})
            except Exception as exc:
                self._send_json(500, {"ok": False, "message": str(exc)})
            return
        self.send_error(404, "Not Found")

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) == 3 and parts[0] == "api" and parts[1] == "tasks":
            try:
                task_id = int(parts[2])
                data = bridge.send_command(f"DELETE {task_id}")
                self._send_json(200 if data.get("ok") else 400, data)
            except ValueError:
                self._send_json(400, {"ok": False, "message": "Invalid task ID"})
            except Exception as exc:
                self._send_json(500, {"ok": False, "message": str(exc)})
            return
        self.send_error(404, "Not Found")

    def log_message(self, fmt: str, *args) -> None:
        print(f"[{self.address_string()}] {fmt % args}")


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Priority Task Manager UI running at http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.server_close()
