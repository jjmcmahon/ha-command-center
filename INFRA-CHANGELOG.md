# Home Assistant — Infrastructure Changelog

Every infrastructure change must be logged here **before the change is applied**. This is the breadcrumb trail for recovery.

> **AI agents:** You MUST add an entry here and get JJ's explicit approval before creating, modifying, or deleting any infrastructure resource. See the project's CLAUDE.md for the full pre-approval rule.

## Format

### YYYY-MM-DD — Short description

**Actor:** who made the change
**Type:** create | modify | delete | migrate
**Resources affected:**
- resource type: identifier — what changed

**Why:** motivation
**Rollback:** how to undo this change
**Verified:** yes/no

## Changelog

### 2026-04-17 — HA Firestore bridge (read path for /homeassistant dashboard)

**Actor:** JJ (Portainer deploy) — code + compose by Claude per approved plan
**Type:** create
**Status:** CODE READY — pending JJ deploy on Beelink

**Resources affected:**
- New Portainer stack `ha-bridge` on the Beelink (node:20-bookworm-slim)
- Kali container `/data/bridges/ha-bridge.mjs` (new file, copy from repo)
- Kali container `/data/bridges/node_modules/home-assistant-js-websocket` (new dep)
- Firestore collection `homeassistant/states/entities/{entity_id}` (new)
- Firestore doc `homeassistant/meta/bridge/status` (new)
- Firestore rules (pending — need read rule for authed users on `homeassistant/**`)

**Why:** `cmd.mcmahonmc.com/homeassistant` cannot direct-connect to HA via
Tailscale Serve. Chrome's Private Network Access silently blocks cross-origin
fetches from public Vercel origin to Tailscale CGNAT (100.64.0.0/10). Curl
and direct browser nav work fine; only cross-origin `fetch`/`WebSocket`
hang. Root-caused and documented 2026-04-17 after extensive testing.

JJ chose a Firestore bridge (matches what `mcmahon-command-center/ARCHITECTURE.md`
has always documented) over the alternatives: Tailscale Funnel (HA on public
internet), or a Next.js tsnet server-side proxy (bigger code lift). Bridge
is cheap to build, keeps HA off the public internet, and gives free history
as a side-effect.

**Files added:**
- `mcmahon-command-center/bridge/ha-bridge.mjs` — the bridge script
- `mcmahon-command-center/bridge/package.json` — adds `home-assistant-js-websocket` dep
- `home-assistant/infra/ha-bridge/docker-compose.yml` — Portainer stack compose
- `home-assistant/infra/ha-bridge/README.md` — deployment runbook

**Steps (JJ runs on the Beelink, each is reversible):**

1. Get `ha-bridge.mjs` onto the Kali container's `/data/bridges/` volume.
   From the Beelink:
   ```
   docker cp "$(winpath)/Command Center/mcmahon-command-center/bridge/ha-bridge.mjs" kali:/data/bridges/
   # Or rsync/scp if that's how the other bridges get there.
   ```
2. Install the new dep inside Kali:
   ```
   docker exec -it kali bash -c 'cd /data/bridges && npm install home-assistant-js-websocket'
   ```
3. Portainer → Stacks → Add stack, name `ha-bridge`, paste
   `infra/ha-bridge/docker-compose.yml`, set `HA_TOKEN` env var to the
   contents of `F:\jjdev\keys\ha-llat.txt`. Deploy.
4. Verify in Portainer logs:
   ```
   [ha] connecting to http://192.168.120.3:8123
   [ha] connected; subscribing to entities
   [ha] flushed N entity state(s); pending=...
   ```
5. In Firebase console, confirm `homeassistant/states/entities/*` docs are
   appearing and updating. Expect ~50-200 entity docs for a typical HA setup.

**Rollback:**
1. Portainer → Stacks → ha-bridge → Stop + Delete.
2. Optional cleanup of `/data/bridges/ha-bridge.mjs` inside Kali (harmless to leave).
3. Firestore docs under `homeassistant/` will go stale but cost nothing;
   delete via Firebase console if desired.

**Follow-ups (not part of this entry):**
- Firestore security rules update to allow authed users to read `homeassistant/**`
- New dashboard hook `useHomeAssistantFirestore` in `mcmahon-command-center/src/hooks/`
- Swap `/homeassistant` page to use the new hook (phase 1b)
- Cloud Function `haCommand` for service-call write path (phase 2)

**Verified:** no — pending deploy.

---

### 2026-04-17 — Expose HAOS via Tailscale Serve + CORS allow cmd.mcmahonmc.com

