# Home Assistant - Session Handoff

**Session end:** 2026-09-18 (latest; prior sessions 2026-09-17, 2026-09-16, 2026-04-20 and 2026-04-17→18 detail preserved below)

## 2026-09-18 TL;DR — backups existed only in theory

**The big one: this HA had never completed an automatic backup.** Not "the schedule was wrong" — `last_completed_automatic_backup: null`, `recurrence: never`. The newest full backup was 2026-09-10 and it was incidental, created by a version update. Everything in this instance — Z-Wave pairings, Nest, Hue, the lot — was one SD-card failure from being rebuilt by hand.

Now **daily 03:30, 7 copies, all add-ons + database + ssl/share**. Verified twice: manual trigger 09-17 13:06 (47.5 MB, 9 add-ons, 0 failures) and then the **unattended scheduled run at 09-18 03:30:13** (50.8 MB, 9 add-ons). Next 09-19 03:30.

Including add-ons is the part that matters — the Z-Wave JS add-on holds the network keys, and a backup without it means re-pairing every Z-Wave device after a restore.

**The Supervisor API was a red herring — don't build a workaround for it.** `/api/hassio/*` 401ing on long-lived tokens is irrelevant. The native `backup` integration and `backup.create_automatic` work over the normal API, and every `hassio.*` *service* (`backup_full`, `addon_restart`, `host_reboot`…) is callable too. Only the raw REST proxy is blocked.

**MQTT swept — 8 orphans, not 4.** The z2m add-on left 8 `zigbee2mqtt_bridge_*` entities; the earlier count only saw the 4 that were `unavailable`. All removed. **`integration_entities('mqtt')` is now `[]` — the Mosquitto broker has zero consumers**, though the add-on is still installed and running. Removing it is an easy win, pending JJ.

**Correction — most "stale" entities aren't stale.** I called ~49 `mobile_app` entities dead leftovers. They're not: both entries are `loaded` and belong to **JJi17pro** and **JJiPad6thGen**, your current devices. The unavailable ones are Companion-app sensors switched *off on the device*. Deleting them churns the registry for nothing — HA recreates them the instant a sensor is re-enabled. Left alone on purpose. Full triage table in INFRA-CHANGELOG.

**WeatherFlow's 3 unavailable are the lightning sensors** — `lightning_last_distance/energy/strike`. Unavailable because no lightning has struck yet. Working as designed.

Registry backup before the sweep: `PPM\archive\ha-entity-registry-2026-09-17.json` (555 entities, 112 devices).

**Open, pending JJ:** remove the Mosquitto add-on + `mqtt` entry (zero consumers); Blink `gaming_area` camera (6 entities, genuinely offline — keep or drop?); 2 iBeacons out of range (4 entities); Withings credentials; Apple TV / HomePod / LG TV pairing PINs. The `androidtv_remote` Projector entry is **deliberately left in place** — it's upstairs and powered off, and will connect when JJ sets it up.

## 2026-09-17 TL;DR — verification pass over the Nest work

Audited what a parallel session had built. Nest is genuinely working — `climate.ping_pong_room_mcmahon_nest`, 72 °F / cool / 48 %, plus temperature, humidity and fan-timer sensors. Both repos clean and pushed, no conflicts. **And the thing that matters most checks out: `mcmahon-mission-control`'s consent screen is In production, so there is no 7-day refresh-token expiry.** That is the failure mode that otherwise breaks Nest every week.

Three things were not as documented. All now fixed and logged in INFRA-CHANGELOG:

