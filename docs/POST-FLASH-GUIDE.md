# Home Assistant - Complete Post-Flash Guide
## If Claude runs out of credits, follow this step by step.

---

## STEP 1: BIOS Settings on Beelink S12
**Source: https://www.home-assistant.io/installation/generic-x86-64/**

Before booting the USB, enter BIOS (press DEL or F2 on startup):
1. **UEFI Boot Mode** — Must be ENABLED (not Legacy)
2. **Secure Boot** — Must be DISABLED
3. **Boot Order** — USB Device FIRST
4. Save & Exit

---

## STEP 2: First Boot
**Source: https://www.home-assistant.io/installation/generic-x86-64/**

1. Plug Ethernet cable into Beelink (internet REQUIRED for first boot)
2. Insert the freshly flashed USB
3. Power on
4. Wait ~1-2 minutes for the HA welcome banner on the console
5. If you get UEFI shell instead of HA booting, see TROUBLESHOOTING below

---

## STEP 3: Access the Web UI
**Source: https://www.home-assistant.io/installation/generic-x86-64/**

From your PC browser, go to:
- http://homeassistant.local:8123
- OR http://192.168.1.190:8123 (the static IP we set)

First boot downloads components — can take 10-20 minutes.
You'll see "Preparing Home Assistant" until it's ready.

---

## STEP 4: Onboarding
Complete the setup wizard:
1. Create your user account
2. Name your home, set location
3. Review auto-discovered devices
4. Done — you're on the dashboard

---