#!/usr/bin/env node
/**
 * HA Area Audit — read-only.
 *
 * Connects to HA via WebSocket using the LLAT at F:\jjdev\keys\ha-llat.txt,
 * pulls area_registry, device_registry, entity_registry, and dumps a JSON
 * report to scripts/ha-area-audit.out.json.
 *
 * Also prints a summary of:
 *   - Existing areas
 *   - Entities with area_id set (via entity or via device)
 *   - Entities with NO area_id
 *   - Suggested mappings by entity_id/name heuristics
 *
 * Does NOT mutate anything.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Node 22+ has global WebSocket — avoids an npm install for this one-off audit.

const HA_HOST = process.env.HA_HOST || 'http://192.168.120.3:8123';
const LLAT_PATH = process.env.HA_LLAT_PATH || 'F:\\jjdev\\keys\\ha-llat.txt';

function readToken() {
  const raw = fs.readFileSync(LLAT_PATH, 'utf8').trim();
  if (!raw) throw new Error('empty LLAT at ' + LLAT_PATH);
  return raw;
}

function wsUrlFromHost(host) {
  const u = new URL(host);
  const scheme = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${u.host}/api/websocket`;
}

async function callWs(ws, msg) {
  return new Promise((resolve, reject) => {
    const id = msg.id;
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      ws.removeEventListener('message', onMsg);
      if (m.type === 'result') {
        if (m.success) resolve(m.result);
        else reject(new Error(JSON.stringify(m.error)));
      } else {
        reject(new Error('unexpected msg type ' + m.type));
      }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify(msg));
  });
}

async function main() {
  const token = readToken();
  const url = wsUrlFromHost(HA_HOST);
  console.log('connecting to', url);
  const ws = new WebSocket(url);

  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', (e) => rej(new Error('ws error: ' + (e?.message || 'unknown'))), { once: true });
  });

  // auth handshake
  await new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: token }));
      } else if (m.type === 'auth_ok') {
        ws.removeEventListener('message', onMsg);
        resolve();
      } else if (m.type === 'auth_invalid') {
        ws.removeEventListener('message', onMsg);
        reject(new Error('auth_invalid: ' + m.message));
      }
    };
    ws.addEventListener('message', onMsg);
  });
  console.log('authed.');

  let nextId = 1;
  const next = () => nextId++;

  const areas = await callWs(ws, { id: next(), type: 'config/area_registry/list' });
  const devices = await callWs(ws, { id: next(), type: 'config/device_registry/list' });
  const entities = await callWs(ws, { id: next(), type: 'config/entity_registry/list' });
  const states = await callWs(ws, { id: next(), type: 'get_states' });

  ws.close();

  const stateByEntity = Object.fromEntries(states.map((s) => [s.entity_id, s]));
  const deviceById = Object.fromEntries(devices.map((d) => [d.id, d]));

  // For every entity, resolve effective area (entity.area_id OR device.area_id)
  const resolved = entities.map((e) => {
    const dev = e.device_id ? deviceById[e.device_id] : null;
    const entityArea = e.area_id || null;
    const deviceArea = dev?.area_id || null;
    const effective = entityArea || deviceArea;
    const st = stateByEntity[e.entity_id];
    return {
      entity_id: e.entity_id,
      platform: e.platform,
      name: e.name || st?.attributes?.friendly_name || null,
      device_id: e.device_id || null,
      device_name: dev?.name || dev?.name_by_user || null,
      device_manufacturer: dev?.manufacturer || null,
      device_model: dev?.model || null,
      entity_area_id: entityArea,
      device_area_id: deviceArea,
      effective_area_id: effective,
      state: st?.state ?? null,
    };
  });

  const withArea = resolved.filter((r) => r.effective_area_id);
  const noArea = resolved.filter((r) => !r.effective_area_id);

  const areaNameById = Object.fromEntries(areas.map((a) => [a.area_id, a.name]));

  const byArea = {};
  for (const r of resolved) {
    const key = r.effective_area_id ? areaNameById[r.effective_area_id] || r.effective_area_id : '<unassigned>';
    byArea[key] = (byArea[key] || 0) + 1;
  }

  // Heuristic suggestions for unassigned entities
  const roomKeywords = {
    'Living Room': ['living_room', 'livingroom', 'living'],
    'Office':      ['office'],
    'Kitchen':     ['kitchen'],
    'Bedroom':     ['bedroom', 'master_bedroom', 'master'],
    'Bathroom':    ['bathroom', 'bath'],
    'Media Room':  ['media_room', 'mediaroom', 'media'],
    'Garage':      ['garage'],
    'Front Door':  ['front_door', 'front_porch', 'porch'],
    'Hallway':     ['hallway', 'hall'],
    'Dining Room': ['dining'],
  };

  function suggestAreaFor(r) {
    const probe = (r.entity_id + ' ' + (r.name || '') + ' ' + (r.device_name || '')).toLowerCase();
    for (const [room, kws] of Object.entries(roomKeywords)) {
      if (kws.some((k) => probe.includes(k))) return room;
    }
    return null;
  }

  const suggestions = noArea.map((r) => ({ ...r, suggested_area: suggestAreaFor(r) }));
  const suggestedCounts = {};
  for (const s of suggestions) {
    const k = s.suggested_area || '<no-suggestion>';
    suggestedCounts[k] = (suggestedCounts[k] || 0) + 1;
  }

  const report = {
    generated_at: new Date().toISOString(),
    ha_host: HA_HOST,
    counts: {
      areas: areas.length,
      devices: devices.length,
      entities: entities.length,
      with_effective_area: withArea.length,
      no_area: noArea.length,
    },
    areas,
    byArea,
    suggestedCounts,
    unassigned_entities_with_suggestions: suggestions,
    resolved_entities: resolved,
  };

  const outDir = path.dirname(fileURLToPath(import.meta.url));
  const outPath = path.join(outDir, 'ha-area-audit.out.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log('areas:', areas.length);
  console.log('devices:', devices.length);
  console.log('entities:', entities.length);
  console.log('  with effective area:', withArea.length);
  console.log('  without area:', noArea.length);
  console.log('\nExisting areas:');
  for (const a of areas) console.log(`  - ${a.name} (${a.area_id})`);
  console.log('\nEntities by area:');
  for (const [k, v] of Object.entries(byArea).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  console.log('\nSuggested mappings for unassigned:');
  for (const [k, v] of Object.entries(suggestedCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  console.log(`\nFull report: ${outPath}`);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
