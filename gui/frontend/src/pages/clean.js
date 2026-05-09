import { icon } from '../utils/icons.js';

const categories = [
  { name: 'Browser Cache', desc: 'Chrome, Safari, Firefox data', icon: 'wifi', color: 'var(--blue)' },
  { name: 'System Logs', desc: 'Crash reports, diagnostics', icon: 'server', color: 'var(--amber)' },
  { name: 'App Caches', desc: 'Spotify, Slack, Dropbox leftovers', icon: 'monitor', color: 'var(--green)' },
  { name: 'Developer Tools', desc: 'Xcode, npm, Node.js caches', icon: 'cpu', color: 'var(--accent)' },
  { name: 'Trash', desc: 'Empty system trash bin', icon: 'trash', color: 'var(--red)' },
  { name: 'Mail & Downloads', desc: 'Attachments, installers', icon: 'hardDrive', color: 'var(--cyan)' },
];

let timerInterval = null;
let confirmState = false;

function startTimer(elementId) {
  const start = Date.now();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const el = document.getElementById(elementId);
    if (!el) { clearInterval(timerInterval); return; }
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    el.textContent = m > 0 ? `${m}m ${s}s elapsed` : `${s}s elapsed`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

export function renderCleanPage(container) {
  const cards = categories.map(c => `
    <div class="category-card">
      <div class="category-icon" style="background:${c.color}15;color:${c.color}">${icon(c.icon, 20)}</div>
      <div class="category-info">
        <div class="category-name">${c.name}</div>
        <div class="category-desc">${c.desc}</div>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <div class="animate-in"><div class="page-header">
      <h1 class="page-title">System Clean</h1>
      <p class="page-subtitle">Remove caches, logs, and leftover files to reclaim disk space</p>
    </div></div>

    <div class="category-grid animate-in animate-in-delay-1">${cards}</div>

    <div class="card animate-in animate-in-delay-2">
      <div class="card-header">
        <span class="card-title">${icon('sparkles',14)} Cleanup</span>
      </div>
      <p style="color:var(--text-2);font-size:12.5px;margin-bottom:16px;line-height:1.6">
        Mole scans all categories above and safely removes unnecessary files. Use preview first to see what will be cleaned.
      </p>
      <div class="quick-actions" id="clean-actions">
        <button class="action-btn" id="clean-preview">${icon('eye',15)} Preview (Dry Run)</button>
        <button class="action-btn action-btn-primary" id="clean-run">${icon('sparkles',15)} Clean Now</button>
      </div>
      <div id="clean-confirm" style="display:none;margin-top:14px;padding:16px;border-radius:var(--r-md);background:var(--red-soft);border:1px solid rgba(251,113,133,0.2);">
        <div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:8px;">⚠ Confirm Cleanup</div>
        <div style="font-size:12px;color:var(--text-2);margin-bottom:12px;">This will permanently delete cached files to free disk space. This action cannot be undone.</div>
        <div style="display:flex;gap:8px;">
          <button class="action-btn action-btn-primary" id="clean-confirm-yes" style="background:var(--red-soft);border-color:var(--red);">${icon('sparkles',15)} Yes, Clean Now</button>
          <button class="action-btn" id="clean-confirm-no">${icon('chevronRight',15)} Cancel</button>
        </div>
      </div>
      <div id="clean-output"></div>
    </div>`;

  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function setButtons(disabled) {
    document.querySelectorAll('#clean-actions .action-btn').forEach(b => {
      b.disabled = disabled;
      b.style.opacity = disabled ? '0.4' : '1';
      b.style.pointerEvents = disabled ? 'none' : 'auto';
    });
  }

  function showProgress(msg) {
    const o = document.getElementById('clean-output');
    o.innerHTML = `<div class="loading-container" style="height:110px">
      <div class="loading-spinner"></div>
      <div class="loading-text">${msg}</div>
      <div id="clean-timer" style="font-size:11px;color:var(--text-3);font-variant-numeric:tabular-nums;">0s elapsed</div>
    </div>`;
    startTimer('clean-timer');
  }

  // Preview button
  document.getElementById('clean-preview')?.addEventListener('click', async () => {
    document.getElementById('clean-confirm').style.display = 'none';
    setButtons(true);
    showProgress('Scanning system — this typically takes 1–2 minutes…');
    const o = document.getElementById('clean-output');
    try {
      const result = await window.go.main.App.RunClean(true);
      stopTimer();
      o.innerHTML = '<div class="terminal-output">' + esc(result) + '</div>';
    } catch(e) {
      stopTimer();
      o.innerHTML = '<div class="terminal-output" style="color:var(--red)">Error: ' + esc(e.toString()) + '</div>';
    } finally {
      setButtons(false);
    }
  });

  // Clean Now button → show inline confirm
  document.getElementById('clean-run')?.addEventListener('click', () => {
    document.getElementById('clean-confirm').style.display = 'block';
    document.getElementById('clean-output').innerHTML = '';
  });

  // Cancel confirm
  document.getElementById('clean-confirm-no')?.addEventListener('click', () => {
    document.getElementById('clean-confirm').style.display = 'none';
  });

  // Actually run clean
  document.getElementById('clean-confirm-yes')?.addEventListener('click', async () => {
    document.getElementById('clean-confirm').style.display = 'none';
    setButtons(true);
    showProgress('Cleaning system — scanning and removing files (2–3 minutes)…');
    const o = document.getElementById('clean-output');
    try {
      const result = await window.go.main.App.RunClean(false);
      stopTimer();
      o.innerHTML = '<div class="terminal-output">' + esc(result) + '</div>';
    } catch(e) {
      stopTimer();
      o.innerHTML = '<div class="terminal-output" style="color:var(--red)">Error: ' + esc(e.toString()) + '</div>';
    } finally {
      setButtons(false);
    }
  });
}
