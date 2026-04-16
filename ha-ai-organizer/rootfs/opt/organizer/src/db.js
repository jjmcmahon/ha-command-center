/**
 * SQLite database — persisted in /data so it survives add-on updates.
 * Tables: chores, inventory, maintenance, tasks, chore_log
 */

const Database = require('better-sqlite3');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_PATH = path.join(DATA_DIR, 'organizer.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function migrate(db) {
  db.exec(`
    -- Chores: recurring household tasks
    CREATE TABLE IF NOT EXISTS chores (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      assigned_to TEXT DEFAULT NULL,
      frequency   TEXT NOT NULL DEFAULT 'weekly',  -- daily | weekly | biweekly | monthly | custom
      custom_days INTEGER DEFAULT NULL,             -- if frequency = custom, interval in days
      room        TEXT DEFAULT '',
      priority    TEXT DEFAULT 'normal',            -- low | normal | high
      last_done   TEXT DEFAULT NULL,                -- ISO date
      next_due    TEXT DEFAULT NULL,                -- ISO date
      created_at  TEXT DEFAULT (datetime('now')),
      archived    INTEGER DEFAULT 0
    );

    -- Chore completion log
    CREATE TABLE IF NOT EXISTS chore_log (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      chore_id  INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
      done_by   TEXT NOT NULL,
      done_at   TEXT DEFAULT (datetime('now')),
      notes     TEXT DEFAULT ''
    );

    -- Inventory: pantry, supplies, consumables
    CREATE TABLE IF NOT EXISTS inventory (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      category      TEXT DEFAULT 'general',  -- pantry | cleaning | bathroom | office | general
      quantity       REAL DEFAULT 1,
      unit          TEXT DEFAULT 'each',     -- each | oz | lb | gal | pack | roll
      min_quantity  REAL DEFAULT 0,          -- alert when quantity <= min
      location      TEXT DEFAULT '',
      barcode       TEXT DEFAULT '',
      last_restocked TEXT DEFAULT NULL,
      created_at    TEXT DEFAULT (datetime('now')),
      archived      INTEGER DEFAULT 0
    );

    -- Maintenance: home maintenance schedules
    CREATE TABLE IF NOT EXISTS maintenance (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      description   TEXT DEFAULT '',
      category      TEXT DEFAULT 'general',  -- hvac | plumbing | electrical | exterior | appliance | general
      frequency     TEXT NOT NULL DEFAULT 'monthly',
      custom_days   INTEGER DEFAULT NULL,
      last_done     TEXT DEFAULT NULL,
      next_due      TEXT DEFAULT NULL,
      cost_estimate REAL DEFAULT 0,
      vendor        TEXT DEFAULT '',
      notes         TEXT DEFAULT '',
      created_at    TEXT DEFAULT (datetime('now')),
      archived      INTEGER DEFAULT 0
    );

    -- Family tasks: one-off tasks / to-do board
    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      assigned_to TEXT DEFAULT NULL,
      status      TEXT DEFAULT 'todo',      -- todo | in_progress | done
      priority    TEXT DEFAULT 'normal',    -- low | normal | high | urgent
      due_date    TEXT DEFAULT NULL,
      category    TEXT DEFAULT 'general',   -- errand | shopping | project | school | work | general
      created_at  TEXT DEFAULT (datetime('now')),
      completed_at TEXT DEFAULT NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_chores_next_due ON chores(next_due);
    CREATE INDEX IF NOT EXISTS idx_chores_assigned ON chores(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
    CREATE INDEX IF NOT EXISTS idx_inventory_low ON inventory(quantity, min_quantity);
    CREATE INDEX IF NOT EXISTS idx_maintenance_next_due ON maintenance(next_due);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
  `);
}

module.exports = { getDb };
