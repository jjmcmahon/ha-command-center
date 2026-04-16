/**
 * Dashboard API — aggregated summary for HA template sensors or automations
 *
 * GET /api/dashboard/summary  — full household overview
 * GET /api/dashboard/stats    — compact stats for HA REST sensor
 */

const { Router } = require('express');
const { getDb } = require('../db');
const { isOverdue, isDueSoon } = require('../utils');

const router = Router();

// Full summary
router.get('/summary', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  // Chores
  const chores = db.prepare('SELECT * FROM chores WHERE archived = 0').all();
  const overdueChores = chores.filter(c => isOverdue(c.next_due));
  const dueTodayChores = chores.filter(c => c.next_due === today);

  // Inventory
  const lowStock = db.prepare(
    'SELECT * FROM inventory WHERE archived = 0 AND quantity <= min_quantity AND min_quantity > 0'
  ).all();

  // Maintenance
  const maint = db.prepare('SELECT * FROM maintenance WHERE archived = 0').all();
  const overdueMaint = maint.filter(m => isOverdue(m.next_due));
  const upcomingMaint = maint.filter(m => isDueSoon(m.next_due, 14));

  // Tasks
  const todoTasks = db.prepare("SELECT * FROM tasks WHERE status = 'todo'").all();
  const urgentTasks = db.prepare("SELECT * FROM tasks WHERE priority = 'urgent' AND status != 'done'").all();

  res.json({
    household: process.env.HOUSEHOLD_NAME || 'Home',
    timestamp: new Date().toISOString(),
    chores: {
      total: chores.length,
      overdue: overdueChores.length,
      due_today: dueTodayChores.length,
      overdue_list: overdueChores.map(c => ({ id: c.id, name: c.name, assigned_to: c.assigned_to, due: c.next_due })),
    },
    inventory: {
      low_stock_count: lowStock.length,
      low_items: lowStock.map(i => ({ id: i.id, name: i.name, category: i.category, quantity: i.quantity, min: i.min_quantity })),
    },
    maintenance: {
      overdue: overdueMaint.length,
      upcoming: upcomingMaint.length,
      overdue_list: overdueMaint.map(m => ({ id: m.id, name: m.name, category: m.category, due: m.next_due })),
      upcoming_list: upcomingMaint.map(m => ({ id: m.id, name: m.name, due: m.next_due, cost: m.cost_estimate })),
    },
    tasks: {
      todo: todoTasks.length,
      urgent: urgentTasks.length,
      urgent_list: urgentTasks.map(t => ({ id: t.id, title: t.title, assigned_to: t.assigned_to })),
    },
  });
});

// Compact stats (good for REST sensor)
router.get('/stats', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const choresOverdue = db.prepare(
    "SELECT COUNT(*) as count FROM chores WHERE archived = 0 AND next_due < ?"
  ).get(today).count;

  const lowStock = db.prepare(
    'SELECT COUNT(*) as count FROM inventory WHERE archived = 0 AND quantity <= min_quantity AND min_quantity > 0'
  ).get().count;

  const maintOverdue = db.prepare(
    "SELECT COUNT(*) as count FROM maintenance WHERE archived = 0 AND next_due < ?"
  ).get(today).count;

  const tasksTodo = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'todo'").get().count;
  const tasksUrgent = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE priority = 'urgent' AND status != 'done'").get().count;

  const score = Math.max(0, 100 - (choresOverdue * 5) - (lowStock * 3) - (maintOverdue * 10) - (tasksUrgent * 8));

  res.json({
    chores_overdue: choresOverdue,
    low_stock: lowStock,
    maintenance_overdue: maintOverdue,
    tasks_todo: tasksTodo,
    tasks_urgent: tasksUrgent,
    household_score: score, // 0-100 "home health" score
  });
});

module.exports = router;
