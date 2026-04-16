/**
 * Shared utilities — date math, frequency helpers, HA API calls
 */

const FREQUENCY_DAYS = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

/**
 * Calculate the next due date given a frequency and the date it was last done.
 */
function calcNextDue(lastDone, frequency, customDays) {
  const base = lastDone ? new Date(lastDone) : new Date();
  const days = frequency === 'custom' ? (customDays || 7) : (FREQUENCY_DAYS[frequency] || 7);
  base.setDate(base.getDate() + days);
  return base.toISOString().split('T')[0];
}

/**
 * Check if a date is overdue (before today).
 */
function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

/**
 * Check if a date is due within N days from today.
 */
function isDueSoon(dateStr, days = 3) {
  if (!dateStr) return false;
  const today = new Date();
  const target = new Date(dateStr);
  const diff = (target - today) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

/**
 * Call the Home Assistant REST API via the Supervisor proxy.
 */
async function callHA(endpoint, method = 'GET', body = null) {
  const token = process.env.SUPERVISOR_TOKEN;
  if (!token) return null;

  const url = `http://supervisor/core/api/${endpoint}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HA API ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error(`HA API error (${endpoint}):`, err.message);
    return null;
  }
}

/**
 * Push a sensor state to Home Assistant.
 */
async function setSensor(entityId, state, attributes = {}) {
  return callHA(`states/${entityId}`, 'POST', { state, attributes });
}

/**
 * Send a notification through HA.
 */
async function notify(entity, title, message) {
  const domain = entity.split('.')[0];
  const service = entity.split('.').slice(1).join('.');
  return callHA(`services/${domain}/${service}`, 'POST', {
    title,
    message,
  });
}

module.exports = { calcNextDue, isOverdue, isDueSoon, callHA, setSensor, notify, FREQUENCY_DAYS };