**Actor:** JJ + Claude (via Chrome MCP + core-ssh terminal)
**Type:** create + modify
**Status:** EXECUTED 2026-04-17 — Tailscale Serve live; cross-origin fetch from Vercel blocked by Chrome PNA (see separate Firestore bridge entry above)

**Resources affected:**
- Tailnet `tail675bb.ts.net`: MagicDNS + HTTPS Certificates enabled (admin console)
- HAOS Tailscale add-on (`a0d7b954_tailscale`): `share_homeassistant: serve` on port 443, `userspace_networking: false` (kernel mode; userspace mode caused TLS renegotiation that Chrome rejects)
- HAOS node `homeassistant.tail675bb.ts.net` (100.76.246.76) now reachable over Tailscale with valid Let's Encrypt cert
- HAOS `configuration.yaml` appended with `http.use_x_forwarded_for: true`, `trusted_proxies: [127.0.0.1, ::1, 172.30.32.0/23]`, `cors_allowed_origins: [https://cmd.mcmahonmc.com]` (backup: `configuration.yaml.bak-2026-04-17`)
- HA user account `JJ McMahon`: new LLAT `command-center-dashboard` (saved to `F:\jjdev\keys\ha-llat.txt`)

**Why:** The `/homeassistant` page at `https://cmd.mcmahonmc.com` cannot open a WebSocket to `http://192.168.1.190:8123` — browsers block mixed-content. Tailscale Serve gives HAOS a real Let's Encrypt cert on `*.ts.net` without opening any ports to the public internet. Only Tailscale-authed devices can reach the hostname, which matches JJ's access pattern (all his devices are on the tailnet).

**Why not Cloudflare Tunnel / Nabu Casa / reverse proxy:** JJ uses Namecheap (no Cloudflare), Nabu Casa costs $6.50/mo, a reverse proxy needs a public DNS record + cert management. Tailscale is already running, zero additional cost, zero public exposure.

**Pre-req check:** confirm Tailscale is running on HAOS (`ha addons info a0d7b954_tailscale` or check HA UI → Settings → Add-ons). If not installed, install the community add-on first.

**Steps (JJ runs on Beelink / HAOS):**

1. On the HAOS host (SSH via HA Terminal add-on or console):
   ```bash
   tailscale serve --bg --https=443 http://localhost:8123
   tailscale serve status    # confirm the URL is live
   ```
   Note the hostname it prints (e.g. `hass-beelink.tail1a2b3.ts.net`).

2. Edit `/config/configuration.yaml` (via HA File Editor or SSH):
   ```yaml
   http:
     use_x_forwarded_for: true
     trusted_proxies:
       - 100.64.0.0/10    # Tailscale CGNAT range
       - 127.0.0.1
     cors_allowed_origins:
       - https://cmd.mcmahonmc.com
   ```

3. HA Developer Tools → YAML → "Check Configuration" → if green, restart HA.

4. HA Profile (top-left avatar) → Security → Long-lived access tokens → Create Token ("command-center-dashboard"). Save the token to `F:\jjdev\keys\ha-llat.txt` (don't commit).

5. On `https://cmd.mcmahonmc.com/homeassistant` → Settings tab:
   - HA URL: `https://hass-beelink.<tailnet>.ts.net` (from step 1)
   - Token: paste from step 4
   - Leave the tab — status dot should go `connecting` → `connected` with entity count populating.

**Verified:**
- `curl https://homeassistant.tail675bb.ts.net/` returns 200 with valid TLS.
- Direct Chrome navigation to that URL shows HA login page.
- **Cross-origin fetch from https://cmd.mcmahonmc.com FAILS** — Chrome Private Network Access silently blocks public→CGNAT cross-origin. This is the trigger for the Firestore bridge architecture decision logged above.

**Value preserved:** Tailscale Serve is kept running regardless — JJ's phone/iPad can reach HA at `https://homeassistant.tail675bb.ts.net` directly from anywhere on the tailnet. Only the cmd.mcmahonmc.com surface needs the Firestore bridge.

**Rollback (if ever needed):**
1. Tailscale add-on Configuration → "Share Home Assistant with Serve or Funnel" → `disabled`; Save + Restart.
2. Revert `configuration.yaml` from `.bak-2026-04-17`; restart HA.
3. Revoke the LLAT in HA Profile → Security.
4. Disable HTTPS + MagicDNS in Tailscale admin console (only if the tailnet truly doesn't need them — they're useful for other nodes too).

