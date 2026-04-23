# Home Assistant — Device Inventory

> Last updated: 2026-04-07 (Session 6)

## Server Hardware
| Item | Detail |
|------|--------|
| Device | Beelink MINI S12 |
| CPU | Intel N95 |
| RAM | 12GB LPDDR5 |
| Storage | 512GB SSD (SN20421) |
| IP | 192.168.1.190 (static DHCP) |
| OS | HAOS 17.2 / Core 2026.4.1 |
| URL | http://homeassistant.local:8123 |

## Services Running on Beelink
| Service | Access | Notes |
|---------|--------|-------|
| Home Assistant | http://192.168.1.190:8123 | HAOS 17.2 |
| Portainer | HA Add-on (Web UI) | alexbelgium repo, protection mode off |
| Uptime Kuma | http://192.168.1.190:3001 | Docker via Portainer, SQLite |

## Add-ons Installed
- Terminal & SSH
- Get HACS
- Portainer (alexbelgium)

## Integrations Configured
| Integration | Devices | Status |
|-------------|---------|--------|
| HACS | — | GitHub authorized |
| Philips Hue | Hue Bridge + lights | ✅ Added |
| SmartThings | SmartThings hub + devices | ✅ Added |
| Apple TV — Living Room | Apple TV 4 | ✅ Paired |
| Apple TV — Master Bed | Apple TV 4 | ✅ Paired |
| Apple TV — Media Room | Apple TV 4 | ⏳ Needs pairing (remote not found) |
| HomePod Mini — Bathroom | HomePod Mini | ✅ Paired |
| Homey Pro (HomeKit Bridge) | James's Homey Pro | ✅ Added |
| HomeKitty 16C6 (Bridge) | HomeKit bridge device | ✅ Added |
| HP ENVY 5660 | Printer (IPP) | ✅ Added |
| Alexa Devices | Echo speakers | ⏳ Skipped (needs Amazon app-based 2FA) |

## Uptime Kuma Monitors
| Monitor | Type | Discord Alerts |
|---------|------|---------------|
| cmd.mcmahonmc.com | HTTP | ✅ ON |
| Home Assistant | HTTP | ✅ ON |
| Ollama | HTTP | ❌ OFF (auto-shuts down) |
| Gateway | HTTP | ❌ OFF (auto-shuts down) |

## Credentials
All stored in 1Password (Portainer admin, Uptime Kuma admin)
