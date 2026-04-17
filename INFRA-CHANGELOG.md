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

### 2026-04-17 — Expose HAOS via Tailscale Serve + CORS allow cmd.mcmahonmc.com

**Actor:** JJ (manual execution on Beelink) — drafted by Claude per approved plan
**Type:** create + modify
**Status:** APPROVED — pending JJ execution on Beelink

**Resources affected:**
- Tailscale Serve (HAOS add-on or host): publish `http://localhost:8123` as `https://hass-beelink.<tailnet>.ts.net`
- HAOS `configuration.yaml`: add `http.cors_allowed_origins` + `http.use_x_forwarded_for` + `http.trusted_proxies`
- HA user account: generate one long-lived access token (HA Profile → Security)

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

**Verify:**
- Dashboard status dot is green ("connected") with non-zero entity count.
- `curl -I https://hass-beelink.<tailnet>.ts.net` from any Tailscale-connected device returns 200 with a valid cert.
- HA Logs (Settings → System → Logs) show no CORS or auth failures.

**Rollback:**
1. Remove Tailscale Serve publish: `tailscale serve --https=443 off`
2. Revert `configuration.yaml` — remove the added `http:` keys, restart HA.
3. Revoke the LLAT in HA Profile → Security.
4. `/homeassistant` page reverts to the "Not configured" state with no token in localStorage — benign.

**Verified:** no — pending execution.

