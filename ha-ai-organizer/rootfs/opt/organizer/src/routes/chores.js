/**
 * Chores API — CRUD + complete + history
 *
 * GET    /api/chores              — list all active chores
 * GET    /api/chores/:id          — get one chore + recent log
 * POST   /api/chores              — create a chore
 * PUT    /api/chores/:id          — update a chore
 * POST   /api/chores/:id/complete — mark chore done, advance next_due
 * DELETE /api/chores/:id          — archive a chore
 * GET    /api/chores/:id/history  — completion history
 */

const { Router } = require('express');
const { getDb } = require('../db');
const { calcNextDue } = require('../utils');

const router = Router();

// List all active chores
router.get('/', (req, res) => {
  const db = getDb();
  const { assigned_to, room, overdue } = req.query;

  let sql = 'SELECT * FROM chores WHERE archived = 0';
  const params = [];

  if (assigned_to) { sql += ' AND assigned_to = ?'; params.push(assigned_to); }
  if (room) { sql += ' AND room = ?'; params.push(room); }

  sql += ' ORDER BY next_due ASC';
  let chores = db.prepare(sql).all(...params);

  if (overdue === 'true') {
    const today = new Date().toISOString().split('T')[0];
    chores = chores.filter(c => c.next_due && c.next_due < today);
  }

  res.json(chores);
});

// Get one chore
router.get('/:id', (req, res) => {
  const db = getDb();
  const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(req.params.id);
  if (!chore) return res.status(404).json({ error: 'Chore not found' });

  const history = db.prepare(
    'SELECT * FROM chore_log WHERE chore_id = ? ORDER BY done_at DESC LIMIT 10'
  ).all(req.params.id);

  res.json({ ...chore, history });
});

// Create a chore
router.post('/', (req, res) => {
  const db = getDb();
  const { name, description, assigned_to, frequency, custom_days, room, priority } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const next_due = calcNextDue(null, frequency || 'weekly', custom_days);

  const result = db.prepare(`
    INSERT INTO chores (name, description, assigned_to, frequency, custom_days, room, priority, next_due)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    description || '',
    assigned_to || null,
    frequency || 'weekly',
    custom_days || null,
    room || '',
    priority || 'normal',
    next_due
  );

  const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(chore);
});

// Update a chore
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM chores WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Chore not found' });

  const fields = ['name', 'description', 'assigned_to', 'frequency', 'custom_days', 'room', 'priority'];
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
  db.prepare(`UPDATE chores SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(req.params.id);
  res.json(chore);
});

// Complete a chore — logs it and advances next_due
router.post('/:id/complete', (req, res) => {
  const db = getDb();
  const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(req.params.id);
  if (!chore) return res.status(404).json({ error: 'Chore not found' });

  const done_by = req.body.done_by || 'unknown';
  const notes = req.body.notes || '';
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  // Log completion
  db.prepare('INSERT INTO chore_log (chore_id, done_by, done_at, notes) VALUES (?, ?, ?, ?)')
    .run(chore.id, done_by, now, notes);

  // Advance dates
  const next_due = calcNextDue(today, chore.frequency, chore.custom_days);
  db.prepare('UPDATE chores SET last_done = ?, next_due = ? WHERE id = ?')
    .run(today, next_due, chore.id);

  const updated = db.prepare('SELECT * FROM chores WHERE id = ?').get(chore.id);
  res.json({ message: 'Chore completed', chore: updated, next_due });
});

// Archive (soft delete) a chore
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('UPDATE chores SET archived = 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Chore not found' });
  res.json({ message: 'Chore archived' });
});

// Completion history for a chore
router.get('/:id/history', (req, res) => {
  const db = getDb();
  const history = db.prepare(
    'SELECT * FROM chore_log WHERE chore_id = ? ORDER BY done_at DESC LIMIT 50'
  ).all(req.params.id);
  res.json(history);
});

module.exports = router;
