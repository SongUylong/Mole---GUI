import { formatBytes } from '../utils/format.js';
import { icon } from '../utils/icons.js';

let currentPath = '';
let pathHistory = [];

function sizeColor(bytes) {
  if (bytes >= 1e9) return 'var(--red)';
  if (bytes >= 100e6) return 'var(--amber)';
  if (bytes >= 10e6) return 'var(--blue)';
  return 'var(--text-2)';
}

function sizeBar(bytes, maxBytes) {
  const pct = maxBytes > 0 ? Math.min((bytes / maxBytes) * 100, 100) : 0;
  const color = sizeColor(bytes);
  return `<div class="bar-container" style="flex:1;margin:0;">
    <div class="bar-fill" style="width:${pct}%;background:${color};color:${color};"></div>
  </div>`;
}

export function renderAnalyzePage(container) {
  container.innerHTML = `
    <div class="animate-in"><div class="page-header">
      <h1 class="page-title">Disk Analyzer</h1>
      <p class="page-subtitle">Find large files and directories, navigate and delete to reclaim space</p>
    </div></div>

    <div class="card animate-in animate-in-delay-1" style="margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <button class="action-btn" id="analyze-back" style="padding:6px 10px;" disabled>${icon('chevronRight',15)}</button>
        <button class="action-btn" id="analyze-home" style="padding:6px 10px;">${icon('hardDrive',15)}</button>
        <div id="analyze-path" style="flex:1;font-family:var(--font-mono);font-size:12px;color:var(--text-2);padding:7px 12px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:var(--r-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div>
        <button class="action-btn" id="analyze-refresh" style="padding:6px 10px;">${icon('activity',15)}</button>
      </div>
      <div id="analyze-content">
        <div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Scanning…</div></div>
      </div>
    </div>`;

  // Style the back button to flip the chevron
  const backBtn = document.getElementById('analyze-back');
  if (backBtn) backBtn.querySelector('svg').style.transform = 'rotate(180deg)';

  // Start scan
  scanPath('');

  document.getElementById('analyze-back')?.addEventListener('click', () => {
    if (pathHistory.length > 0) {
      const prev = pathHistory.pop();
      scanPath(prev, false);
    }
  });

  document.getElementById('analyze-home')?.addEventListener('click', () => {
    pathHistory = [];
    scanPath('');
  });

  document.getElementById('analyze-refresh')?.addEventListener('click', () => {
    scanPath(currentPath, false);
  });
}

async function scanPath(path, pushHistory = true) {
  if (pushHistory && currentPath) {
    pathHistory.push(currentPath);
  }
  currentPath = path;

  const pathEl = document.getElementById('analyze-path');
  const contentEl = document.getElementById('analyze-content');
  const backBtn = document.getElementById('analyze-back');
  if (!contentEl) return;

  if (pathEl) pathEl.textContent = path || '~ (Home)';
  if (backBtn) backBtn.disabled = pathHistory.length === 0;

  contentEl.innerHTML = '<div class="loading-container" style="height:120px;"><div class="loading-spinner"></div><div class="loading-text">Scanning directory…</div></div>';

  try {
    const result = await window.go.main.App.GetDiskAnalysis(path);
    renderEntries(result, contentEl);
  } catch (e) {
    contentEl.innerHTML = `<div style="padding:24px;text-align:center;color:var(--red);font-size:12.5px;">${icon('info',20)}<br><br>${e.toString()}</div>`;
  }
}

