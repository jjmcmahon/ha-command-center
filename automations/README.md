# Home Assistant Automations

Automation YAML files for the McMahon smart home. These are stored in the repo for version control and deployed to HA manually.

## Deploying to HA

1. SSH into the Beelink (`ssh root@192.168.120.3`) or use the File Editor add-on
2. Copy the YAML content into HA's `automations.yaml` or use the UI automation editor
3. For helpers: add `input_boolean` entries from `helpers.yaml` to `configuration.yaml`
4. Reload automations: Settings → Automations → 3-dot menu → Reload automations

## Files

| File | Issue | What it does |
|------|-------|-------------|
| `helpers.yaml` | — | Input booleans for house modes (movie, gaming, goodnight, etc.) |
| `presence-aware-rooms.yaml` | HA-634 | Motion-triggered room lighting with time-of-day brightness |
| `weather-reactive-lighting.yaml` | HA-635 | Adjusts indoor light color/brightness based on weather |

## Prerequisites

- **Presence detection:** Requires `binary_sensor.*_occupancy` entities per room (Aqara FP2 mmWave sensors or basic motion sensors)
- **Weather:** Requires `weather.home` entity (already configured via default weather integration)
- **Lights:** Requires `light.*` entities grouped by area in HA (Hue/SmartThings already integrated)
- **Helpers:** Create the input_boolean helpers listed in `helpers.yaml`
