#!/usr/bin/env bash
# Keeps dist/chrome-mv3 built from the latest origin/master so that browsers
# loading it as an unpacked extension pick up the new version on restart.
# Run periodically by the coach-ext-update.timer systemd user unit.
set -euo pipefail

PATH="$HOME/.local/share/mise/shims:$PATH"
cd "$(dirname "$0")/.."

# Never touch a repo with work in progress.
if [ -n "$(git status --porcelain)" ]; then
  echo "working tree not clean, skipping"
  exit 0
fi

git fetch origin master --quiet

if [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/master)" ] \
  && [ -f dist/chrome-mv3/manifest.json ]; then
  echo "already up to date at $(git rev-parse --short HEAD)"
  exit 0
fi

git merge --ff-only origin/master
npm install --no-audit --no-fund
npm run build
echo "built $(git rev-parse --short HEAD)"
