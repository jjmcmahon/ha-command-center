#!/usr/bin/env node
// Quick: read HA version + pending updates via the REST API.
import fs from 'node:fs';
const token = fs.readFileSync(process.env.HA_LLAT_PATH || 'F:\\jjdev\\keys\\ha-llat.txt', 'utf8').trim();
const HA = process.env.HA_HOST || 'http://192.168.120.3:8123';

async function get(path) {
  const r = await fetch(`${HA}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${r.statusText}`);
  return r.json();
}

try {
  const cfg = await get('/api/config');
  console.log(`HA version: ${cfg.version}`);
  console.log(`state: ${cfg.state}`);
} catch (e) {
  console.log(`/api/config failed: ${e.message}`);
}

try {
  const states = await get('/api/states');
  const pending = states.filter((s) => s.entity_id.startsWith('update.') && s.state === 'on');
  console.log(`pending updates (${pending.length}):`);
  pending.forEach((s) => console.log(`  ${s.entity_id}: ${s.attributes.installed_version} -> ${s.attributes.latest_version}`));
} catch (e) {
  console.log(`/api/states failed: ${e.message}`);
}
