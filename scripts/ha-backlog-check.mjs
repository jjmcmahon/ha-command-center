#!/usr/bin/env node
/**
 * Reconcile the HA GH-issue backlog against HA's live state.
 *
 * For each open HA- issue we ask: is this actually already done? Signal comes
 * from three sources:
 *   1. HA config_entries list (integrations installed)
 *   2. Entity / device registries (entities exist for X, Y, Z)
 *   3. Lovelace resources (HACS frontend packages registered)
 *
 * Read-only. Emits a per-issue status + short rationale.
 */
import fs from 'node:fs';

const HA_HOST = process.env.HA_HOST || 'http://192.168.120.3:8123';
const LLAT_PATH = process.env.HA_LLAT_PATH || 'F:\\jjdev\\keys\\ha-llat.txt';

const token = fs.readFileSync(LLAT_PATH, 'utf8').trim();
const wsUrl = HA_HOST.replace(/^http/, 'ws') + '/api/websocket';

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', (e) => rej(new Error('ws error')), { once: true });
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

let nextId = 1;
async function callWs(msg) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      ws.removeEventListener('message', onMsg);
      if (m.type === 'result') m.success ? resolve(m.result) : reject(new Error(JSON.stringify(m.error)));
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, ...msg }));
  });
}

const [entries, entityReg, deviceReg, states, resources] = await Promise.all([
  callWs({ type: 'config_entries/get' }).catch(() => []),
  callWs({ type: 'config/entity_registry/list' }).catch(() => []),
  callWs({ type: 'config/device_registry/list' }).catch(() => []),
  callWs({ type: 'get_states' }).catch(() => []),
  callWs({ type: 'lovelace/resources' }).catch(() => []),
]);

ws.close();

// ─── Helpers ───────────────────────────────────────────────
const entryDomains = new Set(entries.map((e) => e.domain));
const entryByDomain = (dom) => entries.filter((e) => e.domain === dom);
const hasEntityPrefix = (prefix) => states.some((s) => s.entity_id.startsWith(prefix));
const entitiesMatching = (re) => states.filter((s) => re.test(s.entity_id));
const devicesByManufacturer = (vendor) =>
  deviceReg.filter((d) => (d.manufacturer || '').toLowerCase().includes(vendor.toLowerCase()));
const resourceHasUrl = (needle) => resources.some((r) => (r.url || '').toLowerCase().includes(needle.toLowerCase()));

function fmtBool(ok) { return ok ? 'DONE' : 'OPEN'; }
function partial(text) { return `PARTIAL — ${text}`; }

// ─── Per-issue checks ──────────────────────────────────────

const rows = [];

// HACS bootstrap (implied by #10-13)
const hasHacs = entryDomains.has('hacs');
rows.push(['HACS installed', fmtBool(hasHacs), hasHacs ? 'hacs config entry present' : 'no hacs entry — all HACS-dependent items blocked']);

// #10 HA-611 Mushroom
{
  const res = resourceHasUrl('mushroom');
  rows.push(['HA-611 Mushroom Cards', fmtBool(res), res ? 'mushroom resource registered in Lovelace' : 'no mushroom resource']);
}
// #11 HA-612 Bubble
{
  const res = resourceHasUrl('bubble');
  rows.push(['HA-612 Bubble Card', fmtBool(res), res ? 'bubble-card resource registered' : 'no bubble resource']);
}
// #12 HA-613 card-mod + layout-card
{
  const mod = resourceHasUrl('card-mod');
  const layout = resourceHasUrl('layout-card');
  const both = mod && layout;
  rows.push(['HA-613 card-mod + layout-card', both ? 'DONE' : mod || layout ? partial(`mod=${mod} layout=${layout}`) : 'OPEN', `resources: card-mod=${mod} layout-card=${layout}`]);
}

// #15 HA-616 Alexa Media Player
{
  const dom = entryDomains.has('alexa_media');
  const mps = entitiesMatching(/^media_player\.(echo_|alexa_)/i);
  rows.push(['HA-616 Alexa Media Player', fmtBool(dom), `config_entry alexa_media=${dom}; echo/alexa media_players=${mps.length}`]);
}

// #19 HA-621 Zigbee (SLZB-06 / ZHA)
{
  const zha = entryDomains.has('zha');
  const z2m = entryDomains.has('mqtt') && entitiesMatching(/^sensor\.zigbee2mqtt/i).length > 0;
  const slzb = deviceReg.some((d) => (d.model || '').toLowerCase().includes('slzb') || (d.name || '').toLowerCase().includes('slzb'));
  rows.push(['HA-621 Zigbee (SLZB-06)', fmtBool(zha || z2m), `zha=${zha} z2m=${z2m} slzb device seen=${slzb}`]);
}
// #20 HA-622 Z-Wave (Z-Stick 7 / zwave_js)
{
  const zwave = entryDomains.has('zwave_js');
  const zwaveEnts = entitiesMatching(/^(sensor|binary_sensor|switch|light|lock)\..*zwave/i).length;
  rows.push(['HA-622 Z-Wave (Z-Stick 7)', fmtBool(zwave), `zwave_js config_entry=${zwave}`]);
}
// #21 HA-623 Migrate Zigbee from Homey
// #22 HA-624 Migrate Z-Wave from Homey
// #23 HA-625 Factory reset Homey Pro
{
  const homey = entryDomains.has('homey') || entryDomains.has('homeyduino');
  rows.push(['Homey Pro integration', fmtBool(homey), `homey entry present=${homey} (reverse signal for HA-625)`]);
}

