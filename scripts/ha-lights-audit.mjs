#!/usr/bin/env node
// Enumerate all light entities with their capability flags + area.
// Adaptive Lighting needs color-temp or RGB capability; on/off-only lights don't benefit.
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

const [states, entityReg, deviceReg, areas] = await Promise.all([
  call({ type: 'get_states' }),
  call({ type: 'config/entity_registry/list' }),
  call({ type: 'config/device_registry/list' }),
  call({ type: 'config/area_registry/list' }),
]);
ws.close();

const deviceById = Object.fromEntries(deviceReg.map((d) => [d.id, d]));
const entityByEntityId = Object.fromEntries(entityReg.map((e) => [e.entity_id, e]));
const areaNameById = Object.fromEntries(areas.map((a) => [a.area_id, a.name]));

const lights = states.filter((s) => s.entity_id.startsWith('light.'));

const byRoom = {};
const platformCounts = {};
const capabilityBuckets = { color: 0, colorTemp: 0, brightness: 0, onOff: 0 };

function capabilityOf(s) {
  const modes = (s.attributes?.supported_color_modes || []);
  if (modes.some((m) => ['hs','rgb','rgbw','rgbww','xy'].includes(m))) return 'color';
  if (modes.includes('color_temp')) return 'colorTemp';
  if (modes.includes('brightness') || typeof s.attributes?.brightness === 'number') return 'brightness';
  return 'onOff';
}

for (const l of lights) {
  const reg = entityByEntityId[l.entity_id];
  const device = reg?.device_id ? deviceById[reg.device_id] : null;
  const areaId = reg?.area_id ?? device?.area_id ?? null;
  const room = areaId ? (areaNameById[areaId] || areaId) : '<unassigned>';
  byRoom[room] = byRoom[room] || [];
  const cap = capabilityOf(l);
  const platform = reg?.platform || '(unknown)';
  platformCounts[platform] = (platformCounts[platform] || 0) + 1;
  capabilityBuckets[cap]++;
  byRoom[room].push({
    entity_id: l.entity_id,
    friendly: l.attributes?.friendly_name,
    platform,
    state: l.state,
    capability: cap,
    brightness: l.attributes?.brightness,
    color_temp: l.attributes?.color_temp_kelvin,
  });
}

console.log('=== TOTAL LIGHTS ===');
console.log(`count: ${lights.length}`);
console.log(`by capability: color=${capabilityBuckets.color}, color_temp=${capabilityBuckets.colorTemp}, brightness-only=${capabilityBuckets.brightness}, on/off=${capabilityBuckets.onOff}`);
console.log(`adaptive-lighting-capable (color or color_temp): ${capabilityBuckets.color + capabilityBuckets.colorTemp}`);
console.log('');
console.log('=== BY PLATFORM ===');
for (const [p, n] of Object.entries(platformCounts).sort((a,b) => b[1]-a[1])) console.log(`  ${p}: ${n}`);
console.log('');
console.log('=== BY ROOM ===');
for (const [room, arr] of Object.entries(byRoom).sort((a,b) => b[1].length - a[1].length)) {
  const caps = arr.reduce((acc,l) => (acc[l.capability] = (acc[l.capability]||0)+1, acc), {});
  const capStr = Object.entries(caps).map(([k,v]) => `${k}=${v}`).join(', ');
  console.log(`\n[${room}] — ${arr.length} light(s) (${capStr})`);
  for (const l of arr) {
    console.log(`  ${l.entity_id}  [${l.platform}, ${l.capability}]  ${l.state}  ${l.friendly || ''}`);
  }
}
