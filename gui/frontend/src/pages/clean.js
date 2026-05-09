import { icon } from '../utils/icons.js';

const categories = [
  { name: 'Browser Cache', desc: 'Chrome, Safari, Firefox data', icon: 'wifi', color: 'var(--blue)' },
  { name: 'System Logs', desc: 'Crash reports, diagnostics', icon: 'server', color: 'var(--amber)' },
  { name: 'App Caches', desc: 'Spotify, Slack, Dropbox leftovers', icon: 'monitor', color: 'var(--green)' },
  { name: 'Developer Tools', desc: 'Xcode, npm, Node.js caches', icon: 'cpu', color: 'var(--accent)' },
  { name: 'Trash', desc: 'Empty system trash bin', icon: 'trash', color: 'var(--red)' },
  { name: 'Mail & Downloads', desc: 'Attachments, installers', icon: 'hardDrive', color: 'var(--cyan)' },
];

let cancelLineListener = null;
let cancelDoneListener = null;

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setupStreamListeners(outputEl) {
  // Clean up previous listeners
  if (cancelLineListener) cancelLineListener();
  if (cancelDoneListener) cancelDoneListener();

  // Create the live terminal container
  outputEl.innerHTML = `<div class="terminal-output" id="clean-terminal" style="min-height:60px;"></div>`;
  const terminal = document.getElementById('clean-terminal');

  // Listen for each line
  cancelLineListener = window.runtime.EventsOn('clean:line', (line) => {
    const lineEl = document.createElement('div');
    lineEl.textContent = line;
    terminal.appendChild(lineEl);
    terminal.scrollTop = terminal.scrollHeight;
  });

  cancelDoneListener = window.runtime.EventsOn('clean:done', () => {
    // Done — listeners will be cleaned up on next run
  });
}

function cleanupListeners() {
  if (cancelLineListener) { cancelLineListener(); cancelLineListener = null; }
  if (cancelDoneListener) { cancelDoneListener(); cancelDoneListener = null; }
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
        <div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:8px;">${icon('info',16)} Confirm Cleanup</div>
        <div style="font-size:12px;color:var(--text-2);margin-bottom:12px;">This will permanently delete cached files to free disk space.</div>
        <div style="display:flex;gap:8px;">
          <button class="action-btn action-btn-primary" id="clean-confirm-yes" style="background:var(--red-soft);border-color:var(--red);">${icon('sparkles',15)} Yes, Clean Now</button>
          <button class="action-btn" id="clean-confirm-no">Cancel</button>
        </div>
      </div>
      <div id="clean-output"></div>
    </div>`;

  function setButtons(disabled) {
    document.querySelectorAll('#clean-actions .action-btn').forEach(b => {
      b.disabled = disabled;
      b.style.opacity = disabled ? '0.4' : '1';
      b.style.pointerEvents = disabled ? 'none' : 'auto';
    });
  }

  async function runClean(dryRun) {
    setButtons(true);
    document.getElementById('clean-confirm').style.display = 'none';
    const o = document.getElementById('clean-output');

    // Setup live streaming terminal
    setupStreamListeners(o);

    try {
      await window.go.main.App.RunClean(dryRun);
    } catch(e) {
      const terminal = document.getElementById('clean-terminal');
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

  // Preview
  document.getElementById('clean-preview')?.addEventListener('click', () => {
    document.getElementById('clean-confirm').style.display = 'none';
    runClean(true);
  });

  // Clean Now → show confirm
  document.getElementById('clean-run')?.addEventListener('click', () => {
    document.getElementById('clean-confirm').style.display = 'block';
    document.getElementById('clean-output').innerHTML = '';
  });

  // Cancel
  document.getElementById('clean-confirm-no')?.addEventListener('click', () => {
    document.getElementById('clean-confirm').style.display = 'none';
  });

  // Confirmed → run
  document.getElementById('clean-confirm-yes')?.addEventListener('click', () => {
    runClean(false);
  });
}
