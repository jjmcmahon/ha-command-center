#!/usr/bin/env node
/**
 * Post-deploy verification for the HA area_registry work.
 * Reads Firestore directly via service account and confirms:
 *   - 14 area docs in homeassistant/meta/areas
 *   - Bridge heartbeat fresh (<15min) and registry_loaded == true
 *   - Sample of entity state docs have area_id populated
 */
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SA_PATH = process.env.SA_PATH ||
  'F:\\jjdev\\keys\\mcmahon-mission-control-firebase-adminsdk-fbsvc-2516f01576.json';

const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf-8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }, 'ha-verify');
const db = admin.app('ha-verify').firestore();

async function main() {
  const areasSnap = await db.collection('homeassistant').doc('meta').collection('areas').get();
  const areas = areasSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const bridgeDoc = await db.collection('homeassistant').doc('meta').collection('bridge').doc('status').get();
  const bridge = bridgeDoc.data();

  const statesSnap = await db.collection('homeassistant').doc('states').collection('entities').limit(500).get();
  const states = statesSnap.docs.map((d) => d.data());
  const withArea = states.filter((s) => s.area_id);
  const byArea = {};
  for (const s of states) {
    const k = s.area_name || '<unassigned>';
    byArea[k] = (byArea[k] || 0) + 1;
  }

  const hbMs = bridge?.last_heartbeat?.toMillis?.() ?? null;
  const ageMin = hbMs ? (Date.now() - hbMs) / 60000 : null;

  console.log('=== Firestore verification ===');
  console.log(`areas in homeassistant/meta/areas: ${areas.length}`);
  for (const a of areas.sort((x, y) => (x.name || '').localeCompare(y.name || ''))) {
    console.log(`  - ${a.name} (${a.area_id || a.id})`);
  }
  console.log('\n=== Bridge status ===');
  console.log(`connected: ${bridge?.connected}`);
  console.log(`registry_loaded: ${bridge?.registry_loaded}`);
  console.log(`entities_tracked: ${bridge?.entities_tracked}`);
  console.log(`entities_with_area: ${bridge?.entities_with_area}`);
  console.log(`areas_count: ${bridge?.areas_count}`);
  console.log(`heartbeat age: ${ageMin === null ? '(none)' : ageMin.toFixed(1) + 'min'}`);
  console.log(`last_error: ${bridge?.last_error || '(none)'}`);
  console.log('\n=== State docs ===');
  console.log(`entities loaded (capped 500): ${states.length}`);
  console.log(`entities with area_id: ${withArea.length}`);
  console.log('\nby area (live):');
  for (const [k, v] of Object.entries(byArea).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  const samples = withArea.slice(0, 5).map((s) => ({
    entity_id: s.entity_id,
    area_id: s.area_id,
    area_name: s.area_name,
  }));
  console.log('\nSample area-assigned entities:');
  for (const s of samples) console.log(`  ${s.entity_id} → ${s.area_name} (${s.area_id})`);

  const ok =
    areas.length >= 14 &&
    bridge?.registry_loaded === true &&
    (ageMin ?? Infinity) < 15 &&
    withArea.length > 0;
  console.log(`\n=== VERDICT: ${ok ? 'PASS' : 'FAIL'} ===`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(2); });