function renderEntries(result, container) {
  if (!result || !result.entries || result.entries.length === 0) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-3);font-size:12.5px;">Empty directory</div>';
    return;
  }

  // Sort by size descending
  const entries = [...result.entries].sort((a, b) => b.size - a.size);
  const maxSize = entries[0]?.size || 1;
  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

  // Show top entries (limit to prevent huge DOM)
  const shown = entries.slice(0, 100);

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">
        ${entries.length} items · ${formatBytes(totalSize)} total
      </span>
      <span style="font-size:11px;color:var(--text-3);">Sorted by size</span>
    </div>
    <div id="analyze-list" style="display:flex;flex-direction:column;gap:2px;"></div>
    ${entries.length > 100 ? `<div style="text-align:center;padding:12px;color:var(--text-3);font-size:11px;">Showing top 100 of ${entries.length} items</div>` : ''}
  `;

  const list = document.getElementById('analyze-list');

  shown.forEach(entry => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:var(--r-xs);cursor:default;transition:background 150ms;';
    row.addEventListener('mouseenter', () => row.style.background = 'rgba(255,255,255,0.03)');
    row.addEventListener('mouseleave', () => row.style.background = 'transparent');

    const iconHtml = entry.is_dir
      ? `<span style="color:var(--accent);flex-shrink:0;">${icon('hardDrive', 15)}</span>`
      : `<span style="color:var(--text-3);flex-shrink:0;">${icon('monitor', 15)}</span>`;

    const nameSpan = `<span style="flex:0 0 200px;font-size:12.5px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${entry.is_dir ? 'color:var(--text-1);cursor:pointer;' : 'color:var(--text-2);'}" title="${entry.path}" ${entry.is_dir ? `data-path="${entry.path}"` : ''}>${entry.name}${entry.is_dir ? '/' : ''}</span>`;

    const barHtml = sizeBar(entry.size, maxSize);
    const sizeSpan = `<span style="flex:0 0 70px;text-align:right;font-size:11.5px;font-weight:500;font-variant-numeric:tabular-nums;color:${sizeColor(entry.size)};">${formatBytes(entry.size)}</span>`;

    const deleteBtn = entry.size > 0
      ? `<button class="analyze-delete-btn" data-path="${entry.path}" data-name="${entry.name}" data-size="${entry.size}" style="flex-shrink:0;background:none;border:1px solid var(--border-subtle);border-radius:var(--r-xs);padding:3px 6px;cursor:pointer;color:var(--text-3);transition:all 150ms;display:flex;align-items:center;" title="Delete">${icon('trash', 13)}</button>`
      : '<span style="width:28px;"></span>';

    row.innerHTML = iconHtml + nameSpan + barHtml + sizeSpan + deleteBtn;
    list.appendChild(row);

    // Directory click to drill down
    if (entry.is_dir) {
      const nameEl = row.querySelector('[data-path]');
      if (nameEl) {
        nameEl.addEventListener('click', () => scanPath(entry.path));
      }
    }
  });

  // Delete buttons
  list.querySelectorAll('.analyze-delete-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = 'var(--red)';
      btn.style.color = 'var(--red)';
      btn.style.background = 'var(--red-soft)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = 'var(--border-subtle)';
      btn.style.color = 'var(--text-3)';
      btn.style.background = 'none';
    });
    btn.addEventListener('click', async () => {
      const path = btn.dataset.path;
      const name = btn.dataset.name;
      const size = parseInt(btn.dataset.size);

      // Inline confirm - change button to confirm state
      if (!btn.dataset.confirmed) {
        btn.dataset.confirmed = 'true';
        btn.innerHTML = `<span style="font-size:10px;font-weight:600;">Delete?</span>`;
        btn.style.borderColor = 'var(--red)';
        btn.style.color = 'var(--red)';
        btn.style.background = 'var(--red-soft)';
        btn.style.padding = '3px 8px';
        // Reset after 3 seconds
        setTimeout(() => {
          if (btn.dataset.confirmed) {
            delete btn.dataset.confirmed;
            btn.innerHTML = icon('trash', 13);
            btn.style.borderColor = 'var(--border-subtle)';
            btn.style.color = 'var(--text-3)';
            btn.style.background = 'none';
            btn.style.padding = '3px 6px';
          }
        }, 3000);
        return;
      }

      // Actually delete
      btn.innerHTML = `<span style="font-size:10px;">…</span>`;
      try {
        await window.go.main.App.DeletePath(path);
        // Remove the row with animation
        const row = btn.closest('div');
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        row.style.transition = 'all 300ms';
        setTimeout(() => row.remove(), 300);
      } catch (e) {
        btn.innerHTML = `<span style="font-size:10px;color:var(--red);">Failed</span>`;
        setTimeout(() => {
          delete btn.dataset.confirmed;
          btn.innerHTML = icon('trash', 13);
          btn.style.padding = '3px 6px';
        }, 2000);
      }
    });
  });
}
