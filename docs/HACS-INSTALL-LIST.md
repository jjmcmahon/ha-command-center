# HACS Install Checklist

## Install Order

### Step 1 — Foundation Add-ons (Day 1)
- [ ] Terminal & SSH (official add-on)
- [ ] **HACS** (via Terminal: `wget -O - https://get.hacs.xyz | bash -`)
- [ ] File Editor (official add-on)
- [ ] Samba Share (official add-on)

### Step 2 — Frontend Cards (via HACS)
- [ ] Mushroom Cards — modern card collection
- [ ] Bubble Card — bottom navigation + pop-up cards
- [ ] card-mod — CSS styling for any card
- [ ] layout-card — custom dashboard layouts
- [ ] mini-graph-card — sparkline graphs for sensors
- [ ] slider-entity-row — slider controls for lights/covers
- [ ] auto-entities — dynamic card population
- [ ] button-card — fully customizable buttons
- [ ] Frigate Card — camera + event viewer (install with Frigate)
- [ ] Swipe Card — swipeable card container

### Step 3 — Integrations (via HACS)
- [ ] Adaptive Lighting — circadian rhythm lighting
- [ ] Browser Mod — browser-as-entity, pop-ups
- [ ] Alexa Media Player — control Alexa devices
- [ ] HASS.Agent — Windows PC as HA entity

### Step 4 — Themes (via HACS)
- [ ] Mushroom Themes — pairs with Mushroom Cards
- [ ] Catppuccin — mocha/latte color schemes

### Step 5 — Protocol Add-ons (Phase 2, with hardware)
- [ ] Mosquitto MQTT broker
- [ ] Zigbee2MQTT (pairs with SLZB-06)
- [ ] Frigate NVR (pairs with Coral TPU)
- [ ] Whisper (local speech-to-text)
- [ ] Piper (local text-to-speech)
- [ ] ESPHome (voice satellite firmware)
