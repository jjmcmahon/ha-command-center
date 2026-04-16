# HA-AI Home Organizer — Setup Guide

## What This Does

A Home Assistant add-on that manages your household:
- **Chores** — recurring tasks with auto-scheduling, completion tracking, and family assignment
- **Inventory** — pantry/supply tracking with auto-generated shopping lists when items run low
- **Maintenance** — home maintenance schedules (HVAC, plumbing, etc.) with cost tracking
- **Family Tasks** — one-off to-do board with priority levels

All data publishes as HA sensors so you can build dashboards and automations natively.

## Sensors Published

| Sensor | Description |
|--------|-------------|
| `sensor.organizer_chores_total` | Total active chores |
| `sensor.organizer_chores_overdue` | Overdue chore count + list in attributes |
| `sensor.organizer_chores_due_soon` | Due within 3 days |
| `sensor.organizer_inventory_total` | Total tracked items |
| `sensor.organizer_inventory_low` | Low stock count + shopping list in attributes |
| `sensor.organizer_maintenance_overdue` | Overdue maintenance |
| `sensor.organizer_maintenance_upcoming` | Upcoming (14-day lookahead) |
| `sensor.organizer_tasks_todo` | To-do task count |
| `sensor.organizer_tasks_in_progress` | In-progress count |
| `sensor.organizer_tasks_urgent` | Urgent tasks + details in attributes |

## Installation

### Option 1: Local Add-on (Recommended for Development)

1. Copy `ha-ai-organizer/` to your HA `addons/` directory:
   ```
   scp -r ha-ai-organizer/ user@homeassistant:/addons/ha-ai-organizer/
   ```

2. In HA: **Settings → Add-ons → Add-on Store → ⋮ → Repositories** isn't needed for local add-ons.

3. Go to **Settings → Add-ons → Add-on Store** → refresh → find "HA-AI Home Organizer" under "Local add-ons"

4. Click **Install**, then configure options, then **Start**

### Option 2: GitHub Repository Add-on

1. In HA: **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
2. Add: `https://github.com/jjmcmahon/ha-command-center`
3. Refresh, find "HA-AI Home Organizer", install

## Configuration

After installation, configure in the add-on settings:

```yaml
household_name: "McMahon"
family_members:
  - name: "JJ"
    role: "admin"
  - name: "Son 1"
    role: "kid"
  - name: "Son 2"
    role: "kid"
notification_entity: "notify.mobile_app_jj_phone"  # your notify entity
chore_reminder_time: "08:00"
maintenance_lookahead_days: 14
sensor_update_interval_minutes: 5
```

## Dashboard Setup

Copy `examples/lovelace-dashboard.yaml` into a new HA dashboard view, or use the HA UI editor to build cards using the `sensor.organizer_*` entities.

## Automations

See `examples/automations.yaml` for ready-to-use automations:
- Chores overdue threshold alert
- Low stock shopping notification
- Maintenance overdue alert
- Urgent task instant notification
- Weekly maintenance preview (Sunday evenings)

## REST Commands

Add `examples/rest_commands.yaml` to your `configuration.yaml` to call the organizer API from automations and scripts. This lets you do things like:
- Complete a chore via an NFC tag tap
- Add a task via voice assistant
- Decrement inventory when a motion sensor triggers

## REST API

The add-on exposes a full REST API on port 3100 (internal to HA):

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/chores` | GET, POST | List/create chores |
| `/api/chores/:id` | GET, PUT, DELETE | Get/update/archive a chore |
| `/api/chores/:id/complete` | POST | Mark done + advance next_due |
| `/api/chores/:id/history` | GET | Completion log |
| `/api/inventory` | GET, POST | List/create items |
| `/api/inventory/shopping-list` | GET | Auto-generated shopping list |
| `/api/inventory/:id/use` | POST | Decrement quantity |
| `/api/inventory/:id/restock` | POST | Set new quantity |
| `/api/maintenance` | GET, POST | List/create items |
| `/api/maintenance/:id/complete` | POST | Mark done + advance |
| `/api/tasks` | GET, POST | List/create tasks |
| `/api/tasks/:id/done` | POST | Mark complete |
| `/api/dashboard/summary` | GET | Full household overview |
| `/api/dashboard/stats` | GET | Compact stats + household score |

## Seed Data

On first boot the add-on populates starter data: 12 common chores, 11 maintenance items, and 11 household supply items. Edit or delete these through the API.
