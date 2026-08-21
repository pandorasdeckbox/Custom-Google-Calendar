#!/bin/zsh

set -euo pipefail

label="com.pandorasdeckbox.custom-google-calendar.weekly-discord"
repo_dir=$(cd "$(dirname "$0")/.." && pwd)
template_path="$repo_dir/launchd/${label}.plist"
agent_dir="$HOME/Library/LaunchAgents"
agent_path="$agent_dir/${label}.plist"
wrapper_dir="$HOME/bin"
wrapper_path="$wrapper_dir/custom-google-calendar-weekly-discord.sh"
log_dir="$HOME/Library/Logs"

mkdir -p "$agent_dir" "$log_dir" "$wrapper_dir"

cat > "$wrapper_path" <<EOF
#!/bin/zsh

set -euo pipefail

cd "$repo_dir"
exec /bin/zsh ./scripts/run-weekly-discord-post.sh
EOF

chmod +x "$wrapper_path"

sed \
  -e "s|__REPO_DIR__|$repo_dir|g" \
  -e "s|__WRAPPER_PATH__|$wrapper_path|g" \
  -e "s|__LOG_DIR__|$log_dir|g" \
  "$template_path" > "$agent_path"

launchctl bootout "gui/$UID" "$agent_path" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$agent_path"

echo "Installed launch agent: $label"
echo "Plist: $agent_path"
echo "Wrapper: $wrapper_path"
echo "Schedule: Monday at 10:30 AM"
echo "Log: $log_dir/custom-google-calendar-weekly-discord.log"
echo "Error log: $log_dir/custom-google-calendar-weekly-discord.error.log"