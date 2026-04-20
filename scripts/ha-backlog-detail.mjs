#!/usr/bin/env node
/**
 * Deeper look at fuzzy items from ha-backlog-check:
 *   - What TTS entities actually exist? (Piper vs Google Translate)
 *   - What STT entities?
 *   - What automation entities exist? (which ones look like the routines)
 *   - What update entities are on? (pending updates detail)
 *   - Go2rtc stream info (Frigate prep?)
 *   - Coral TPU visibility — query Supervisor add-on list if accessible
 */
import fs from 'node:fs';

const HA_HOST = process.env.HA_HOST || 'http://192.168.120.3:8123';
const LLAT_PATH = process.env.HA_LLAT_PATH || 'F:\\jjdev\\keys\\ha-llat.txt';
const token = fs.readFileSync(LLAT_PATH, 'utf8').trim();

const ws = new WebSocket(HA_HOST.replace(/^http/, 'ws') + '/api/websocket');
await new Promise((r, j) => {
  ws.addEventListener('open', r, { once: true });
  ws.addEventListener('error', () => j(new Error('ws error')), { once: true });
});
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

const [states, entries] = await Promise.all([
  call({ type: 'get_states' }),
  call({ type: 'config_entries/get' }),
]);
ws.close();

console.log('=== TTS entities ===');
states.filter((s) => s.entity_id.startsWith('tts.')).forEach((s) => {
  console.log(`  ${s.entity_id}  state=${s.state}  friendly=${s.attributes?.friendly_name || '(none)'}`);
});

console.log('\n=== STT entities ===');
states.filter((s) => s.entity_id.startsWith('stt.')).forEach((s) => {
  console.log(`  ${s.entity_id}  state=${s.state}`);
});

console.log('\n=== assist_pipeline / wake_word entities ===');
states.filter((s) => /^(assist_pipeline|wake_word)\./.test(s.entity_id)).forEach((s) => {
  console.log(`  ${s.entity_id}  state=${s.state}`);
});

console.log('\n=== automation entities ===');
const autos = states.filter((s) => s.entity_id.startsWith('automation.'));
console.log(`  (total: ${autos.length})`);
autos.forEach((s) => {
  console.log(`  ${s.entity_id}  state=${s.state}  friendly=${s.attributes?.friendly_name || '(none)'}`);
});

console.log('\n=== scenes ===');
states.filter((s) => s.entity_id.startsWith('scene.')).forEach((s) => {
  console.log(`  ${s.entity_id}  friendly=${s.attributes?.friendly_name || ''}`);
});

console.log('\n=== scripts ===');
states.filter((s) => s.entity_id.startsWith('script.')).forEach((s) => {
  console.log(`  ${s.entity_id}  friendly=${s.attributes?.friendly_name || ''}`);
});

console.log('\n=== update entities (pending = on) ===');
states.filter((s) => s.entity_id.startsWith('update.')).forEach((s) => {
  const pending = s.state === 'on';
  if (pending) {
    console.log(`  PENDING  ${s.entity_id}  installed=${s.attributes?.installed_version || '?'} latest=${s.attributes?.latest_version || '?'}  friendly=${s.attributes?.friendly_name || ''}`);
  }
});

console.log('\n=== config_entries by domain (extras) ===');
const interesting = ['go2rtc', 'hassio', 'mqtt', 'zha', 'zwave_js', 'smartthings', 'homekit_controller'];
entries
  .filter((e) => interesting.includes(e.domain))
  .forEach((e) => console.log(`  ${e.domain}  title="${e.title}"  state=${e.state}`));

// Try Supervisor addon list (requires hassio proxy). HA's core API proxies
// /api/hassio/* when hassio integration is installed. Use fetch.
console.log('\n=== installed add-ons (via hassio proxy) ===');
try {
  const r = await fetch(`${HA_HOST}/api/hassio/addons`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.ok) {
    const j = await r.json();
    const addons = j?.data?.addons || [];
    for (const a of addons) {
      console.log(`  ${a.slug}  name="${a.name}"  state=${a.state}  version=${a.version}`);
    }
    console.log(`  (total: ${addons.length})`);
  } else {
    console.log(`  hassio API returned ${r.status}: ${r.statusText}`);
  }
} catch (e) {
  console.log(`  hassio API fetch failed: ${e.message}`);
}
