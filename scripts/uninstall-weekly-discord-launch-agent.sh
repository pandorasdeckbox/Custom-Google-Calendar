#!/bin/zsh

set -euo pipefail

label="com.pandorasdeckbox.custom-google-calendar.weekly-discord"
agent_path="$HOME/Library/LaunchAgents/${label}.plist"
wrapper_path="$HOME/bin/custom-google-calendar-weekly-discord.sh"

launchctl bootout "gui/$UID" "$agent_path" 2>/dev/null || true
rm -f "$agent_path"
rm -f "$wrapper_path"

echo "Removed launch agent: $label"