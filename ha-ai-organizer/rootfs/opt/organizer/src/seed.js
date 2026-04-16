/**
 * Seed data — common household chores, maintenance items, and pantry staples.
 * Run once on first boot or via: node src/seed.js
 */

const { getDb } = require('./db');
const { calcNextDue } = require('./utils');

function seed() {
  const db = getDb();

  // Skip if already seeded
  const count = db.prepare('SELECT COUNT(*) as c FROM chores').get().c;
  if (count > 0) {
    console.log('[seed] Database already has data — skipping');
    return;
  }

  console.log('[seed] Populating with starter data...');
  const today = new Date().toISOString().split('T')[0];

  // ---- Chores ----
  const chores = [
    { name: 'Vacuum living room', frequency: 'weekly', room: 'Living Room', priority: 'normal' },
    { name: 'Vacuum bedrooms', frequency: 'weekly', room: 'Bedrooms', priority: 'normal' },
    { name: 'Mop kitchen floor', frequency: 'weekly', room: 'Kitchen', priority: 'normal' },
    { name: 'Clean bathrooms', frequency: 'weekly', room: 'Bathrooms', priority: 'high' },
    { name: 'Wipe kitchen counters', frequency: 'daily', room: 'Kitchen', priority: 'normal' },
    { name: 'Take out trash', frequency: 'biweekly', room: 'Kitchen', priority: 'normal' },
    { name: 'Do laundry', frequency: 'biweekly', room: 'Laundry', priority: 'normal' },
    { name: 'Dust surfaces', frequency: 'biweekly', room: 'All', priority: 'low' },
    { name: 'Clean windows', frequency: 'monthly', room: 'All', priority: 'low' },
    { name: 'Organize garage', frequency: 'monthly', room: 'Garage', priority: 'low' },
    { name: 'Mow lawn', frequency: 'weekly', room: 'Exterior', priority: 'normal' },
    { name: 'Water plants', frequency: 'biweekly', room: 'All', priority: 'normal' },
  ];

  const insertChore = db.prepare(`
    INSERT INTO chores (name, frequency, room, priority, next_due) VALUES (?, ?, ?, ?, ?)
  `);

  for (const c of chores) {
    insertChore.run(c.name, c.frequency, c.room, c.priority, calcNextDue(today, c.frequency));
  }

  // ---- Maintenance ----
  const maintenance = [
    { name: 'Replace HVAC filter', category: 'hvac', frequency: 'monthly', cost_estimate: 15 },
    { name: 'Test smoke detectors', category: 'electrical', frequency: 'monthly', cost_estimate: 0 },
    { name: 'Flush water heater', category: 'plumbing', frequency: 'yearly', cost_estimate: 0 },
    { name: 'Clean dryer vent', category: 'appliance', frequency: 'quarterly', cost_estimate: 0 },
    { name: 'Check fire extinguisher', category: 'general', frequency: 'yearly', cost_estimate: 0 },
    { name: 'Inspect roof / gutters', category: 'exterior', frequency: 'quarterly', cost_estimate: 0 },
    { name: 'Service garage door', category: 'general', frequency: 'yearly', cost_estimate: 75 },
    { name: 'Test GFCI outlets', category: 'electrical', frequency: 'monthly', cost_estimate: 0 },
    { name: 'Check caulking (bathrooms/windows)', category: 'general', frequency: 'yearly', cost_estimate: 20 },
    { name: 'Pest inspection', category: 'exterior', frequency: 'yearly', cost_estimate: 100, vendor: 'Local pest control' },
    { name: 'Deep clean HVAC ducts', category: 'hvac', frequency: 'yearly', cost_estimate: 300, vendor: 'HVAC company' },
  ];

  const insertMaint = db.prepare(`
    INSERT INTO maintenance (name, category, frequency, next_due, cost_estimate, vendor) VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const m of maintenance) {
    insertMaint.run(m.name, m.category, m.frequency, calcNextDue(today, m.frequency), m.cost_estimate, m.vendor || '');
  }

  // ---- Inventory (pantry staples) ----
  const inventory = [
    { name: 'Paper towels', category: 'cleaning', quantity: 6, unit: 'roll', min_quantity: 2 },
    { name: 'Trash bags', category: 'cleaning', quantity: 20, unit: 'each', min_quantity: 5 },
    { name: 'Dish soap', category: 'cleaning', quantity: 1, unit: 'each', min_quantity: 1 },
    { name: 'Laundry detergent', category: 'cleaning', quantity: 1, unit: 'each', min_quantity: 1 },
    { name: 'Toilet paper', category: 'bathroom', quantity: 12, unit: 'roll', min_quantity: 4 },
    { name: 'Hand soap', category: 'bathroom', quantity: 3, unit: 'each', min_quantity: 1 },
    { name: 'Batteries (AA)', category: 'general', quantity: 8, unit: 'each', min_quantity: 4 },
    { name: 'Batteries (AAA)', category: 'general', quantity: 4, unit: 'each', min_quantity: 4 },
    { name: 'Light bulbs (LED)', category: 'general', quantity: 4, unit: 'each', min_quantity: 2 },
    { name: 'HVAC filters', category: 'general', quantity: 3, unit: 'each', min_quantity: 1 },
    { name: 'Water filters', category: 'general', quantity: 2, unit: 'each', min_quantity: 1 },
  ];

  const insertInv = db.prepare(`
    INSERT INTO inventory (name, category, quantity, unit, min_quantity) VALUES (?, ?, ?, ?, ?)
  `);

  for (const i of inventory) {
    insertInv.run(i.name, i.category, i.quantity, i.unit, i.min_quantity);
  }

  console.log(`[seed] Done — ${chores.length} chores, ${maintenance.length} maintenance items, ${inventory.length} inventory items`);
}

// Run if called directly
if (require.main === module) {
  seed();
  process.exit(0);
}

module.exports = { seed };
