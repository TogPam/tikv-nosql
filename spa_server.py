import http.server
import socketserver
import os

PORT = 5173
DIRECTORY = "/app/frontend"

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        target = self.translate_path(self.path)
        if not os.path.exists(target):
            self.path = "/index.html"
        return super().do_GET()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
        print(f"Serving frontend SPA on port {PORT}...")
        httpd.serve_forever()
