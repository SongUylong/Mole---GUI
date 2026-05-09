import { icon } from '../utils/icons.js';

const categories = [
  { name: 'Browser Cache', desc: 'Chrome, Safari, Firefox data', icon: 'wifi', color: 'var(--blue)' },
  { name: 'System Logs', desc: 'Crash reports, diagnostics', icon: 'server', color: 'var(--amber)' },
  { name: 'App Caches', desc: 'Spotify, Slack, Dropbox leftovers', icon: 'monitor', color: 'var(--green)' },
  { name: 'Developer Tools', desc: 'Xcode, npm, Node.js caches', icon: 'cpu', color: 'var(--accent)' },
  { name: 'Trash', desc: 'Empty system trash bin', icon: 'trash', color: 'var(--red)' },
  { name: 'Mail & Downloads', desc: 'Attachments, installers', icon: 'hardDrive', color: 'var(--cyan)' },
];

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
        Mole scans all categories above and safely removes unnecessary files. Use preview to inspect what will be cleaned before deleting.
      </p>
      <div class="quick-actions">
        <button class="action-btn" id="clean-preview">${icon('eye',15)} Preview (Dry Run)</button>
        <button class="action-btn action-btn-primary" id="clean-run">${icon('sparkles',15)} Clean Now</button>
      </div>
      <div id="clean-output"></div>
    </div>`;

  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const spin = '<div class="loading-container" style="height:80px"><div class="loading-spinner"></div><div class="loading-text">Scanning…</div></div>';

  document.getElementById('clean-preview')?.addEventListener('click', async () => {
    const o = document.getElementById('clean-output');
    o.innerHTML = spin;
    try { o.innerHTML = '<div class="terminal-output">'+esc(await window.go.main.App.RunClean(true))+'</div>'; }
    catch(e) { o.innerHTML = '<div class="terminal-output" style="color:var(--red)">'+esc(e.toString())+'</div>'; }
  });

  document.getElementById('clean-run')?.addEventListener('click', async () => {
    if (!confirm('This will permanently delete files. Continue?')) return;
    const o = document.getElementById('clean-output');
    o.innerHTML = spin.replace('Scanning','Cleaning');
    try { o.innerHTML = '<div class="terminal-output">'+esc(await window.go.main.App.RunClean(false))+'</div>'; }
    catch(e) { o.innerHTML = '<div class="terminal-output" style="color:var(--red)">'+esc(e.toString())+'</div>'; }
  });
}