1. **Pub/Sub was never connected, and the documented fix could not work.** The handoff said "Reconfigure → pick the subscription". HA 2026.9.1's `NestFlowHandler` supports no `reconfigure`, no `reauth` and no options flow — all three probed and rejected. The subscription was provably unconsumed: oldest-unacked-message age climbed 4.95 min → 7.95 min over twelve minutes. **Decision: skipped** (thermostat only, no cameras/doorbells, so polling is fine) and the subscription was deleted. Topic and Device Access Events left in place, harmless.
2. **A whole orphaned GCP project.** `mcmahon-nest` — created as the isolated home for Nest — was never used; the parallel session made a *second* OAuth client in `mcmahon-mission-control` instead. Shut down 2026-09-17, deletes 2026-10-17.
3. **`climate.downstairs` (the 162 °F ghost) was Homey's copy of the same physical Nest thermostat.** Disabled, not deleted — `homekit_controller` recreates deleted entities on reload while Homey still advertises the accessory.

Also: **ZHA moved off channel 11 → 25** while its network is still empty, because changing channel after devices are paired forces a re-pair. PAN ID preserved, `nwk_update_id` 0 → 1.

**Two corrections to carry forward:**
- `zigpy.application: Watchdog failure` is **2 occurrences in 42 hours**, not a storm. Over a TCP-attached coordinator that is normal noise. Don't chase it.
- Hue bulbs reading `connectivity_issue` again on 2026-09-17 is **the Office wall switch being off**, confirmed with JJ — same as 2026-09-16. This is the expected signature, not a fault. See the 09-16 entry for how to tell the difference in one read.

**Known-open (unchanged):** Withings (needs developer-portal credentials — note its HA discovery flow has since **disappeared** from the pending list and will need re-triggering), Apple TV "Media Room (3)" + HomePod gen 2, LG webOS TV ×2, `androidtv_remote` "Projector" unreachable at 192.168.120.207:6466, Blink `gaming_area` camera offline, 4 orphaned z2m MQTT entities, ~49 stale `mobile_app` entities. Three WeatherFlow entities went unavailable since 09-16 — not chased, likely hub diagnostics.

**Worth knowing:** a `HomeAssistant-jjmcmahon7` GCP project also exists with Firebase enabled, unused by any of this. Left alone — flagging it so it isn't mistaken for part of the Nest setup.

## 2026-09-16 TL;DR — native integration pass + Hue diagnosis

**Shipped:**
- **Tempest is native now.** Created the `weatherflow` config entry (`01M2NRJ3DBPHVP4NJ9RF7NJ9M6`). It's a local-UDP integration — no cloud account, no credentials, it just found the station on the LAN. 35 entities live across `ST_00111505` (station) and `HB_00119290` (hub): temperature, feels-like, dew point, wet bulb, humidity, pressure, wind speed/gust/lull/direction (+averages), UV, irradiance, illuminance, lightning count/distance/energy, precipitation type/intensity, air density, vapor pressure, battery.
- **Blink recovered** by reloading the config entry. 6 of 8 dead entities came back. The `blinkpy` "Cannot connect to rest-u025.immedia-semi.com" error was transient upstream throttling — DNS resolves fine (3.168.24.x) and HTTPS returns 200 from the LAN, so AdGuard was **not** blocking it. `gaming_area` camera is still `unavailable`; that device is genuinely offline.

**Hue — RESOLVED same session.** The Office wall switch was off. JJ flipped it on; all four bulbs came back immediately: `sensor.hue_{1,2,3,4}_zigbee_connectivity` = `connected`, `light.hue_{1,2,3,4}` = `on`. Diagnosis below confirmed end to end. GH #52 closed.

