#!/bin/zsh

set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

repo_dir=$(cd "$(dirname "$0")/.." && pwd)
mode="${WEEKLY_DISCORD_MODE:-post}"

case "$mode" in
	post|preview|test)
		;;
	*)
		echo "Unsupported WEEKLY_DISCORD_MODE: $mode" >&2
		exit 1
		;;
esac

cd "$repo_dir"

printf '[%s] Running weekly Discord %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$mode"
npm run "discord:weekly:$mode"