#!/usr/bin/with-contenv bashio

# HA-AI Home Organizer — Entrypoint
# Reads add-on options, sets env vars, starts the Node server

CONFIG_PATH=/data/options.json

export HOUSEHOLD_NAME="$(bashio::config 'household_name')"
export FAMILY_MEMBERS="$(bashio::config 'family_members')"
export NOTIFICATION_ENTITY="$(bashio::config 'notification_entity')"
export CHORE_REMINDER_TIME="$(bashio::config 'chore_reminder_time')"
export MAINTENANCE_LOOKAHEAD_DAYS="$(bashio::config 'maintenance_lookahead_days')"

# Supervisor token for HA API calls
export SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN}"

# Data directory (persisted across updates)
export DATA_DIR="/data"

bashio::log.info "Starting HA-AI Home Organizer..."
bashio::log.info "Household: ${HOUSEHOLD_NAME}"

cd /opt/organizer
exec node src/server.js
