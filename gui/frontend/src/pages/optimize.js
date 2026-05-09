import { icon } from '../utils/icons.js';

const steps = [
  { title: 'Rebuild system databases', desc: 'Clear and regenerate launch services, Spotlight index' },
  { title: 'Reset network services', desc: 'Flush DNS cache, refresh network stack' },
  { title: 'Refresh Finder and Dock', desc: 'Clear icon caches and restart UI services' },
  { title: 'Clean diagnostic logs', desc: 'Remove crash reports and analytics data' },
  { title: 'Clear swap files', desc: 'Remove swap and restart dynamic pager' },
  { title: 'Rebuild Spotlight index', desc: 'Re-index your drive for faster search' },
];

let cancelLineListener = null;
let cancelDoneListener = null;

function setupStreamListeners(outputEl) {
  if (cancelLineListener) cancelLineListener();
  if (cancelDoneListener) cancelDoneListener();

  outputEl.innerHTML = `<div class="terminal-output" id="opt-terminal" style="min-height:60px;"></div>`;
  const terminal = document.getElementById('opt-terminal');

  cancelLineListener = window.runtime.EventsOn('optimize:line', (line) => {
    const lineEl = document.createElement('div');
    lineEl.textContent = line;
    terminal.appendChild(lineEl);
    terminal.scrollTop = terminal.scrollHeight;
  });

  cancelDoneListener = window.runtime.EventsOn('optimize:done', () => {});
}

function cleanupListeners() {
  if (cancelLineListener) { cancelLineListener(); cancelLineListener = null; }
  if (cancelDoneListener) { cancelDoneListener(); cancelDoneListener = null; }
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
        <div style="font-size:13px;font-weight:600;color:var(--amber);margin-bottom:8px;">${icon('info',16)} Confirm Optimization</div>
        <div style="font-size:12px;color:var(--text-2);margin-bottom:12px;">This will modify system caches and restart services.</div>
        <div style="display:flex;gap:8px;">
          <button class="action-btn action-btn-primary" id="opt-confirm-yes">${icon('zap',15)} Yes, Optimize</button>
          <button class="action-btn" id="opt-confirm-no">Cancel</button>
        </div>
      </div>
      <div id="opt-output"></div>
    </div>`;

  function setButtons(disabled) {
    document.querySelectorAll('#opt-actions .action-btn').forEach(b => {
      b.disabled = disabled;
      b.style.opacity = disabled ? '0.4' : '1';
      b.style.pointerEvents = disabled ? 'none' : 'auto';
    });
  }

  async function runOpt(dryRun) {
    setButtons(true);
    document.getElementById('opt-confirm').style.display = 'none';
    const o = document.getElementById('opt-output');
    setupStreamListeners(o);
    try {
      await window.go.main.App.RunOptimize(dryRun);
    } catch(e) {
      const terminal = document.getElementById('opt-terminal');
      if (terminal) {
        const errLine = document.createElement('div');
        errLine.style.color = 'var(--red)';
        errLine.textContent = 'Error: ' + e.toString();
        terminal.appendChild(errLine);
      }
    } finally {
      cleanupListeners();
      setButtons(false);
    }
  }

  document.getElementById('opt-preview')?.addEventListener('click', () => {
    document.getElementById('opt-confirm').style.display = 'none';
    runOpt(true);
  });

  document.getElementById('opt-run')?.addEventListener('click', () => {
    document.getElementById('opt-confirm').style.display = 'block';
    document.getElementById('opt-output').innerHTML = '';
  });

  document.getElementById('opt-confirm-no')?.addEventListener('click', () => {
    document.getElementById('opt-confirm').style.display = 'none';
  });

  document.getElementById('opt-confirm-yes')?.addEventListener('click', () => {
    runOpt(false);
  });
}
