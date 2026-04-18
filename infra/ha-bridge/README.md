# HA Bridge

Node.js container that subscribes to Home Assistant's WebSocket API and mirrors
entity state into Firestore under `homeassistant/states/entities/{entity_id}`.
This is the read path for `cmd.mcmahonmc.com/homeassistant` — the dashboard
can't direct-connect to HA because Chrome's Private Network Access blocks
cross-origin requests from a public Vercel origin to Tailscale's CGNAT range.

## What it does

- Connects to HA via WebSocket using a long-lived access token
- Subscribes to all entity state updates
- Dedupes repeat states (hash of state+attributes) to stay under Firestore quota
- Batch-flushes to Firestore every 5s
- Writes a heartbeat doc every 5min at `homeassistant/meta/bridge/status`

## What it does NOT do

- Service calls (toggle, set brightness, set HVAC mode, etc.) — that's a
  separate Cloud Function `haCommand` in `mcmahon-command-center/functions/`

## Firestore layout

```
homeassistant/
  states/entities/{entity_id}  (single-household; rules restrict to authed users)
    entity_id: string
    state: string
    attributes: map
    last_changed: timestamp
    last_updated: timestamp
    synced_at: timestamp      (server-side)
  meta/bridge/status
    last_heartbeat: timestamp
    connected: bool
    ha_url: string
    entities_tracked: number
    last_error: string        (on failure)
```

## Deployment (Beelink via Portainer)

1. Copy `ha-bridge.mjs` (from `mcmahon-command-center/bridge/`) into the
   Kali container's `/data/bridges/` so it joins the other bridges.
2. Install the dependency inside the Kali container:
   ```
   docker exec -it kali bash
   cd /data/bridges && npm install home-assistant-js-websocket
   ```
3. Generate an LLAT in HA (Profile → Security → Long-lived access tokens) if
   you haven't. Save it to `F:\jjdev\keys\ha-llat.txt` locally for backup.
4. In Portainer → Stacks → Add stack → name `ha-bridge`, paste this
   `docker-compose.yml`, set env var `HA_TOKEN` to the LLAT value. Deploy.
5. Verify:
   ```
   docker logs -f ha-bridge
   ```
   Expect: `[ha] connected; subscribing to entities` then periodic
   `[ha] flushed N entity state(s)` lines.

## Rollback

Portainer → Stacks → ha-bridge → Stop + Delete. No persistent state to clean
up beyond the Firestore docs (which dashboard would then show as stale).
