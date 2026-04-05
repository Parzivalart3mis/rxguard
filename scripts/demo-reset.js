#!/usr/bin/env node
/**
 * RxGuard Demo Reset
 *
 * Deletes all MedicationRequests written to the FHIR sandbox during the demo,
 * then clears the local tracking table so the app is clean for the next judge.
 *
 * Usage:
 *   npm run demo:reset
 */

import { config } from 'dotenv';
config();

import Database from 'better-sqlite3';
import path     from 'path';
import { fileURLToPath } from 'url';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH     = path.join(__dirname, '../server/db/rxguard.db');

const db = new Database(DB_PATH);

console.log('\nRxGuard Demo Reset');
console.log('==================\n');

// ── 1. Fetch all resources we wrote ──────────────────────────────────────────
const resources = db.prepare(
  'SELECT * FROM demo_written_resources ORDER BY created_at DESC'
).all();

if (resources.length === 0) {
  console.log('No demo resources found — environment is already clean.\n');
} else {
  console.log(`Deleting ${resources.length} FHIR resource(s)...\n`);

  let deleted = 0;
  let failed  = 0;

  for (const row of resources) {
    const url = `${row.fhir_base_url}/${row.fhir_resource_type}/${row.fhir_resource_id}`;
    try {
      const res = await fetch(url, { method: 'DELETE' });
      // 200/204 = deleted, 404 = already gone — both are fine
      if (res.ok || res.status === 404) {
        console.log(`  ✓  ${row.fhir_resource_type}/${row.fhir_resource_id}  (${row.antibiotic_key || '—'})`);
        deleted++;
      } else {
        console.log(`  ✗  ${row.fhir_resource_type}/${row.fhir_resource_id}  — HTTP ${res.status}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ✗  ${row.fhir_resource_type}/${row.fhir_resource_id}  — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n  Deleted: ${deleted}   Failed: ${failed}`);
}

// ── 2. Clear tracking table ───────────────────────────────────────────────────
db.prepare('DELETE FROM demo_written_resources').run();
db.close();

console.log('\n✓  Tracking table cleared');
console.log('✓  Demo environment reset — ready for next presentation\n');
