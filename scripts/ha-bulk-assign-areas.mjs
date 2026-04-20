#!/usr/bin/env node
/**
 * HA #51 — Bulk-assign area_id to unassigned devices.
 *
 * Strategy: work at the DEVICE level, not the entity level. HA propagates
 * a device's area to all its entities automatically, so 1 device update =
 * many entities fixed. We use multiple name signals per device:
 *   - device.name (what HA calls it)
 *   - device.name_by_user (user-override, strongest signal)
 *   - device.model / manufacturer
 *   - friendly_name of any entity already linked to the device
 *
 * For each unassigned device we score it against every known area and
 * pick the best match. Confidence gate (score >= 2) separates
 * "auto-apply" from "ask the human". We report both sets at the end.
 *
 * Read-only if --dry-run is passed; otherwise mutates via
 * config/device_registry/update.
 */
import fs from 'node:fs';

const DRY = process.argv.includes('--dry-run');
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
const call = (msg) => new Promise((resolve, reject) => {
  const my = id++;
  const onMsg = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id !== my) return;
    ws.removeEventListener('message', onMsg);
    if (m.type === 'result') m.success ? resolve(m.result) : reject(new Error(JSON.stringify(m.error)));
  };
  ws.addEventListener('message', onMsg);
  ws.send(JSON.stringify({ id: my, ...msg }));
});

const [areas, devices, entityReg, states] = await Promise.all([
  call({ type: 'config/area_registry/list' }),
  call({ type: 'config/device_registry/list' }),
  call({ type: 'config/entity_registry/list' }),
  call({ type: 'get_states' }),
]);

// ─── Build area-name signals ────────────────────────────────
// Each area has several possible ways to match in text:
//   - area_id slug ("living_room" — matches "living_room")
//   - area name ("Living Room" — matches "living room")
//   - aliases we define for common rewordings
const AREA_ALIASES = {
  'office': ['office', 'study', 'desk'],
  'living_room': ['living room', 'livingroom'],
  'upstairs_living_room': ['upstairs living', 'upstairs lr', 'upstairs_living'],
  'downstairs_living_room': ['downstairs living', 'downstairs lr', 'downstairs_living', 'basement living'],
  'bedroom': ['bedroom', 'master bedroom'],
  'master_bed': ['master bed', 'master_bed', 'master bedroom'],
  'kitchen': ['kitchen'],
  'bathroom': ['bathroom', 'bath'],
  'garage': ['garage'],
  'entryway': ['entryway', 'entry', 'foyer', 'front porch', 'front_door', 'front door'],
  'ping_pong_room': ['ping pong', 'ping_pong', 'pingpong', 'game room'],
  'back_yard': ['backyard', 'back yard', 'back_yard', 'outside', 'outdoor', 'yard'],
  'whitney_s_office': ["whitney's office", "whitneys office", 'whitney_office'],
  'beam': ['beam'],
};

const normalizedAreas = areas.map((a) => {
  const id = a.area_id;
  const name = a.name || id;
  const lc = (s) => s.toLowerCase().replace(/_/g, ' ');
  const aliases = new Set([lc(id), lc(name), ...(AREA_ALIASES[id] || []).map(lc)]);
  return { id, name, aliases: [...aliases] };
});

// ─── Gather unassigned devices + their hint text ───────────
const deviceEntities = {};
for (const e of entityReg) {
  if (!e.device_id) continue;
  (deviceEntities[e.device_id] ||= []).push(e);
}
const stateByEntity = Object.fromEntries(states.map((s) => [s.entity_id, s]));

const unassigned = devices.filter((d) => !d.area_id);
const withArea = devices.filter((d) => d.area_id);