**Hue — diagnosis as it was worked (kept for the method, not the outcome).**
Chain of evidence: `hue` entry `loaded` → correct bridge (ECB5FAFFFE1B961B @ 192.168.120.213, answers `/api/config`) → zero hue errors in `system_log` → un-hid the bridge's own per-bulb connectivity sensors → **the Hue Bridge itself reports `connectivity_issue` for all four bulbs** while `sensor.hue_bridge_zigbee_connectivity` = `connected`.
All four died 10:56:33–10:56:42 on 2026-09-16. Four bulbs, one room (Office), nine seconds → mains power or mesh, not HA.
**The trap:** `light.office` shows `on` / bri 255 / 2732K and looks healthy. It's the Hue **room group** (`is_hue_group: true`, members = Hue 1–4). Groups have no connectivity resource so they never go `unavailable` — it's echoing the last commanded state. That's why the Hue app looks like it's working. Do not treat `light.office` as evidence the bulbs are alive.
**Outcome:** the wall switch was off. Confirmed the whole chain — the bridge was right, HA was right, and the only misleading signal in the system was the room group.
**Lesson to keep:** when Hue entities go `unavailable`, un-hide `sensor.<light>_zigbee_connectivity` first. It separates "HA can't talk to the bridge" from "the bridge can't talk to the bulb" in one read, and the second case is always physical.

**Two corrections worth carrying forward (both were wrong turns this session):**
1. `sensor.slzb_06u_core_chip_temp` 101.48 / `zigbee_chip_temp` 98.24 are **°F** — this HA runs US customary units. Device's own `/ha_sensors` says 38.60 °C / 34.69 °C, the exact conversions. The SLZB-06U is healthy (ethernet up, 6.3 d uptime). Read as Celsius they look like a radio cooking itself; they aren't.
2. "Blink, Tempest and Withings are all signed up in the portal" ≠ configured in HA. A full `config_entries/get` dump showed **no** `weatherflow`, `withings`, or `nest` entries existed. Vendor-portal signup and an HA config entry are different things — always dump the entries rather than trusting the integrations page from memory.

**ZHA (unchanged, flagged):** loaded on the SLZB-06U (`socket://192.168.120.143:6638`, znp/CC2652), **empty network** — coordinator only, zero paired devices — on **channel 11**, a Hue default channel. Not today's cause, but move it before migrating devices off Homey onto ZHA.

**Blocked on JJ (credentials / physical only):**
| Thing | State | What's needed |
|---|---|---|
| Withings | flow pending at `oauth_discovery` (DHCP-discovered) | Application Credentials from the Withings developer portal |
| Nest thermostat | no entry; via Homey HomeKit bridge only | Google Device Access project ($5 one-time) + OAuth creds |
| Apple TV "Media Room (3)" | zeroconf flow at `confirm` | PIN shown on device |
| HomePod gen 2 "Media Room" | zeroconf flow at `confirm` | PIN shown on device |
| LG webOS TV UR9000PUA | SSDP flow at `pairing` | accept prompt on the TV |
| LG webOS TV CDBD | homekit_controller flow at `pair` | HomeKit pairing code |
| androidtv_remote "Projector" | `setup_retry` | device unreachable at 192.168.120.207:6466 |
| ~~Hue 1–4~~ | ~~bridge says `connectivity_issue`~~ | **DONE — wall switch was off, all four back** |

**Repo hygiene — DONE.** Swept 199 untracked/ignored scratch files (12.08 MB) out of the repo root, left over from the April sessions (`gc*.out`, `verify*.err`, `openlist*.out`, `.grep.out` at 11 MB, the `.ha-*-copy.*` diff copies, etc.). Backed up first per the graded infra rule to `PPM\archive\ha-repo-root-scratch-2026-09-16.zip` (3.18 MB), then deleted. Also `git rm`'d the one *tracked* scratch file, `commitmsg.txt`.
Root now holds only real files: `.env.example`, `.gitattributes`, `.gitignore`, `ARCHITECTURE.md`, `CLAUDE.md`, `index.html`, `INFRA-CHANGELOG.md`, `package.json`, `package-lock.json`, `SESSION_HANDOFF.md`, `tsconfig.json`, `tsconfig.node.json`, `vercel.json`, `vite.config.ts`.
Checked `mcmahon-command-center`, `hacktheplanet` and `max-mod` for the same pollution — **all three clean**, zero root scratch files. This was isolated to the HA repo.

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
