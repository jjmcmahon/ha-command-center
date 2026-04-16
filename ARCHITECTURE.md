# Home Assistant — Architecture

> Last updated: 2026-04-16

## Overview

Home Assistant (HAOS) runs on a Beelink mini PC and orchestrates all smart home automations for the mcmahon household. It manages zigbee/zwave device control, automations, dashboards, and integrations with third-party services. Primarily local-network only, with selective external access via HACS integrations and secure tunnels for remote access.

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **OS** | Home Assistant OS (HAOS) | Beelink mini PC base image |
| **Core** | Home Assistant Core | YAML automation engine |
| **Package Manager** | HACS | Community add-ons and integrations |
| **Integrations** | _TBD (list major ones) | Zigbee, Z-Wave, MQTT, etc. |
| **Frontend** | Home Assistant UI | Web + mobile app |
| **Data Store** | SQLite (local) | Home Assistant database |
| **Automation Sync** | Firestore bridge | Custom integration (if enabled) |

## Infrastructure Map

### Hosting / Compute

| Resource | Provider | Identifier | Config Source |
|----------|----------|-----------|---------|
| Home Assistant OS | Beelink Mini PC | Network: _TBD (local IP) | /etc/haos-release |
| Hardware | Beelink | Model: _TBD (fill in next session) | Physical specs label |
| Network Interface | Ethernet (primary) | Local LAN 192.168.x.x | Router DHCP or static config |
| Storage | Internal SSD | _TBD capacity | df command output |

### Data Stores

| Store | Provider | Identifier | Backup? |
|-------|----------|-----------|---------|
| Home Assistant Config | Beelink Local Storage | /config | Manual backup to USB or cloud |
| Automations | automations.yaml | Local file | Backed up with config |
| SQLite Database | Local | /config/home-assistant_v2.db | Daily snapshots (if configured) |

### DNS & Domains

| Domain | Provider | Points To | SSL |
|--------|----------|-----------|-----|
| _TBD local.home.arpa or similar | Local DNS | Beelink internal IP | Self-signed (local only) |
| _TBD remote access | _TBD tunnel service | HACS secure tunnel or Nabu Casa | _TBD |

### Secrets & Environment Variables

> DO NOT put actual secret values here.

| Secret | Used By | Stored In | Rotation |
|--------|---------|-----------|----------|
| HACS Integration Tokens | HACS add-ons | secrets.yaml | Manual on renewal |
| Zigbee/Z-Wave Keys | Device pairing | /config/zigbee.db | One-time per device |
| Firestore Service Account | Firestore bridge integration | secrets.yaml | _TBD |
| API Tokens (external services) | Integrations | secrets.yaml | Per-service schedule |

## Deployment Flow

1. **Config Changes**: Edit automations.yaml or integration configs locally
2. **Save**: Home Assistant reloads automations automatically or via UI
3. **Backup**: Manual snapshot or scheduled backup to USB/cloud
4. **HACS Updates**: Check for add-on updates in HACS menu
5. **Restart (if needed)**: Full restart via UI or SSH
6. **Verify**: Check automations are executing; review logs in UI

## Dependencies on Other Projects

| Dependency | Type | Details |
|------------|------|---------|
| Command Center | Data producer | Sends automation state updates to Firestore |
| HackThePlant | Network data | May pull network status for automations |
| MaxMod | Data consumer (optional) | Could trigger automation based on Minecraft status |

## Recovery Playbook

### Full Redeploy from Scratch

1. Obtain Beelink mini PC and set up HAOS via bootable USB
2. Connect to local network (Ethernet preferred)
3. Access Home Assistant UI at http://<beelink-ip>:8123
4. Complete onboarding wizard
5. Restore config backup (if available) via Settings > System > Backups
6. Or manually recreate automations.yaml from git history
7. Install HACS via integration add-on
8. Install required custom integrations via HACS
9. Configure secrets.yaml with necessary tokens
10. Verify automations loading and triggers working

### Partial Recovery

| Component | Recovery Steps |
|-----------|-----------------|
| Corrupted automations.yaml | Restore from backup snapshot; check git history for last known-good version |
| HACS add-on crashed | Restart add-on from Home Assistant UI; check logs for errors |
| Device disconnected | Re-pair device in Zigbee/Z-Wave integration; verify network connectivity |
| Database corrupted | Home Assistant automatically tries recovery; manual reset via Settings > Developer Tools |
| Lost SSH access | Factory reset and restore from backup (via USB method) |
