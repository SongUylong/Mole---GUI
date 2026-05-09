import { icon } from '../utils/icons.js';

const steps = [
  { title: 'Rebuild system databases', desc: 'Clear and regenerate launch services, Spotlight index' },
  { title: 'Reset network services', desc: 'Flush DNS cache, refresh network stack' },
  { title: 'Refresh Finder and Dock', desc: 'Clear icon caches and restart UI services' },
  { title: 'Clean diagnostic logs', desc: 'Remove crash reports and analytics data' },
  { title: 'Clear swap files', desc: 'Remove swap and restart dynamic pager' },
  { title: 'Rebuild Spotlight index', desc: 'Re-index your drive for faster search' },
];

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
      <div class="quick-actions">
        <button class="action-btn" id="opt-preview">${icon('eye',15)} Preview (Dry Run)</button>
        <button class="action-btn action-btn-primary" id="opt-run">${icon('zap',15)} Optimize Now</button>
      </div>
      <div id="opt-output"></div>
    </div>`;

  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const spin = '<div class="loading-container" style="height:80px"><div class="loading-spinner"></div><div class="loading-text">Running…</div></div>';

  document.getElementById('opt-preview')?.addEventListener('click', async () => {
    const o = document.getElementById('opt-output');
    o.innerHTML = spin;
    try { o.innerHTML = '<div class="terminal-output">'+esc(await window.go.main.App.RunOptimize(true))+'</div>'; }
    catch(e) { o.innerHTML = '<div class="terminal-output" style="color:var(--red)">'+esc(e.toString())+'</div>'; }
  });

  document.getElementById('opt-run')?.addEventListener('click', async () => {
    if (!confirm('This will modify system caches and services. Continue?')) return;
    const o = document.getElementById('opt-output');
    o.innerHTML = spin;
    try { o.innerHTML = '<div class="terminal-output">'+esc(await window.go.main.App.RunOptimize(false))+'</div>'; }
    catch(e) { o.innerHTML = '<div class="terminal-output" style="color:var(--red)">'+esc(e.toString())+'</div>'; }
  });
}
