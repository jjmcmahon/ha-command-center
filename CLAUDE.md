# Home Assistant – Smart Home Integration

Custom React dashboard + Home Assistant OS setup for the McMahon household. The Beelink S12 runs HAOS, Portainer (Docker), and Uptime Kuma. This repo is for the custom dashboard that will connect to HA via websocket.

## The 30-Second Version

Home Assistant is installed and running on a Beelink MINI S12 with a 512GB SSD. Core integrations are configured (Hue, SmartThings, Apple TV, HomePod, printer). Portainer and Uptime Kuma are deployed. The custom React dashboard (this repo) is scaffolded but NOT yet connected to HA. We're at the end of Phase 1 (Foundation) heading into Phase 2 (automations, dashboard build).

## Where We Are (Last Updated: 2026-04-12, based on Session 6)

### What's Done
- HAOS 17.2 / Core 2026.4.1 running on Beelink internal 512GB SSD
- Static IP: 192.168.1.190 | URL: http://homeassistant.local:8123
- Add-ons installed: Terminal & SSH, HACS, Portainer (alexbelgium repo)
- Uptime Kuma running via Portainer at http://192.168.1.190:3001
  - Monitors: cmd.mcmahonmc.com, HA, Ollama, gateway
  - Discord webhook alerts ON for always-on services
- Integrations: Philips Hue, SmartThings, Apple TV x2 (paired), HomePod Mini, Homey Pro, HomeKitty bridge, HP ENVY 5660
- HackThePlant Kali container also runs on this Beelink via Portainer

### What's Pending
- **Apple TV (Media Room)** – needs pairing, remote not found / need input switch
- **Alexa integration** – needs Amazon app-based 2FA first
- **Hardware arriving:** SLZB-06 Zigbee coordinator, Aeotec Z-Stick 7 (Z-Wave)
- **Phase 2:** Automations, scenes, device organization
- **Custom dashboard:** ha-command-center React app needs HA long-lived access token to connect

### GitHub Issues (18+ open)
`gh issue list --repo jjmcmahon/ha-command-center --state open` – prefix HA-
Topics: Voice assistant (Whisper/Piper/Wyoming), camera/NVR (Frigate, Coral TPU), climate, energy, lighting, dashboard, room management

### Shopping List (Phase 2+)
- SLZB-06 Zigbee Coordinator ($35-45)
- Aeotec Z-Stick 7 Z-Wave ($55)
- Google Coral USB TPU for Frigate ($35-60)
- Aqara FP2 mmWave presence sensor ($62-83 each, Phase 3)
- ESP32-S3-BOX-3 voice satellite ($45-55, Phase 4)

## Stack
- **Dashboard repo:** React + Vite + TypeScript + Tailwind + home-assistant-js-websocket
- **HA Server:** HAOS 17.2 on Beelink MINI S12 (Intel N95, 12GB RAM, 512GB SSD)
- **Docker:** Portainer add-on manages containers (Uptime Kuma, Kali/HackThePlant)

## Deeper Context
- **PIF:** `F:\obsidian\AgentVault\AgentVault\Home Assistant\PROJECT.pif.yaml`
- **Latest handoff:** `F:\obsidian\AgentVault\AgentVault\Home Assistant\SESSION-6-HANDOFF.md`
- **Device inventory:** `F:\obsidian\AgentVault\AgentVault\Home Assistant\DEVICE-INVENTORY.md`
- **Day 1 runbook:** `F:\obsidian\AgentVault\AgentVault\Home Assistant\DAY1-RUNBOOK.md`
- **Cost ledger:** `F:\jjdev\projects\PPM - Personal Project Manager\costs\COST-LEDGER.md`

## End-of-Session Checklist
**Always:**
1. Write/update handoff → AgentVault `SESSION_HANDOFF.md` (this is the canonical location)
2. If tasks changed: update GitHub Issues (close completed, create new)

**If applicable:**
3. If code changed: push to main (triggers Firestore sync for dashboard)
4. If costs changed: note in handoff
5. If another project is affected: note in handoff

## GitHub Issues Protocol
**Repo:** `jjmcmahon/ha-command-center` | **Prefix:** `HA-`
```bash
gh issue list --repo jjmcmahon/ha-command-center --state open
```

## Monthly Cost: ~$3.00
