/**
 * Tasks API — family task board (one-off to-dos)
 *
 * GET    /api/tasks           — list tasks (filter by status, assigned_to, category)
 * GET    /api/tasks/:id       — get one
 * POST   /api/tasks           — create
 * PUT    /api/tasks/:id       — update
 * POST   /api/tasks/:id/done  — mark complete
 * DELETE /api/tasks/:id       — permanently delete
 */

const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// List tasks
router.get('/', (req, res) => {
  const db = getDb();
  const { status, assigned_to, category, priority } = req.query;

  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (assigned_to) { sql += ' AND assigned_to = ?'; params.push(assigned_to); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (priority) { sql += ' AND priority = ?'; params.push(priority); }

  sql += " ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END, due_date ASC";

  res.json(db.prepare(sql).all(...params));
});

// Get one
router.get('/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// Create
router.post('/', (req, res) => {
  const db = getDb();
  const { title, description, assigned_to, priority, due_date, category } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(`
    INSERT INTO tasks (title, description, assigned_to, priority, due_date, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || '',
    assigned_to || null,
    priority || 'normal',
    due_date || null,
    category || 'general'
  );

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// Update
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const fields = ['title', 'description', 'assigned_to', 'status', 'priority', 'due_date', 'category'];
  const updates = [];
  const params = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }

  // Auto-set completed_at
  if (req.body.status === 'done') {
    updates.push("completed_at = datetime('now')");
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(task);
});

// Mark done
router.post('/:id/done', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare("UPDATE tasks SET status = 'done', completed_at = datetime('now') WHERE id = ?")
    .run(task.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id);
  res.json({ message: 'Task completed', task: updated });
});

// Delete (permanent)
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task deleted' });
});

module.exports = router;