// #24 HA-630 Adaptive Lighting
{
  const al = entryDomains.has('adaptive_lighting');
  const alEnts = entitiesMatching(/^switch\.adaptive_lighting_/).length;
  rows.push(['HA-630 Adaptive Lighting', fmtBool(al), `config_entry=${al}; adaptive_lighting switches=${alEnts}`]);
}

// #25-27 Automations
for (const [num, label, rx] of [
  ['HA-631 Welcome Home', 'welcome_home', /welcome[_-]?home/i],
  ['HA-632 Movie Mode', 'movie_mode', /movie[_-]?mode/i],
  ['HA-633 Goodnight Routine', 'goodnight', /goodnight|good_night/i],
]) {
  const automations = entitiesMatching(new RegExp(`^automation\\..*(${label})`, 'i')).length
    + entitiesMatching(rx).filter((e) => e.entity_id.startsWith('automation.')).length;
  const anyMatch = entitiesMatching(rx).filter((e) => e.entity_id.startsWith('automation.')).length;
  rows.push([num, fmtBool(anyMatch > 0), `automation entities matching=${anyMatch}`]);
}

// #30 HA-636 Aqara FP2 mmWave
{
  const aqara = devicesByManufacturer('Aqara');
  const fp2 = aqara.filter((d) => (d.model || '').toUpperCase().includes('FP2'));
  rows.push(['HA-636 Aqara FP2', fmtBool(fp2.length > 0), `Aqara devices=${aqara.length} FP2 devices=${fp2.length}`]);
}

// #31 HA-640 Frigate
{
  const fri = entryDomains.has('frigate');
  const friEnts = entitiesMatching(/frigate/i).length;
  rows.push(['HA-640 Frigate NVR', fmtBool(fri), `config_entry=${fri}; frigate entities=${friEnts}`]);
}
// #32 HA-641 Coral TPU (indicator: sensor.frigate_detection_fps or detector inference entities)
{
  const coralSpeed = entitiesMatching(/^sensor\.frigate.*inference_speed/i);
  const detEnt = entitiesMatching(/^sensor\.frigate_detector/i);
  const looksCoral = coralSpeed.some((e) => {
    const speed = parseFloat(e.state);
    return Number.isFinite(speed) && speed > 0 && speed < 30; // Coral ~8-20ms; CPU >40ms
  });
  rows.push(['HA-641 Coral TPU', looksCoral ? 'DONE' : (detEnt.length > 0 ? partial('Frigate has detector entities but no coral-signature inference_speed — may be CPU-only') : 'OPEN'), `inference_speed entities=${coralSpeed.length} detector entities=${detEnt.length}; latency signature suggests coral=${looksCoral}`]);
}
// #33 HA-642 Camera streams
{
  const cams = entitiesMatching(/^camera\./);
  rows.push(['HA-642 Camera streams', fmtBool(cams.length > 0), `camera.* entities=${cams.length}`]);
}
// #34-35 Whisper / Piper
{
  const wyoming = entryDomains.has('wyoming');
  const whisper = entitiesMatching(/^stt\./).length + entitiesMatching(/whisper/i).length;
  const piper = entitiesMatching(/^tts\./).length + entitiesMatching(/piper/i).length;
  rows.push(['HA-643 Whisper (STT)', fmtBool(whisper > 0), `wyoming=${wyoming} stt entities/whisper=${whisper}`]);
  rows.push(['HA-644 Piper (TTS)', fmtBool(piper > 0), `wyoming=${wyoming} tts entities/piper=${piper}`]);
}
// #36-37 Voice satellite (ESP32-S3-BOX-3)
{
  const sat = entitiesMatching(/^assist_satellite\./);
  const esphome = entryDomains.has('esphome');
  const boxDevs = deviceReg.filter((d) => /s3[ -]?box/i.test(d.model || '') || /s3[ -]?box/i.test(d.name || ''));
  rows.push(['HA-645/646 Voice satellite', fmtBool(sat.length > 0 || boxDevs.length > 0), `assist_satellite entities=${sat.length} esphome=${esphome} s3-box devices=${boxDevs.length}`]);
}

// #50 MyQ / cover
{
  const covers = entitiesMatching(/^cover\./);
  rows.push(['HA-50 MyQ garage', fmtBool(covers.length > 0), `cover.* entities=${covers.length}`]);
}

// #47 Pending updates
{
  const updates = entitiesMatching(/^update\./).filter((e) => e.state === 'on');
  rows.push(['HA-47 Pending updates', updates.length === 0 ? 'DONE' : 'OPEN', `update entities with state=on (pending): ${updates.length}`]);
}

// ─── Output ────────────────────────────────────────────────
console.log(`HA host: ${HA_HOST}`);
console.log(`entities: ${states.length} | devices: ${deviceReg.length} | config_entries: ${entries.length} | lovelace resources: ${resources.length}`);
console.log('');

const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
for (const [label, status, detail] of rows) {
  console.log(`${pad(label, 32)} ${pad(status, 9)} ${detail}`);
}

// Domain dump for extra context
console.log('\n=== integrations installed ===');
console.log([...entryDomains].sort().join(', '));
