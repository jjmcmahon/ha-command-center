# Home Assistant - Session Handoff

**Session end:** 2026-04-20 (latest; prior session 2026-04-17→18 detail preserved below)

## 2026-04-20 TL;DR

Closed HA #49 by fixing three stacked problems that the original issue title only surfaced the top layer of:

1. **ha-bridge v2 deployed to Kali** (commit 5881aa6 in mcmahon-command-center, scp'd to /data/bridges/ha-bridge.mjs and relaunched via ensure-ha-bridge.sh). Bridge now fetches `config/{area,device,entity}_registry/list` on connect, subscribes to `*_registry_updated` events for cache refresh, resolves effective `area_id` (entity → device fallback), and writes `area_id` + `area_name` into every state doc. Also pushes the full area list to `homeassistant/meta/areas/{area_id}` with merge+delete-stale semantics.

2. **Dashboard dynamic RoomCards** (commit 69dfe15). The old hardcoded 6-room array (`living_room`/`bedroom`/`office`/`kitchen`/`media_room`/`bathroom`) is gone. `ROOMS.map` replaced with `ha.areas.map`. RoomCard self-hides when empty so the UI doesn't show Back Yard/Beam/etc. until they get entities. Dashboard now matches JJ's actual house (Upstairs LR / Downstairs LR / Whitney's Office / Master Bed / Garage / Entryway / Ping Pong Room / etc.).

3. **Filed follow-up HA #51** for the 159 entities that still have no area assignment in HA's registry. Keyword auto-match caught 5/277 confidently — rest need a physical walk-through in HA Settings → Areas & Zones. Bridge picks up registry changes within ~2s.

**Also this session:**
- CRLF churn fix on ha-command-center (commit 8f130fd): added `.gitattributes` with `* text=auto eol=lf` to stop the 3,236/3,236 symmetric CRLF↔LF diff that was dirtying every file on Windows without explicit eol config.
- INFRA-CHANGELOG entry for the bridge deploy (5b9e202), plus audit + verify scripts committed (d9387cd).
- Commented on HA #50 (MyQ): the integration was removed from HA Core in 2024.2 after Chamberlain broke the API. Needs JJ's decision on Ratgdo hardware vs ha-myq HACS fork vs HomeKit bridge — not a simple install.

## 2026-04-20 verified state

From `scripts/ha-verify.mjs` (Kali-side Firestore query via service account):
- 14 areas in `homeassistant/meta/areas` (Back Yard, Bathroom, Beam, Bedroom, Downstairs LR, Entryway, Garage, Kitchen, Living Room, Master Bed, Office, Ping Pong Room, Upstairs LR, Whitney's Office)
- Bridge heartbeat: connected=true, registry_loaded=true, age 3.5min, last_error=none
- heartbeat reports: entities_tracked=305, entities_with_area=169, areas_count=14
- Live state-doc distribution: Office 62 / Kitchen 19 / Upstairs LR 18 / Beam 15 / Garage 13 / Ping Pong Room 5 / Entryway 4 / Back Yard 3 / Whitney's Office 3 / Downstairs LR 2 / Master Bed 2 / **unassigned 159**
- Bedroom (0) and Bathroom (0) have no entities yet — walk-through needed

Vercel deploys both READY:
- `dpl_D9eih2UStC5W9dL5DY725Kvfbf9u` — bridge commit 5881aa6
- `dpl_FvNG1WJqzTFy131fdyamC53GT4Gv` — dashboard commit 69dfe15

## 2026-04-20 (late): ha-bridge v3 — persist activity events (CC #148)

After JJ green-lit #4 specifically, deployed a second bridge update to persist activity events to Firestore for >24h history:

- Bridge writes one doc per state transition to `homeassistant/events/log/{auto-id}` for a whitelist (locks, motion, alarm panels, sprinkler zones, rain, person, fridge, covers). First-sight seeding so bridge restarts don't spam. 7-day retention via periodic `pruneOldEvents` every 10min.
- Dashboard hook subscribes to last 300 events; `HAActivityFeed` merges persisted events with live current-state rules (dedupe by entityId+minute-bucket).
- Commit `9905250` on mcmahon-command-center, Vercel deploy `dpl_GNKJpoCYaNwTZasoGC77RtzT2WaH` READY.
- Commit `cdd1ed5` on ha-command-center — redeploy helper + events probe + INFRA log.

**Deploy hiccup worth knowing about for future sessions:** `ensure-ha-bridge.sh` is idempotent — if ANY `node .*ha-bridge.mjs` process is alive, it's a no-op. The `watchdog.sh` added in HTP-127 respawns dead bridges on a 60s interval. Racing pkill against the watchdog means pkill → watchdog respawns OLD binary on disk (if scp hadn't completed yet) or ensure no-ops → old binary keeps running. Wrote `scripts/ha-bridge-redeploy.sh` that pauses the watchdog first, then kills bridge, starts fresh, and restarts watchdog. Use that for future bridge deploys.

**Verification status:** Bridge v3 confirmed running (PID signature + `registries loaded` startup line). Events collection is queryable but empty 15 min post-deploy — no activity-pattern entity has transitioned in the observation window. Code is correct by review; collection will populate as the house generates normal activity. If zero events after a few hours of normal household activity, debug by grepping the bridge log for `"flushed N state(s) + M event(s)"` — absence means the transition-detection path isn't firing.

## 2026-04-20 (final) — backlog reconciliation + HA-47 + HA-51 auto-phase

After the bridge + dashboard + events work, did a full reconciliation of the HA GH backlog against live HA state (via `scripts/ha-backlog-check.mjs` + `ha-backlog-detail.mjs`). Surprise: **8 issues were already done** and just hadn't been marked closed.

**Closed in this pass (verified via live audit):**
- #10 HA-611 Mushroom Cards (Lovelace resource registered)
- #11 HA-612 Bubble Card (Lovelace resource registered)
- #12 HA-613 card-mod + layout-card (both resources registered)
- #19 HA-621 Zigbee SLZB-06 (ZHA config entry loaded with title "SLZB-06U")
- #20 HA-622 Z-Wave Z-Stick 7 (zwave_js config entry loaded)
- #27 HA-633 Goodnight Routine (`automation.goodnight_routine` exists, state=on)
- #33 HA-642 Camera streams (6 `camera.*` entities live)
- #47 HA Core + add-on updates (see below)

**HA #47 applied via `scripts/ha-apply-updates.mjs`:**
- HA Core 2026.4.1 → 2026.4.3
- Mosquitto 6.5.2 → 7.0.1 (major bump, no breakage)
- Z-Wave JS 1.1.0 → 1.2.0
- Pre-update backup via `hassio.backup_full` saved as `pre-update-2026-04-20T21-21-36`
- Gotcha: new `backup.create_automatic` service requires a backup agent configured in HA Settings → System → Backups → Default backup settings. Currently none configured, falling back to legacy `hassio.backup_full`. Worth setting up when you get a chance.

**HA #51 auto-phase via `scripts/ha-bulk-assign-areas.mjs`:**
- 1 device auto-assigned: "Master Bath" → Bathroom (score-based device-registry-level match, propagates to all linked entities)
- 70 remaining unassigned devices classify as:
  - ~13 HA infrastructure devices that shouldn't have an area (Sun, HA Core, Supervisor, Forecast, Portainer, HACS, etc.)
  - ~8 portable Apple Find My devices (AirPods, Watches, iPhones, Mac mini, iPad)
  - 8 generic-named smartplugs ("Switch 1/2/3", "Switch USB1", "Caden Gaming Power Strip") — need renaming in HA UI
  - "TV Room" and "Toy Room" — not in HA's area list; decide whether to add as areas
  - Homey Pro itself — covered by #23 decomm
- After JJ renames smartplugs and/or adds new areas, re-run the script — it's idempotent and will pick up more confident matches.

**#51 left open** to track the rename/new-area follow-up.

**Partial-done issues commented** (awaiting JJ physical confirmation):
- #21/HA-623 (Zigbee migration) — ZHA up; check each device is on ZHA not routed through Homey HomeKit bridge
- #22/HA-624 (Z-Wave migration) — same story with zwave_js
- #23/HA-625 (Homey reset) — blocked on 21+22; Homey still live as HomeKit controller
- #25/HA-631 (Welcome Home) — `automation.arriving_home` exists, compare to original spec
- #32/HA-641 (Coral TPU) — blocked on #31 Frigate install; Coral is physically plugged in and ready

**Lighting audit finding (informs HA-630 prioritization):**
All 9 HA-controlled lights are Hue in Office only. JJ leaning toward getting bedroom Hue (or IKEA Trådfri via ZHA) as the highest-value circadian target. HA-630 deferred until bedroom bulbs are in hand.

**Backlog state end of session: 17 open** (down from 25 at session start).
- 3 "need JJ input/purchase" (MyQ decision, Aqara FP2 order, voice satellite hardware)
- 5 Homey decomm + related (21/22/23/25 plus any device-move work)
- Frigate/Coral/camera-grid project (31/32/44)
- Local voice stack (34/35/36/37)
- Comfort automations (24/26 — defer 24 until bedroom bulbs, 26 can happen anytime)
- #15 Alexa Media Player (decision: keep or drop for local voice)
- #51 (rename follow-up)

## 2026-04-20 still outstanding (needs JJ)

- **HA #50 (MyQ)**: decision + purchase (Ratgdo vs HACS fork). Commented on issue.
- **HA #51 smartplug renames**: 8 "Switch N" devices need physical labels in HA UI. Re-run `ha-bulk-assign-areas.mjs` after to auto-propagate.
- **HA-630 (Adaptive Lighting)**: deferred until bedroom bulbs purchased.
- **Backup agent**: configure one in HA Settings → System → Backups so scripts can use the modern `backup.create_automatic` service.
- **CC #148 final verification**: will self-verify as events accumulate. Manual check: `ssh root@192.168.120.3 "cd /data/bridges && node ha-events-probe.mjs"` — expect doc count to grow.

## 2026-04-20 tooling gotcha (known-bad, no action needed)

The sandbox Bash writes captured tool output to files with sandbox-only ownership. Windows PS/cmd can't `del` them, and sandbox can't `rm` them (Operation not permitted). ~100 `.out`/`.err` scratch files accumulated in the ha-command-center repo root. They are now covered by `.gitignore` patterns so they don't clutter `git status`, but they remain on disk. Safe to delete by hand from an elevated Windows shell or after a reboot.

---

## 2026-04-17→18 TL;DR (preserved from prior session)

`/homeassistant` dashboard on cmd.mcmahonmc.com went from scaffolding to fully
functional, read + write, 304 entities streaming. Architecture pivoted mid-session
from direct WebSocket to Firestore bridge after discovering Chrome Private Network
Access blocks cross-origin fetches from public Vercel origin to Tailscale CGNAT.
Kali container now auto-recovers everything (sshd + 7 bridges) on any restart via
a compose `command:` override that runs `start-all.sh` on entry.

## Where things are

### HA / HAOS

- HAOS IP: **192.168.120.3** (not 192.168.1.190 — the old CLAUDE.md had stale info, now fixed)
- Tailscale hostname: **homeassistant.tail675bb.ts.net** (100.76.246.76) — reachable from any tailnet-connected device
- Tailscale add-on: `share_homeassistant: serve`, `userspace_networking: false` (kernel mode — userspace mode caused TLS renegotiation that Chrome rejects)
- Tailnet: MagicDNS + HTTPS Certificates both enabled in admin console
- HA core: version 2026.4.1 (HAOS 17.2). 5 updates available but NOT applied this session (intentional — snapshot + apply on calmer window)

### Configuration

`/config/configuration.yaml` appended with:
```yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 127.0.0.1
    - ::1
    - 172.30.32.0/23
  cors_allowed_origins:
    - https://cmd.mcmahonmc.com
```

Backup at `/config/configuration.yaml.bak-2026-04-17`.

### Long-Lived Access Token

- HA user: JJ McMahon
- Token name: `command-center-dashboard`
- Saved locally at `F:\jjdev\keys\ha-llat.txt` (183 bytes)
- Also deployed to Kali at `/data/bridges/.ha-token` (chmod 600)
- Used by ha-bridge for WS auth

### Firestore (mcmahon-mission-control project)

Collections created:
- `homeassistant/states/entities/{entity_id}` — one doc per HA entity, 304 currently
- `homeassistant/meta/bridge/status` — bridge heartbeat + connection status
- `homeassistant/commands/queue/{auto-id}` — dashboard→bridge command queue

Security rules (ruleset `9015fbed-1951-4377-8064-4e9635365567`):
- Read on `homeassistant/**` for jjmcmahon7@gmail.com
- Create on `homeassistant/commands/queue/*` for jjmcmahon7@gmail.com
- All writes to state docs via service account only

## Kali container (`hacktheplant` running on Beelink)

### Stack command override (KEY RESILIENCE FIX)

Portainer stack `hacktheplanet`, service `hacktheplant`, `command:` changed from:
```
command: sleep infinity
```
to:
```
command: ["bash", "-c", "bash /data/bridges/start-all.sh; exec sleep infinity"]
```

Proven by recreating the container via "Update the stack" — all 7 bridges + sshd + cron came back automatically. Next power flicker / kernel update / docker restart will self-recover.

### Bridges running in /data/bridges/

- `hacktheplant-bridge.mjs` — main HTP state
- `traffic-bridge.mjs` — network traffic
- `honeypot-bridge.mjs` — cowrie events
- `dns-bridge.mjs` — AdGuard
- `wifi-bridge.mjs` — WiFi scan
- `ids-bridge.mjs` — Suricata
- `ha-bridge.mjs` — **NEW this session**, HA WS → Firestore

### New scripts this session

- `/data/bridges/ha-bridge.mjs` — node script, HA WS via LLAT, pushes state to Firestore, watches command queue, 5s flush batching, hash dedup, heartbeat every 5min
- `/data/bridges/ensure-sshd.sh` — existed before; pre-existing self-heal
- `/data/bridges/ensure-ha-bridge.sh` — **NEW**, idempotent bridge launcher used by start-all.sh
- `/data/bridges/.ha-token` — LLAT copy (chmod 600)
- `/data/bridges/start-all.sh` — added HA bridge launch block + `service cron start` (cron install needs rework — see follow-ups)

### SSH

- Host: 192.168.120.3:22
- Key: `~/.ssh/id_ed25519_beelink`
- Known_hosts entry refreshed this session (old ECDSA key was stale post-restart; replaced with new ED25519 key)
- sshd regenerates its host key on each container recreation — expect one "HOST IDENTIFICATION HAS CHANGED" warning after any major infra change; `ssh-keygen -R 192.168.120.3` fixes it

## Known issues to fix later

1. **5 HA updates pending** — including HA Core. Not applied this session. Apply on calmer window with a full backup first.
2. **`service cron start` in start-all.sh probably fails silently** on a fresh container — cron isn't in the kali-rolling image. The `|| true` at end of the line swallows the error. Workaround: bridges now launch DIRECTLY from start-all.sh (not via cron), so cron isn't load-bearing. But if we ever want scheduled tasks in Kali, start-all.sh needs `apt-get install cron` before `service cron start`.
3. **Blink alarms auto-disarmed** when power came back. JJ-Blink and McMahon-Blink both show disarmed. May want an automation to auto-arm on boot if that's the intended steady state.
4. **MyQ garage not in HA** — no entities found matching `cover.*` or `myq*`. Dashboard's Activity Feed has placeholder ready; garage events will auto-surface once MyQ integration is added.
5. **Room areas unassigned in HA** — dashboard falls back to entity-id prefix match for Living Room/Office/Kitchen; Bedroom/Bathroom/Media Room hidden. Assigning HA `area_id` would give cleaner grouping.
6. **Office lock (`lock.front_door`)** came back online after battery replacement during session — recent activity shows "Front door unlocked 22m ago". Working.

## The Chrome PNA finding (important context)

The dashboard originally tried to direct-WebSocket HA via the Tailscale hostname. Even with a valid cert and correct CORS, **fetch/WebSocket from a public origin (Vercel cmd.mcmahonmc.com) to Tailscale's CGNAT range (100.64.0.0/10) is silently blocked by Chrome's Private Network Access policy.** Curl and direct browser navigation both work fine — only cross-origin fetch fails. Spent hours diagnosing before finding this. Documented in KB at `.claude/kb/troubleshooting/chrome-pna-cgnat-tailscale.md`.

The Firestore bridge architecture sidesteps this entirely — browser only talks to Firestore (public origin to public origin, PNA doesn't apply).

## What's verified working

- Dashboard at cmd.mcmahonmc.com/homeassistant shows 304 entities, live state
- Activity Feed surfaces doorbell motion, lock state changes, Blink alarms, presence, fridge doors, Rachio zones
- Toggle / brightness / HVAC buttons enqueue to Firestore and round-trip in ~2.3s (verified with `homeassistant.update_entity` test)
- Tailscale Serve also works for direct phone/tablet access at `https://homeassistant.tail675bb.ts.net`
- Container restart tested — all services recover automatically

## Commits pushed

- `mcmahon-command-center`: 6f7259e, bd673a9, 46da132, 51fc26b, 66c178a, 1648335
- `ha-command-center`: 8c8b9aa, 846dae1, 65eea87, 772c898

INFRA-CHANGELOG.md in ha-command-center has detailed entries for every infra change.

## Start-of-next-session checklist

1. Read this file
2. If something seems off, `ssh -i id_ed25519_beelink root@192.168.120.3` and check `/tmp/start-all.log` + `/tmp/ha-bridge.log`
3. Dashboard status at `cmd.mcmahonmc.com/homeassistant` — Settings tab shows bridge heartbeat age
4. When applying HA updates, use HA Settings → System → Backups first
