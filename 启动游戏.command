#!/bin/bash
cd "$(dirname "$0")" || exit 1
python3 - <<'PY'
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

project = Path.cwd() / 'fusheng-cocos'
if not (project / 'build/web-desktop/index.html').exists():
    print('新版尚未构建，请先在 fusheng-cocos 中运行 npm run build:web。')
    sys.exit(1)
url = 'http://127.0.0.1:8088/web-desktop/'
def ready():
    try:
        with urllib.request.urlopen(url, timeout=1) as response:
            return b'Fusheng Paper House' in response.read()
    except Exception:
        return False
if not ready():
    log_path = project / 'output/launcher.log'
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open('a') as log:
        process = subprocess.Popen(
            [sys.executable, str(project / 'tools/serve.py'), '--port', '8088'],
            cwd=project, stdin=subprocess.DEVNULL, stdout=log, stderr=log,
            start_new_session=True,
        )
    for _ in range(30):
        if ready():
            break
        if process.poll() is not None:
            break
        time.sleep(0.15)
    else:
        print('游戏服务未就绪，请查看 fusheng-cocos/output/launcher.log。')
        sys.exit(1)
if not ready():
    print('8088 端口可能被占用。请查看 fusheng-cocos/output/launcher.log。')
    sys.exit(1)
subprocess.run(['open', url], check=True)
PY
