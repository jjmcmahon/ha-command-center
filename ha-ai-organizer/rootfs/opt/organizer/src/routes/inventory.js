/**
 * Inventory API — track pantry, supplies, consumables
 *
 * GET    /api/inventory           — list items (filter by category, low stock)
 * GET    /api/inventory/:id       — get one item
 * POST   /api/inventory           — add an item
 * PUT    /api/inventory/:id       — update an item
 * POST   /api/inventory/:id/use   — decrement quantity
 * POST   /api/inventory/:id/restock — set new quantity
 * DELETE /api/inventory/:id       — archive an item
 * GET    /api/inventory/shopping-list — auto-generate list from low-stock items
 */

const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// List inventory
router.get('/', (req, res) => {
  const db = getDb();
  const { category, low_stock } = req.query;

  let sql = 'SELECT * FROM inventory WHERE archived = 0';
  const params = [];

  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (low_stock === 'true') { sql += ' AND quantity <= min_quantity AND min_quantity > 0'; }

  sql += ' ORDER BY category, name';
  res.json(db.prepare(sql).all(...params));
});

// Auto-generated shopping list
router.get('/shopping-list', (req, res) => {
  const db = getDb();
  const items = db.prepare(
    'SELECT name, category, quantity, min_quantity, unit FROM inventory WHERE archived = 0 AND quantity <= min_quantity AND min_quantity > 0 ORDER BY category, name'
  ).all();

  const list = items.map(i => ({
    name: i.name,
    category: i.category,
    need: Math.ceil(i.min_quantity * 2 - i.quantity), // restock to 2x minimum
    unit: i.unit,
  }));

  res.json({ count: list.length, items: list });
});

// Get one item
router.get('/:id', (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// Add an item
router.post('/', (req, res) => {
  const db = getDb();
  const { name, category, quantity, unit, min_quantity, location, barcode } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(`
    INSERT INTO inventory (name, category, quantity, unit, min_quantity, location, barcode, last_restocked)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    name,
    category || 'general',
    quantity ?? 1,
    unit || 'each',
    min_quantity ?? 0,
    location || '',
    barcode || ''
  );

  const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

// Update an item
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const fields = ['name', 'category', 'quantity', 'unit', 'min_quantity', 'location', 'barcode'];
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
  db.prepare(`UPDATE inventory SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  res.json(item);
});

// Use (decrement) quantity
router.post('/:id/use', (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const amount = req.body.amount ?? 1;
  const newQty = Math.max(0, item.quantity - amount);

  db.prepare('UPDATE inventory SET quantity = ? WHERE id = ?').run(newQty, item.id);

  const updated = db.prepare('SELECT * FROM inventory WHERE id = ?').get(item.id);
  const isLow = updated.min_quantity > 0 && updated.quantity <= updated.min_quantity;

  res.json({ ...updated, is_low: isLow });
});

// Restock
router.post('/:id/restock', (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const quantity = req.body.quantity ?? item.quantity;
  db.prepare("UPDATE inventory SET quantity = ?, last_restocked = datetime('now') WHERE id = ?")
    .run(quantity, item.id);

  const updated = db.prepare('SELECT * FROM inventory WHERE id = ?').get(item.id);
  res.json(updated);
});

// Archive
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('UPDATE inventory SET archived = 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  res.json({ message: 'Item archived' });
});

module.exports = router;
