import { icon } from '../utils/icons.js';

const steps = [
  { title: 'Rebuild system databases', desc: 'Clear and regenerate launch services, Spotlight index' },
  { title: 'Reset network services', desc: 'Flush DNS cache, refresh network stack' },
  { title: 'Refresh Finder and Dock', desc: 'Clear icon caches and restart UI services' },
  { title: 'Clean diagnostic logs', desc: 'Remove crash reports and analytics data' },
  { title: 'Clear swap files', desc: 'Remove swap and restart dynamic pager' },
  { title: 'Rebuild Spotlight index', desc: 'Re-index your drive for faster search' },
];

let timerInterval = null;

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

export function renderOptimizePage(container) {
  const stepHTML = steps.map((s, i) => `
    <div class="step-item">
      <div class="step-num">${i + 1}</div>
      <div class="step-text"><strong>${s.title}</strong> — ${s.desc}</div>
    </div>`).join('');

  container.innerHTML = `
    <div class="animate-in"><div class="page-header">
      <h1 class="page-title">Optimize</h1>
      <p class="page-subtitle">Rebuild caches, refresh services, and tune system performance</p>
    </div></div>

    <div class="step-list animate-in animate-in-delay-1">${stepHTML}</div>

    <div class="card animate-in animate-in-delay-2">
      <div class="card-header">
        <span class="card-title">${icon('zap',14)} Optimization</span>
      </div>
      <p style="color:var(--text-2);font-size:12.5px;margin-bottom:16px;line-height:1.6">
        Run all optimization steps above. Use preview to see what will change without modifying anything.
      </p>
      <div class="quick-actions" id="opt-actions">
        <button class="action-btn" id="opt-preview">${icon('eye',15)} Preview (Dry Run)</button>
        <button class="action-btn action-btn-primary" id="opt-run">${icon('zap',15)} Optimize Now</button>
      </div>
      <div id="opt-confirm" style="display:none;margin-top:14px;padding:16px;border-radius:var(--r-md);background:var(--amber-soft);border:1px solid rgba(251,191,36,0.2);">
        <div style="font-size:13px;font-weight:600;color:var(--amber);margin-bottom:8px;">⚠ Confirm Optimization</div>
        <div style="font-size:12px;color:var(--text-2);margin-bottom:12px;">This will modify system caches and restart services.</div>
        <div style="display:flex;gap:8px;">
          <button class="action-btn action-btn-primary" id="opt-confirm-yes">${icon('zap',15)} Yes, Optimize</button>
          <button class="action-btn" id="opt-confirm-no">${icon('chevronRight',15)} Cancel</button>
        </div>
      </div>
      <div id="opt-output"></div>
    </div>`;

  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function setButtons(disabled) {
    document.querySelectorAll('#opt-actions .action-btn').forEach(b => {
      b.disabled = disabled;
      b.style.opacity = disabled ? '0.4' : '1';
      b.style.pointerEvents = disabled ? 'none' : 'auto';
    });
  }

  function showProgress(msg) {
    const o = document.getElementById('opt-output');
    o.innerHTML = `<div class="loading-container" style="height:110px">
      <div class="loading-spinner"></div>
      <div class="loading-text">${msg}</div>
      <div id="opt-timer" style="font-size:11px;color:var(--text-3);font-variant-numeric:tabular-nums;">0s elapsed</div>
    </div>`;
    startTimer('opt-timer');
  }

  document.getElementById('opt-preview')?.addEventListener('click', async () => {
    document.getElementById('opt-confirm').style.display = 'none';
    setButtons(true);
    showProgress('Checking optimizations…');
    const o = document.getElementById('opt-output');
    try {
      const result = await window.go.main.App.RunOptimize(true);
      stopTimer();
      o.innerHTML = '<div class="terminal-output">' + esc(result) + '</div>';
    } catch(e) {
      stopTimer();
      o.innerHTML = '<div class="terminal-output" style="color:var(--red)">Error: ' + esc(e.toString()) + '</div>';
    } finally {
      setButtons(false);
    }
  });

  document.getElementById('opt-run')?.addEventListener('click', () => {
    document.getElementById('opt-confirm').style.display = 'block';
    document.getElementById('opt-output').innerHTML = '';
  });

  document.getElementById('opt-confirm-no')?.addEventListener('click', () => {
    document.getElementById('opt-confirm').style.display = 'none';
  });

  document.getElementById('opt-confirm-yes')?.addEventListener('click', async () => {
    document.getElementById('opt-confirm').style.display = 'none';
    setButtons(true);
    showProgress('Optimizing system — this may take a minute…');
    const o = document.getElementById('opt-output');
    try {
      const result = await window.go.main.App.RunOptimize(false);
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
