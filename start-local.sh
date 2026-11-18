#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

aftertrade_node_dir="$HOME/.cache/wwm-tools/node-v22.23.4-linux-x64/bin"
if [[ -x "$aftertrade_node_dir/node" ]]; then
  export PATH="$aftertrade_node_dir:$PATH"
fi

if ! command -v node >/dev/null 2>&1 || ! node -e 'const [major,minor,patch]=process.versions.node.split(".").map(Number); process.exit(major>22 || major===22 && (minor>23 || minor===23 && patch>=4) ? 0 : 1)' 2>/dev/null; then
  echo "AfterTrade needs Node.js 22.23.4 or later installed in WSL."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm ci
fi

echo "Starting AfterTrade at http://localhost:5173"
echo "Keep this terminal open. Press Ctrl+C to stop."
exec npm run dev
