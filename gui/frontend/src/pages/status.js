import { formatBytes, getPercentColor, formatTemp, formatRate } from '../utils/format.js';
import { icon } from '../utils/icons.js';

let updateInterval = null;

function coreBar(idx, pct, color) {
  return `
    <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;">
      <span style="color:var(--text-3);width:46px;font-variant-numeric:tabular-nums;">Core ${idx+1}</span>
      <div class="bar-container" style="flex:1;"><div class="bar-fill" style="width:${pct}%;background:${color};color:${color};"></div></div>
      <span style="color:${color};width:38px;text-align:right;font-weight:500;font-variant-numeric:tabular-nums;">${pct.toFixed(0)}%</span>
    </div>`;
}

export function renderStatusPage(container) {
  container.innerHTML = `
    <div class="animate-in">
      <div class="page-header">
        <h1 class="page-title">Live Status</h1>
        <p class="page-subtitle">Real-time system performance monitoring</p>
      </div>
    </div>
    <div id="status-content">
      <div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Starting live monitoring…</div></div>
    </div>`;
  fetchStatus();
}

async function fetchStatus() {
  try {
    const s = await window.go.main.App.GetSystemStatus();
    render(s);
  } catch (err) {
    const el = document.getElementById('status-content');
    if (el) el.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--text-2);">Error: ${err}</div>`;
  }
}

