/**
 * HA-AI Home Organizer — Main Server
 *
 * Express REST API + cron-based sensor publishing + notifications.
 * No UI — all data surfaces through HA entities and REST endpoints.
 */

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const { getDb } = require('./db');
const { calcNextDue, isOverdue, isDueSoon, setSensor, notify } = require('./utils');
const { seed } = require('./seed');
const choresRouter = require('./routes/chores');
const inventoryRouter = require('./routes/inventory');
const maintenanceRouter = require('./routes/maintenance');
const tasksRouter = require('./routes/tasks');
const dashboardRouter = require('./routes/dashboard');

const PORT = process.env.INGRESS_PORT || 3100;
const HOUSEHOLD = process.env.HOUSEHOLD_NAME || 'Home';
const NOTIFICATION_ENTITY = process.env.NOTIFICATION_ENTITY || 'notify.mobile_app';
const REMINDER_TIME = process.env.CHORE_REMINDER_TIME || '08:00';
const LOOKAHEAD = parseInt(process.env.MAINTENANCE_LOOKAHEAD_DAYS || '14', 10);
const SENSOR_INTERVAL = parseInt(process.env.SENSOR_UPDATE_INTERVAL_MINUTES || '5', 10);

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', household: HOUSEHOLD, version: '0.1.0' });
});

// Mount routes
app.use('/api/chores', choresRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/dashboard', dashboardRouter);

// ---------- HA Sensor Publishing ----------

async function publishSensors() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  // Chore sensors
  const allChores = db.prepare('SELECT * FROM chores WHERE archived = 0').all();
  const overdueChores = allChores.filter(c => isOverdue(c.next_due));
  const dueSoonChores = allChores.filter(c => isDueSoon(c.next_due, 3));

  await setSensor('sensor.organizer_chores_total', allChores.length, {
    friendly_name: `${HOUSEHOLD} Chores Total`,
    icon: 'mdi:broom',
    unit_of_measurement: 'chores',
  });

  await setSensor('sensor.organizer_chores_overdue', overdueChores.length, {
    friendly_name: `${HOUSEHOLD} Chores Overdue`,
    icon: 'mdi:alert-circle',
    unit_of_measurement: 'chores',
    overdue_list: overdueChores.map(c => ({
      name: c.name,
      assigned_to: c.assigned_to,
      due: c.next_due,
      room: c.room,
    })),
  });

  await setSensor('sensor.organizer_chores_due_soon', dueSoonChores.length, {
    friendly_name: `${HOUSEHOLD} Chores Due Soon`,
    icon: 'mdi:clock-alert',
    unit_of_measurement: 'chores',
    due_list: dueSoonChores.map(c => ({
      name: c.name,
      assigned_to: c.assigned_to,
      due: c.next_due,
    })),
  });

  // Inventory sensors
  const lowItems = db.prepare(
    'SELECT * FROM inventory WHERE archived = 0 AND quantity <= min_quantity AND min_quantity > 0'
  ).all();
  const totalItems = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE archived = 0').get();

  await setSensor('sensor.organizer_inventory_total', totalItems.count, {
    friendly_name: `${HOUSEHOLD} Inventory Items`,
    icon: 'mdi:package-variant',
    unit_of_measurement: 'items',
  });

  await setSensor('sensor.organizer_inventory_low', lowItems.length, {
    friendly_name: `${HOUSEHOLD} Low Stock Items`,
    icon: 'mdi:package-variant-closed-remove',
    unit_of_measurement: 'items',
    low_items: lowItems.map(i => ({
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      min_quantity: i.min_quantity,
      unit: i.unit,
    })),
  });

  // Maintenance sensors
  const allMaint = db.prepare('SELECT * FROM maintenance WHERE archived = 0').all();
  const overdueMaint = allMaint.filter(m => isOverdue(m.next_due));
  const upcomingMaint = allMaint.filter(m => isDueSoon(m.next_due, LOOKAHEAD));

  await setSensor('sensor.organizer_maintenance_overdue', overdueMaint.length, {
    friendly_name: `${HOUSEHOLD} Maintenance Overdue`,
    icon: 'mdi:wrench-clock',
    unit_of_measurement: 'items',
    overdue_list: overdueMaint.map(m => ({
      name: m.name,
      category: m.category,
      due: m.next_due,
    })),
  });

  await setSensor('sensor.organizer_maintenance_upcoming', upcomingMaint.length, {
    friendly_name: `${HOUSEHOLD} Maintenance Upcoming`,
    icon: 'mdi:calendar-wrench',
    unit_of_measurement: 'items',
    upcoming_list: upcomingMaint.map(m => ({
      name: m.name,
      category: m.category,
      due: m.next_due,
      cost_estimate: m.cost_estimate,
    })),
  });

  // Task sensors
  const todoTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'todo'").get();
  const inProgressTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'").get();
  const urgentTasks = db.prepare("SELECT * FROM tasks WHERE priority = 'urgent' AND status != 'done'").all();

  await setSensor('sensor.organizer_tasks_todo', todoTasks.count, {
    friendly_name: `${HOUSEHOLD} Tasks To Do`,
    icon: 'mdi:checkbox-blank-outline',
    unit_of_measurement: 'tasks',
  });

  await setSensor('sensor.organizer_tasks_in_progress', inProgressTasks.count, {
    friendly_name: `${HOUSEHOLD} Tasks In Progress`,
    icon: 'mdi:progress-check',
    unit_of_measurement: 'tasks',
  });

  await setSensor('sensor.organizer_tasks_urgent', urgentTasks.length, {
    friendly_name: `${HOUSEHOLD} Urgent Tasks`,
    icon: 'mdi:alert',
    unit_of_measurement: 'tasks',
    urgent_list: urgentTasks.map(t => ({
      title: t.title,
      assigned_to: t.assigned_to,
      due_date: t.due_date,
    })),
  });

  console.log(`[sensors] Published — chores: ${allChores.length}, overdue: ${overdueChores.length}, low stock: ${lowItems.length}, maint overdue: ${overdueMaint.length}`);
}

