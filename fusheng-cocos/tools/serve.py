from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse

parser=argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=8088)
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent/'build'
class Server(ThreadingHTTPServer):
    request_queue_size=128
    daemon_threads=True
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(root),**kwargs)
    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        super().end_headers()
    def log_message(self,*args):
        pass
print(f'Local Web builds: http://127.0.0.1:{args.port}/web-mobile/ and /web-desktop/',flush=True)
Server(('0.0.0.0',args.port),Handler).serve_forever()
