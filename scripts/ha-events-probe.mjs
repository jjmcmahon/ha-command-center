#!/usr/bin/env node
// Quick probe: list most recent 20 event docs in homeassistant/events/log
// and report total count. Run on Kali where firebase-admin is installed.
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const SA_PATH = process.env.SA_PATH || '/data/bridges/service-account.json';
const sa = JSON.parse(readFileSync(SA_PATH, 'utf-8'));
admin.initializeApp({ credential: admin.credential.cert(sa) }, 'evt');
const db = admin.app('evt').firestore();

const col = db.collection('homeassistant').doc('events').collection('log');
const snap = await col.orderBy('created', 'desc').limit(20).get();
console.log(`events in homeassistant/events/log (newest 20 of total):`);
console.log(`  count in this page: ${snap.size}`);

const totalSnap = await col.count().get();
console.log(`  total docs: ${totalSnap.data().count}`);

for (const d of snap.docs) {
  const data = d.data();
  const ts = data.created?.toDate ? data.created.toDate().toISOString() : '(pending)';
  console.log(`  [${ts}] ${data.entity_id}: ${data.old_state} -> ${data.new_state}  (area=${data.area_name ?? 'null'})`);
}
process.exit(0);
