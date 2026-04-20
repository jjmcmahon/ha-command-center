#!/bin/bash
# Hard-redeploy the HA bridge without fighting the watchdog.
# Safe to re-run. Prints the resulting PID + top of fresh log.
set -e

# 1. Pause watchdog — kill only the sh/bash invocation, not the tee pipe.
#    start-all.sh revives watchdog on next container recreation, but we don't
#    need it during this deploy window.
pkill -f 'bash /data/bridges/watchdog.sh' || true

# 2. Kill every running ha-bridge invocation so no zombies race us.
pkill -9 -f 'node .*ha-bridge.mjs' || true
sleep 2

# 3. Start fresh with the on-disk bridge. Same redirect as ensure-ha-bridge.sh
#    so the log overwrites cleanly.
cd /data/bridges
HA_URL="${HA_URL:-http://192.168.120.3:8123}"
HA_TOKEN="$(cat /data/bridges/.ha-token)"
export HA_URL HA_TOKEN
setsid nohup node /data/bridges/ha-bridge.mjs > /tmp/ha-bridge.log 2>&1 </dev/null &
sleep 4

# 4. Restart watchdog so the auto-respawn safety net is back.
#    nohup through setsid matches how start-all.sh launches it.
nohup setsid bash /data/bridges/watchdog.sh >>/tmp/watchdog.log 2>&1 </dev/null &
sleep 1

# 5. Report.
echo "=== bridge ==="
ps -eo pid,etime,cmd | grep 'ha-bridge.mjs' | grep -v grep || echo "(no bridge running)"
echo "=== watchdog ==="
ps -eo pid,etime,cmd | grep 'watchdog.sh' | grep -v grep || echo "(no watchdog running)"
echo "=== fresh log head ==="
head -20 /tmp/ha-bridge.log
