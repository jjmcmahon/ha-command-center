/**
 * Maintenance API — home maintenance schedules
 *
 * GET    /api/maintenance              — list all active items
 * GET    /api/maintenance/:id          — get one
 * POST   /api/maintenance              — create
 * PUT    /api/maintenance/:id          — update
 * POST   /api/maintenance/:id/complete — mark done, advance next_due
 * DELETE /api/maintenance/:id          — archive
 */

const { Router } = require('express');
const { getDb } = require('../db');
const { calcNextDue, isOverdue, isDueSoon } = require('../utils');

const router = Router();

// List all
router.get('/', (req, res) => {
  const db = getDb();
  const { category, overdue, upcoming } = req.query;

  let sql = 'SELECT * FROM maintenance WHERE archived = 0';
  const params = [];

  if (category) { sql += ' AND category = ?'; params.push(category); }

  sql += ' ORDER BY next_due ASC';
  let items = db.prepare(sql).all(...params);

  if (overdue === 'true') {
    items = items.filter(m => isOverdue(m.next_due));
  }
  if (upcoming === 'true') {
    const days = parseInt(req.query.days || '14', 10);
    items = items.filter(m => isDueSoon(m.next_due, days));
  }

  res.json(items);
});

// Get one
router.get('/:id', (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Maintenance item not found' });
  res.json(item);
});

// Create
router.post('/', (req, res) => {
  const db = getDb();
  const { name, description, category, frequency, custom_days, cost_estimate, vendor, notes } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const next_due = calcNextDue(null, frequency || 'monthly', custom_days);

  const result = db.prepare(`
    INSERT INTO maintenance (name, description, category, frequency, custom_days, next_due, cost_estimate, vendor, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    description || '',
    category || 'general',
    frequency || 'monthly',
    custom_days || null,
    next_due,
    cost_estimate || 0,
    vendor || '',
    notes || ''
  );

  const item = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

// Update
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Maintenance item not found' });

  const fields = ['name', 'description', 'category', 'frequency', 'custom_days', 'cost_estimate', 'vendor', 'notes'];
  const updates = [];
  const params = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE maintenance SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const item = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  res.json(item);
});

// Complete — mark done and advance
router.post('/:id/complete', (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Maintenance item not found' });

  const today = new Date().toISOString().split('T')[0];
  const next_due = calcNextDue(today, item.frequency, item.custom_days);

  db.prepare('UPDATE maintenance SET last_done = ?, next_due = ? WHERE id = ?')
    .run(today, next_due, item.id);

  const updated = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(item.id);
  res.json({ message: 'Maintenance completed', item: updated, next_due });
});

// Archive
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('UPDATE maintenance SET archived = 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  res.json({ message: 'Maintenance item archived' });
});

module.exports = router;
