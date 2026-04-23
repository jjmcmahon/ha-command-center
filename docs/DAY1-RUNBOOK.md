# Home Assistant — Day 1 Installation Runbook

## Pre-flight Checklist
- [x] HA OS 17.1 image downloaded (`F:\temp\haos_generic-x86-64-17.1.img.xz`)
- [x] Rufus portable downloaded (`F:\temp\rufus.exe`)
- [x] USB flash drive (**16 GB minimum, 32 GB recommended** — HA OS + Core + Docker needs ~10GB+)
- [ ] HDMI cable + monitor for Beelink
- [ ] USB keyboard for Beelink
- [ ] Ethernet cable (recommended for first boot)

## Phase 1 — Flash HA OS
1. Open `F:\temp\rufus.exe` (portable, no install)
2. **Device**: Select your USB flash drive
3. **Boot selection**: Click SELECT → browse to `F:\temp\haos_generic-x86-64-17.1.img.xz`
4. Leave defaults → click **START**
5. Wait for green **READY** bar
6. Safely eject USB from Windows

## Phase 2 — BIOS Configuration
1. Plug USB into any Beelink USB port
2. Connect HDMI + keyboard
3. Plug in power, hit power button
4. **Immediately tap DEL repeatedly** to enter BIOS (Aptio Setup - AMI)
5. Navigate to **Boot** tab:
   - Confirm **UEFI boot mode** (not Legacy/CSM)
   - Set **Fast Boot** → Disabled
   - **Boot Order**: USB drive first
6. Navigate to **Security** tab:
   - Set **Secure Boot** → Disabled
7. Press **F4** to Save & Exit

## Phase 3 — First Boot
1. Beelink reboots from USB automatically
2. You'll see the **Home Assistant** CLI banner within 1-2 minutes
3. HA Core downloads and installs — **takes 5-20 minutes**
4. **Do NOT touch anything** — let it finish
5. You'll see `homeassistant login:` prompt when ready

## Phase 4 — Onboarding
1. On any device on the same network, open a browser
2. Navigate to: **http://homeassistant.local:8123**
   - If that doesn't resolve, find the IP from your router's DHCP list
3. Create your admin account (name, username, password)
4. Set your home location (used for sun automations, weather)
5. Set up 2FA (recommended: authenticator app)
6. HA will auto-discover devices on your network

## Phase 5 — First Device Pairing
- WiFi devices should auto-discover (check Integrations page)
- HomeKit Controller: HA discovers Apple HomeKit devices
- Alexa Media Player: Add via Integrations → search "Alexa"
- **Do NOT plug in Zigbee/Z-Wave dongles yet** — save for Phase 2

## Phase 6 — Post Day-1
- [ ] Assign static IP via router DHCP reservation
- [ ] Install HACS (see HACS-INSTALL-LIST.md)
- [ ] Install Mushroom Cards + Bubble Card
- [ ] Begin device inventory walkthrough

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No HA banner after 2 min | Check BIOS boot order, ensure USB is first |
| Can't reach homeassistant.local:8123 | Try IP address directly, check same network/VLAN |
| HA Core download stuck | Be patient (up to 20 min), check Ethernet is connected |
| BIOS won't enter with DEL | Try F2, F12, or ESC — varies by Beelink firmware |
| USB not detected in BIOS | Try different USB port, re-flash with Rufus |
