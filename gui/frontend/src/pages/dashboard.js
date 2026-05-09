import { formatBytes, getPercentColor, getHealthColor, formatTemp, formatRate } from '../utils/format.js';
import { icon } from '../utils/icons.js';

let updateInterval = null;
let isFirstLoad = true;

function ring(size, sw, pct, color, label, sub) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, o = c - (pct / 100) * c;
  const lg = size > 120;
  return `<div class="${lg?'health-ring':'gauge'}" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}">
      <circle class="${lg?'health-ring-bg':'gauge-bg'}" cx="${size/2}" cy="${size/2}" r="${r}"/>
      <circle class="${lg?'health-ring-progress':'gauge-progress'}" cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}" style="color:${color}" stroke-dasharray="${c}" stroke-dashoffset="${o}"/>
    </svg>
    <div class="${lg?'health-ring-label':'gauge-label'}">
      <div class="${lg?'health-score-value':'gauge-value'}" style="color:${color}">${label}</div>
      ${sub?`<div class="${lg?'health-score-unit':'gauge-suffix'}">${sub}</div>`:''}
    </div></div>`;
}

export function renderDashboard(container) {
  container.innerHTML = `
    <div class="animate-in"><div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">System overview and quick actions</p>
    </div></div>
    <div id="dashboard-content">
      <div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Collecting system metrics…</div></div>
    </div>`;
  fetchAndRender();
}

async function fetchAndRender() {
  try {
    const s = await window.go.main.App.GetSystemStatus();
    render(s); isFirstLoad = false;
  } catch (err) {
    const el = document.getElementById('dashboard-content');
    if (el) el.innerHTML = `<div class="card" style="text-align:center;padding:48px">
      <div style="margin-bottom:14px;color:var(--text-3)">${icon('info',40)}</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">Unable to connect to Mole CLI</div>
      <div style="color:var(--text-2);font-size:12px">Make sure <code style="background:var(--bg-elevated);padding:2px 6px;border-radius:4px;font-family:var(--font-mono)">mo</code> is installed and in your PATH.</div>
      <div style="color:var(--text-3);font-size:11px;margin-top:10px;font-family:var(--font-mono)">${err}</div></div>`;
  }
}

