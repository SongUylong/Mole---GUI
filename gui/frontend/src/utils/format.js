/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format a percentage to one decimal.
 * @param {number} pct
 * @returns {string}
 */
export function formatPercent(pct) {
  return `${pct.toFixed(1)}%`;
}

/**
 * Format uptime seconds to human-readable.
 * @param {number} secs
 * @returns {string}
 */
export function formatUptime(secs) {
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Get color for a percentage value.
 * @param {number} pct - 0 to 100
 * @returns {string} CSS color
 */
export function getPercentColor(pct) {
  if (pct >= 85) return 'var(--accent-danger)';
  if (pct >= 65) return 'var(--accent-warning)';
  return 'var(--accent-success)';
}

/**
 * Get color for health score (inverted — higher is better).
 * @param {number} score - 0 to 100
 * @returns {string} CSS color
 */
export function getHealthColor(score) {
  if (score >= 80) return 'var(--accent-success)';
  if (score >= 60) return 'var(--accent-warning)';
  return 'var(--accent-danger)';
}

/**
 * Format MB/s rate.
 * @param {number} rate
 * @returns {string}
 */
export function formatRate(rate) {
  if (rate >= 1024) return `${(rate / 1024).toFixed(1)} GB/s`;
  if (rate >= 1) return `${rate.toFixed(1)} MB/s`;
  return `${(rate * 1024).toFixed(0)} KB/s`;
}

/**
 * Format temperature.
 * @param {number} temp - Celsius
 * @returns {string}
 */
export function formatTemp(temp) {
  if (temp <= 0) return '—';
  return `${temp.toFixed(0)}°C`;
}
