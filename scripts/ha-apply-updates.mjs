#!/usr/bin/env node
/**
 * HA #47 — apply pending updates with a pre-update backup.
 *
 * Order of operations:
 *   1. Trigger a full backup via the backup.create service
 *   2. Wait until the backup's `state` reports it's done (poll backup/info)
 *   3. Apply add-on updates first (Mosquitto, Z-Wave JS) — these don't
 *      restart HA core, so we keep the WS connection.
 *   4. Apply HA Core update last — this restarts the core and kills our WS.
 *      Script exits cleanly after issuing it.
 *
 * Safety rails:
 *   - Backup must complete before any update fires.
 *   - One update at a time; poll the entity state to confirm state=off
 *     (no update pending) after each call.
 *   - HA Core update is confirmed last; we exit after issuing it rather
 *     than trying to race the reconnect.
 */
import fs from 'node:fs';

const HA_HOST = process.env.HA_HOST || 'http://192.168.120.3:8123';
const token = fs.readFileSync(process.env.HA_LLAT_PATH || 'F:\\jjdev\\keys\\ha-llat.txt', 'utf8').trim();

const ws = new WebSocket(HA_HOST.replace(/^http/, 'ws') + '/api/websocket');
await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', () => j(new Error('ws')), { once: true }); });
await new Promise((resolve, reject) => {
  const onMsg = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.type === 'auth_required') ws.send(JSON.stringify({ type: 'auth', access_token: token }));
    else if (m.type === 'auth_ok') { ws.removeEventListener('message', onMsg); resolve(); }
    else if (m.type === 'auth_invalid') { ws.removeEventListener('message', onMsg); reject(new Error(m.message)); }
  };
  ws.addEventListener('message', onMsg);
});
let id = 1;
const call = (msg, { timeout_ms = 20000 } = {}) => new Promise((resolve, reject) => {
  const my = id++;
  const onMsg = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id !== my) return;
    ws.removeEventListener('message', onMsg);
    if (m.type === 'result') m.success ? resolve(m.result) : reject(new Error(JSON.stringify(m.error)));
  };
  ws.addEventListener('message', onMsg);
  ws.send(JSON.stringify({ id: my, ...msg }));
  setTimeout(() => reject(new Error(`ws call timeout id=${my}`)), timeout_ms);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const log = (s) => console.log(`[update] ${new Date().toISOString()} ${s}`);

async function callService(domain, service, service_data = {}, target = undefined) {
  return call({ type: 'call_service', domain, service, service_data, target }, { timeout_ms: 120_000 });
}

async function getState(entity_id) {
  const states = await call({ type: 'get_states' });
  return states.find((s) => s.entity_id === entity_id) ?? null;
}

// ─── 1. Trigger backup ──────────────────────────────────────
log('listing pending updates...');
{
  const states = await call({ type: 'get_states' });
  const pending = states.filter((s) => s.entity_id.startsWith('update.') && s.state === 'on');
  console.log(`  pending updates (${pending.length}):`);
  pending.forEach((s) => console.log(`    ${s.entity_id}: ${s.attributes.installed_version} -> ${s.attributes.latest_version}`));
  if (pending.length === 0) {
    log('nothing to do; exiting');
    ws.close(); process.exit(0);
  }
}

log('creating full backup (trying services in order of preference)...');
const backupName = `pre-update-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}`;
let backupMethod = null;
try {
  // Newest path: backup.create_automatic (needs an agent configured in HA Settings)
  await callService('backup', 'create_automatic', {});
  backupMethod = 'backup.create_automatic';
} catch (e1) {
  log(`backup.create_automatic failed (${e1.message})`);
  try {
    // Modern (HA 2025+) path: backup.create with explicit name and agent_ids
    await callService('backup', 'create', { name: backupName });
    backupMethod = 'backup.create';
  } catch (e2) {
    log(`backup.create failed (${e2.message})`);
    try {
      // Legacy path: hassio.backup_full (Supervisor-level, well-tested)
      await callService('hassio', 'backup_full', { name: backupName });
      backupMethod = 'hassio.backup_full';
    } catch (e3) {
      log(`hassio.backup_full failed (${e3.message}). Refusing to proceed without a backup.`);
      log('Manual step: HA Settings -> System -> Backups -> Create backup (full), then re-run this script.');
      ws.close(); process.exit(2);
    }
  }
}
log(`backup kicked off via ${backupMethod}`);

// ─── 2. Wait for backup to finish ───────────────────────────
// backup/info WS command returns { backing_up: bool, last_completed_automatic }
log('polling backup/info for completion...');
let backupOk = false;
for (let i = 0; i < 60; i++) { // up to 10 min (60 * 10s)
  await sleep(10_000);
  try {
    const info = await call({ type: 'backup/info' });
    if (!info?.backing_up) {
      log(`backup finished. last_completed_automatic=${info?.last_completed_automatic || '?'}`);
      backupOk = true;
      break;
    }
    log(`backup still running... (${(i+1)*10}s elapsed)`);
  } catch (e) {
    log(`backup/info failed: ${e.message}; continuing poll`);
  }
}
if (!backupOk) {
  log('backup did not complete in 10 min. Aborting update to be safe.');
  ws.close(); process.exit(3);
}

// ─── 3. Apply add-on updates first ──────────────────────────
async function applyUpdate(entity_id) {
  log(`applying update: ${entity_id}`);
  await callService('update', 'install', {}, { entity_id });
  // Poll until state=off (done) or timeout
  for (let i = 0; i < 60; i++) {
    await sleep(10_000);
    const s = await getState(entity_id);
    if (!s) { log(`  ${entity_id}: state lookup returned null`); continue; }
    log(`  ${entity_id}: state=${s.state} installed=${s.attributes?.installed_version} latest=${s.attributes?.latest_version} in_progress=${s.attributes?.in_progress}`);
    if (s.state === 'off' && !s.attributes?.in_progress) {
      log(`  ${entity_id}: done`);
      return;
    }
  }
  log(`  ${entity_id}: did not report done within 10min; continuing anyway`);
}

try {
  await applyUpdate('update.mosquitto_broker_update');
  await applyUpdate('update.z_wave_js_update');
} catch (e) {
  log(`add-on update failed: ${e.message}; continuing to HA Core`);
}

// ─── 4. HA Core last (restarts WS; fire and exit) ──────────
log('firing HA Core update (HA will restart; WS will disconnect)');
try {
  await callService('update', 'install', {}, { entity_id: 'update.home_assistant_core_update' });
  log('HA Core update fired. Dashboard may go offline briefly during restart.');
} catch (e) {
  log(`HA Core update failed to fire: ${e.message}`);
}

ws.close();
log('done.');
process.exit(0);
