#!/bin/zsh

set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

repo_dir=$(cd "$(dirname "$0")/.." && pwd)

cd "$repo_dir"

printf '[%s] Running weekly Discord post\n' "$(date '+%Y-%m-%d %H:%M:%S')"
npm run discord:weekly:post