function render(s) {
  const el = document.getElementById('dashboard-content');
  if (!el) return;

  const hc = getHealthColor(s.health_score);
  const hl = s.health_score >= 90 ? 'Excellent' : s.health_score >= 75 ? 'Good' : s.health_score >= 60 ? 'Fair' : s.health_score >= 40 ? 'Poor' : 'Critical';
  const cc = getPercentColor(s.cpu.usage);
  const mc = getPercentColor(s.memory.used_percent);
  const dp = s.disks?.[0]?.used_percent || 0;
  const dc = getPercentColor(dp);
  const df = s.disks?.[0] ? formatBytes(s.disks[0].total - s.disks[0].used) : '—';
  const dt = s.disks?.[0] ? formatBytes(s.disks[0].total) : '—';
  const d = isFirstLoad ? 'animate-in animate-in-delay-' : '';

  el.innerHTML = `
    <!-- Stat Bar -->
    <div class="stat-bar ${d?d+'1':''}">
      <div class="stat-item">
        <div class="stat-label">${icon('cpu',13)} CPU</div>
        <div class="stat-value" style="color:${cc}">${s.cpu.usage.toFixed(1)}%</div>
        <div class="stat-sub">Load ${s.cpu.load1.toFixed(2)} · ${s.cpu.core_count} cores</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">${icon('memoryStick',13)} Memory</div>
        <div class="stat-value" style="color:${mc}">${s.memory.used_percent.toFixed(1)}%</div>
        <div class="stat-sub">${formatBytes(s.memory.used)} of ${formatBytes(s.memory.total)}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">${icon('hardDrive',13)} Disk</div>
        <div class="stat-value" style="color:${dc}">${dp.toFixed(1)}%</div>
        <div class="stat-sub">${df} free of ${dt}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">${icon('activity',13)} Health</div>
        <div class="stat-value" style="color:${hc}">${s.health_score}</div>
        <div class="stat-sub">${hl}</div>
      </div>
    </div>

    <!-- Health + Gauges Row -->
    <div class="grid-2 ${d?d+'2':''}" style="margin-bottom:14px">
      <div class="card">
        <div class="health-ring-container">
          ${ring(130, 7, s.health_score, hc, s.health_score, 'Health')}
          <div class="health-info">
            <div class="health-status" style="color:${hc}">${hl}</div>
            <div class="health-message">${s.health_score_msg || 'System is running smoothly.'}</div>
            <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              ${s.health_score >= 80 ? '<span class="badge badge-success">Healthy</span>'
                : s.health_score >= 60 ? '<span class="badge badge-warning">Needs Attention</span>'
                : '<span class="badge badge-danger">Critical</span>'}
              <span class="badge badge-muted">${s.uptime} uptime</span>
              ${s.batteries?.[0] ? `<span class="badge badge-muted">${s.batteries[0].percent.toFixed(0)}% battery</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="display:flex;align-items:center;justify-content:space-around">
        <div class="gauge-container">
          ${ring(90, 5, s.cpu.usage, cc, s.cpu.usage.toFixed(0), '%')}
          <div class="gauge-title">CPU</div>
        </div>
        <div class="gauge-container">
          ${ring(90, 5, s.memory.used_percent, mc, s.memory.used_percent.toFixed(0), '%')}
          <div class="gauge-title">Memory</div>
        </div>
        <div class="gauge-container">
          ${ring(90, 5, dp, dc, dp.toFixed(0), '%')}
          <div class="gauge-title">Disk</div>
        </div>
      </div>
    </div>

    <!-- Info + Processes -->
    <div class="grid-2 ${d?d+'3':''}" style="margin-bottom:14px">
      <div class="card">
        <div class="card-header">
          <span class="card-title">${icon('monitor',14)} System Info</span>
        </div>
        <div class="info-list">
          <div class="info-row"><span class="info-label">${icon('monitor',13)} Model</span><span class="info-value">${s.hardware?.model || s.host || '—'}</span></div>
          <div class="info-row"><span class="info-label">${icon('cpu',13)} Chip</span><span class="info-value">${s.hardware?.cpu_model || '—'}</span></div>
          <div class="info-row"><span class="info-label">${icon('shield',13)} OS</span><span class="info-value">${s.hardware?.os_version || s.platform || '—'}</span></div>
          <div class="info-row"><span class="info-label">${icon('memoryStick',13)} RAM</span><span class="info-value">${s.hardware?.total_ram || formatBytes(s.memory.total)}</span></div>
          ${s.thermal?.cpu_temp > 0 ? `<div class="info-row"><span class="info-label">${icon('thermometer',13)} Temp</span><span class="info-value" style="color:${s.thermal.cpu_temp>80?'var(--red)':'var(--text-1)'}">${formatTemp(s.thermal.cpu_temp)}</span></div>` : ''}
          <div class="info-row"><span class="info-label">${icon('hardDrive',13)} Disk I/O</span><span class="info-value">${icon('arrowDown',11)} ${formatRate(s.disk_io?.read_rate||0)}  ${icon('arrowUp',11)} ${formatRate(s.disk_io?.write_rate||0)}</span></div>
          ${s.batteries?.[0] ? `<div class="info-row"><span class="info-label">${icon('battery',13)} Battery</span><span class="info-value">${s.batteries[0].percent.toFixed(0)}% · ${s.batteries[0].status} · ${s.batteries[0].cycle_count} cycles</span></div>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">${icon('server',14)} Top Processes</span>
        </div>
        ${s.top_processes?.length > 0 ? `
          <table class="process-table"><thead><tr><th>Process</th><th style="text-align:right">CPU</th><th style="text-align:right">MEM</th></tr></thead><tbody>
          ${s.top_processes.slice(0,5).map(p => `<tr><td class="process-name">${p.name}</td><td style="text-align:right;color:${getPercentColor(p.cpu)}">${p.cpu.toFixed(1)}%</td><td style="text-align:right">${p.memory.toFixed(1)}%</td></tr>`).join('')}
          </tbody></table>` : '<div style="color:var(--text-3);text-align:center;padding:24px;font-size:12px">No process data</div>'}
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card ${d?d+'4':''}">
      <div class="card-header">
        <span class="card-title">${icon('rocket',14)} Quick Actions</span>
      </div>
      <div class="quick-actions">
        <button class="action-btn action-btn-primary" id="action-clean">${icon('sparkles',15)} Clean System</button>
        <button class="action-btn action-btn-primary" id="action-optimize">${icon('zap',15)} Optimize</button>
        <button class="action-btn" id="action-preview">${icon('eye',15)} Preview Clean</button>
      </div>
    </div>`;

  document.getElementById('action-preview')?.addEventListener('click', async () => {
    try { const r = await window.go.main.App.RunClean(true); alert('Preview:\n\n'+r); }
    catch(e) { alert('Error: '+e); }
  });
}

export function startDashboardUpdates() { isFirstLoad = true; updateInterval = setInterval(fetchAndRender, 2000); }
export function stopDashboardUpdates() { if (updateInterval) { clearInterval(updateInterval); updateInterval = null; } }