// ---------- Cron Jobs ----------

// Publish sensors on interval
cron.schedule(`*/${SENSOR_INTERVAL} * * * *`, () => {
  publishSensors().catch(err => console.error('[sensors] Error:', err.message));
});

// Daily morning reminder
const [reminderH, reminderM] = REMINDER_TIME.split(':');
cron.schedule(`${parseInt(reminderM)} ${parseInt(reminderH)} * * *`, async () => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const overdueChores = db.prepare(
    "SELECT * FROM chores WHERE archived = 0 AND next_due <= ?"
  ).all(today);

  const overdueMaint = db.prepare(
    "SELECT * FROM maintenance WHERE archived = 0 AND next_due <= ?"
  ).all(today);

  const urgentTasks = db.prepare(
    "SELECT * FROM tasks WHERE priority = 'urgent' AND status != 'done'"
  ).all();

  const lines = [];
  if (overdueChores.length > 0) {
    lines.push(`🧹 ${overdueChores.length} overdue chore(s): ${overdueChores.map(c => c.name).join(', ')}`);
  }
  if (overdueMaint.length > 0) {
    lines.push(`🔧 ${overdueMaint.length} overdue maintenance: ${overdueMaint.map(m => m.name).join(', ')}`);
  }
  if (urgentTasks.length > 0) {
    lines.push(`🚨 ${urgentTasks.length} urgent task(s): ${urgentTasks.map(t => t.title).join(', ')}`);
  }

  if (lines.length > 0) {
    await notify(
      NOTIFICATION_ENTITY,
      `${HOUSEHOLD} Home Organizer`,
      lines.join('\n')
    );
    console.log('[notify] Sent morning reminder');
  } else {
    console.log('[notify] All clear — nothing overdue');
  }
});

// ---------- Start ----------

app.listen(PORT, '0.0.0.0', () => {
  // Init database + seed on first run
  getDb();
  seed();
  console.log(`HA-AI Home Organizer v0.1.0 running on port ${PORT}`);
  console.log(`Household: ${HOUSEHOLD}`);
  // Publish sensors on startup
  publishSensors().catch(err => console.error('[sensors] Initial publish error:', err.message));
});