function hintText(d) {
  const parts = [];
  if (d.name_by_user) parts.push(d.name_by_user);
  if (d.name) parts.push(d.name);
  if (d.model) parts.push(d.model);
  if (d.manufacturer) parts.push(d.manufacturer);
  const ents = deviceEntities[d.id] || [];
  for (const e of ents.slice(0, 8)) {
    if (e.name) parts.push(e.name);
    const st = stateByEntity[e.entity_id];
    const fn = st?.attributes?.friendly_name;
    if (typeof fn === 'string') parts.push(fn);
    parts.push(e.entity_id);
  }
  return parts.join(' | ').toLowerCase().replace(/_/g, ' ');
}

function scoreArea(hint, area) {
  let score = 0;
  for (const alias of area.aliases) {
    if (!alias) continue;
    // word-boundary match when alias has space-segments; substring fallback for slugs
    const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(hint)) score += 2;
    else if (hint.includes(alias)) score += 1;
  }
  return score;
}

function bestArea(d) {
  const hint = hintText(d);
  if (!hint) return null;
  const scored = normalizedAreas.map((a) => ({ area: a, score: scoreArea(hint, a) }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  const runnerUp = scored[1];
  if (top.score <= 0) return null;
  // Require the top pick to beat the runner-up by at least 1 to avoid "backyard"
  // matching both "Back Yard" and some other fuzzy match in the same hint.
  if (runnerUp && top.score - runnerUp.score < 1 && top.score < 3) return null;
  return { area: top.area, score: top.score, hint };
}

// ─── Classify + optionally apply ───────────────────────────
const confident = []; // score >= 2
const ambiguous = []; // score 1 (one weak hit)
const nomatch = [];

for (const d of unassigned) {
  const best = bestArea(d);
  if (!best) { nomatch.push({ d }); continue; }
  if (best.score >= 2) confident.push({ d, best });
  else ambiguous.push({ d, best });
}

console.log(`=== DEVICE AREA ASSIGNMENT ${DRY ? '(DRY RUN)' : '(LIVE)'} ===`);
console.log(`total devices: ${devices.length}`);
console.log(`  already assigned: ${withArea.length}`);
console.log(`  unassigned: ${unassigned.length}`);
console.log(`    confident matches (score>=2): ${confident.length}`);
console.log(`    ambiguous matches (score=1): ${ambiguous.length}`);
console.log(`    no match: ${nomatch.length}`);
console.log('');

if (confident.length) {
  console.log('=== CONFIDENT (applying) ===');
  for (const { d, best } of confident) {
    const nameTag = d.name_by_user || d.name || '(unnamed)';
    console.log(`  ${d.id.slice(0,8)} "${nameTag}" -> ${best.area.name} (score=${best.score})`);
  }
}

let applied = 0;
let failed = 0;
if (!DRY) {
  for (const { d, best } of confident) {
    try {
      await call({
        type: 'config/device_registry/update',
        device_id: d.id,
        area_id: best.area.id,
      });
      applied++;
    } catch (e) {
      failed++;
      console.log(`  ! failed ${d.id}: ${e.message}`);
    }
  }
  console.log(`\napplied: ${applied}, failed: ${failed}`);
}

if (ambiguous.length) {
  console.log('\n=== AMBIGUOUS (not applied — pick manually or retrain heuristic) ===');
  for (const { d, best } of ambiguous) {
    const nameTag = d.name_by_user || d.name || '(unnamed)';
    console.log(`  ${d.id.slice(0,8)} "${nameTag}" -> ${best.area.name} (weak)  hint="${best.hint.slice(0,80)}"`);
  }
}

if (nomatch.length) {
  console.log('\n=== NO MATCH (not applied — needs human eyes) ===');
  for (const { d } of nomatch.slice(0, 40)) {
    const nameTag = d.name_by_user || d.name || '(unnamed)';
    const model = d.model ? ` [${d.model}]` : '';
    console.log(`  ${d.id.slice(0,8)} "${nameTag}"${model}`);
  }
  if (nomatch.length > 40) console.log(`  ... ${nomatch.length - 40} more`);
}

ws.close();