function render(s) {
  const el = document.getElementById('status-content');
  if (!el) return;

  const cores = (s.cpu.per_core || []).map((p, i) => coreBar(i, p, getPercentColor(p))).join('');

  const netRows = (s.network || []).filter(n => n.rx_rate_mbs > 0 || n.tx_rate_mbs > 0).map(n => `
    <div class="info-row">
      <span class="info-label">${icon('wifi', 13)} ${n.name}${n.ip ? ' · ' + n.ip : ''}</span>
      <span class="info-value">${icon('arrowDown', 12)} ${formatRate(n.rx_rate_mbs)} ${icon('arrowUp', 12)} ${formatRate(n.tx_rate_mbs)}</span>
    </div>`).join('') || '<div style="color:var(--text-3);font-size:11px;">No active interfaces</div>';

  const btRows = (s.bluetooth || []).map(b => `
    <div class="info-row">
      <span class="info-label">${icon('bluetooth', 13)} ${b.name}</span>
      <span class="info-value">${b.connected ? '<span style="color:var(--green)">Connected</span>' : '<span style="color:var(--text-3)">Disconnected</span>'} ${b.battery || ''}</span>
    </div>`).join('') || '<div style="color:var(--text-3);font-size:11px;">No devices</div>';

  el.innerHTML = `
    <div class="grid-2" style="margin-bottom:14px;">
      <div class="card">
        <div class="card-header">
          <span class="card-title">${icon('cpu', 14)} CPU · ${s.cpu.usage.toFixed(1)}%</span>
          <span style="font-size:10.5px;color:var(--text-3);">${s.cpu.logical_cpu} logical</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;">${cores}</div>
        <div style="margin-top:10px;font-size:10.5px;color:var(--text-3);">
          Load: ${s.cpu.load1.toFixed(2)} / ${s.cpu.load5.toFixed(2)} / ${s.cpu.load15.toFixed(2)}
          ${s.cpu.p_core_count ? ` · ${s.cpu.p_core_count}P + ${s.cpu.e_core_count}E` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">${icon('memoryStick', 14)} Memory · ${s.memory.used_percent.toFixed(1)}%</span>
          ${s.memory.pressure ? `<span class="badge ${s.memory.pressure === 'normal' ? 'badge-success' : s.memory.pressure === 'warn' ? 'badge-warning' : 'badge-danger'}">${s.memory.pressure}</span>` : ''}
        </div>
        <div class="bar-container" style="height:8px;margin-bottom:14px;">
          <div class="bar-fill" style="width:${s.memory.used_percent}%;background:${getPercentColor(s.memory.used_percent)};color:${getPercentColor(s.memory.used_percent)};"></div>
        </div>
        <div class="info-list">
          <div class="info-row"><span class="info-label">Used</span><span class="info-value">${formatBytes(s.memory.used)}</span></div>
          <div class="info-row"><span class="info-label">Total</span><span class="info-value">${formatBytes(s.memory.total)}</span></div>
          <div class="info-row"><span class="info-label">Cached</span><span class="info-value">${formatBytes(s.memory.cached || 0)}</span></div>
          <div class="info-row"><span class="info-label">Swap</span><span class="info-value">${formatBytes(s.memory.swap_used)} / ${formatBytes(s.memory.swap_total)}</span></div>
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:14px;">
      <div class="card">
        <div class="card-header">
          <span class="card-title">${icon('hardDrive', 14)} Disk</span>
          <span class="card-icon">${icon('gauge', 14)}</span>
        </div>
        <div class="info-list">
          ${(s.disks || []).map(d => `
            <div style="margin-bottom:8px;">
              <div class="info-row">
                <span class="info-label">${d.mount} <span style="color:var(--text-3);">(${d.fstype})</span></span>
                <span class="info-value" style="color:${getPercentColor(d.used_percent)}">${d.used_percent.toFixed(1)}%</span>
              </div>
              <div class="bar-container"><div class="bar-fill" style="width:${d.used_percent}%;background:${getPercentColor(d.used_percent)};color:${getPercentColor(d.used_percent)};"></div></div>
              <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--text-3);margin-top:3px;">
                <span>${formatBytes(d.used)} used</span><span>${formatBytes(d.total - d.used)} free</span>
              </div>
            </div>`).join('')}
          <div class="info-row" style="margin-top:4px;">
            <span class="info-label">${icon('arrowDown', 13)} Read</span>
            <span class="info-value">${formatRate(s.disk_io?.read_rate || 0)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${icon('arrowUp', 13)} Write</span>
            <span class="info-value">${formatRate(s.disk_io?.write_rate || 0)}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">${icon('wifi', 14)} Network</span>
          <span class="card-icon">${icon('activity', 14)}</span>
        </div>
        <div class="info-list">
          ${netRows}
          ${s.proxy?.enabled ? `<div class="info-row" style="margin-top:6px;"><span class="info-label">Proxy</span><span class="info-value">${s.proxy.type} · ${s.proxy.host}</span></div>` : ''}
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">${icon('thermometer', 14)} Thermal & Power</span>
          <span class="card-icon">${icon('power', 14)}</span>
        </div>
        <div class="info-list">
          ${s.thermal?.cpu_temp > 0 ? `<div class="info-row"><span class="info-label">${icon('cpu', 13)} CPU Temp</span><span class="info-value" style="color:${s.thermal.cpu_temp > 80 ? 'var(--red)' : s.thermal.cpu_temp > 60 ? 'var(--amber)' : 'var(--green)'}">${formatTemp(s.thermal.cpu_temp)}</span></div>` : ''}
          ${s.thermal?.fan_speed > 0 ? `<div class="info-row"><span class="info-label">${icon('fan', 13)} Fan</span><span class="info-value">${s.thermal.fan_speed} RPM</span></div>` : ''}
          ${s.batteries?.length > 0 ? `
            <div class="info-row"><span class="info-label">${icon('battery', 13)} Battery</span><span class="info-value">${s.batteries[0].percent.toFixed(0)}% · ${s.batteries[0].status}</span></div>
            <div class="info-row"><span class="info-label">Cycles</span><span class="info-value">${s.batteries[0].cycle_count}</span></div>
            <div class="info-row"><span class="info-label">Health</span><span class="info-value">${s.batteries[0].health || '—'}</span></div>
          ` : ''}
          ${s.thermal?.system_power > 0 ? `<div class="info-row"><span class="info-label">${icon('zap', 13)} Power</span><span class="info-value">${s.thermal.system_power.toFixed(1)}W</span></div>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">${icon('bluetooth', 14)} Bluetooth</span>
        </div>
        <div class="info-list">${btRows}</div>
      </div>
    </div>`;
}

export function startStatusUpdates() { updateInterval = setInterval(fetchStatus, 2000); }
export function stopStatusUpdates() { if (updateInterval) { clearInterval(updateInterval); updateInterval = null; } }
