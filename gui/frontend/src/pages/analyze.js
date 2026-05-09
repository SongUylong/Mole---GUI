import { formatBytes } from '../utils/format.js';
import { icon } from '../utils/icons.js';

let currentPath = '/';
let pathHistory = [];
let showSystemFiles = false;
let lastResult = null;

// Files/dirs that should never be deleted — critical for macOS
const SYSTEM_PATTERNS = [
  // Root level
  'System', 'usr', 'bin', 'sbin', 'etc', 'var', 'tmp', 'private', 'cores',
  '.vol', '.file', '.nofollow', '.resolve', '.VolumeIcon.icns',
  // Home level
  '.CFUserTextEncoding', '.Trash', '.cups', '.ssh', '.gnupg',
  '.zshrc', '.zsh_history', '.zprofile', '.bashrc', '.bash_profile',
  '.gitconfig', '.gitignore_global',
  'Desktop', 'Documents', 'Downloads', 'Movies', 'Music', 'Pictures', 'Public',
];

// Known safe-to-delete patterns
const SAFE_DELETE_PATTERNS = [
  'node_modules', '.npm', '.yarn', '.pnpm-store',
  '.cache', 'Caches', '.gradle', '.m2', '.cocoapods',
  'DerivedData', '__pycache__', '.pytest_cache',
  'build', 'dist', '.next', '.nuxt',
  '.docker', '.vagrant', '.terraform',
];

function isSystemFile(name, path) {
  if (SYSTEM_PATTERNS.includes(name)) return true;
  if (name === '.DS_Store') return true;
  // Root-level critical dirs
  if (path && (path === '/System' || path === '/usr' || path === '/bin' || path === '/sbin' || path === '/private' || path === '/etc' || path === '/var')) return true;
  return false;
}

function isSafeToDelete(name) {
  return SAFE_DELETE_PATTERNS.some(p => name === p || name.toLowerCase() === p.toLowerCase());
}

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
    <div class="bar-fill" style="width:${pct}%;background:${color};"></div>
  </div>`;
}

export function renderAnalyzePage(container) {
  container.innerHTML = `
    <div class="animate-in"><div class="page-header">
      <h1 class="page-title">Disk Analyzer</h1>
      <p class="page-subtitle">Find large files and directories, navigate and delete to reclaim space</p>
    </div></div>

    <div class="card animate-in animate-in-delay-1" style="margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <button class="action-btn" id="analyze-back" style="padding:6px 10px;" disabled>${icon('chevronRight',15)}</button>
        <div id="analyze-path" style="flex:1;font-family:var(--font-mono);font-size:12px;color:var(--text-2);padding:7px 12px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:var(--r-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:text;" contenteditable="false"></div>
        <button class="action-btn" id="analyze-toggle-system" style="padding:6px 10px;" title="Show/hide system files">${icon('eye',15)}</button>
        <button class="action-btn" id="analyze-refresh" style="padding:6px 10px;">${icon('activity',15)}</button>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">
        <span style="font-size:10.5px;color:var(--text-3);margin-right:2px;">Quick:</span>
        <button class="action-btn analyze-quick" data-path="/" style="padding:3px 10px;font-size:11px;">/ Root</button>
        <button class="action-btn analyze-quick" data-path="" style="padding:3px 10px;font-size:11px;">~ Home</button>
        <button class="action-btn analyze-quick" data-path="Library" style="padding:3px 10px;font-size:11px;">Library</button>
        <button class="action-btn analyze-quick" data-path="Applications" style="padding:3px 10px;font-size:11px;">Apps</button>
        <span style="flex:1;"></span>
        <span id="analyze-legend" style="display:flex;gap:10px;font-size:10px;">
          <span style="display:flex;align-items:center;gap:3px;color:var(--text-3);">${icon('shield',10)} Protected</span>
          <span style="display:flex;align-items:center;gap:3px;color:var(--green);">${icon('sparkles',10)} Safe</span>
          <span id="system-toggle-label" style="display:flex;align-items:center;gap:3px;color:var(--text-3);">${icon('eye',10)} Hidden</span>
        </span>
      </div>
      <div id="analyze-content">
        <div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Scanning…</div></div>
      </div>
    </div>`;

  const backBtn = document.getElementById('analyze-back');
  if (backBtn) backBtn.querySelector('svg').style.transform = 'rotate(180deg)';

  updateToggleLabel();
  scanPath('/');

  document.getElementById('analyze-back')?.addEventListener('click', () => {
    if (pathHistory.length > 0) {
      const prev = pathHistory.pop();
      scanPath(prev, false);
    }
  });

  document.getElementById('analyze-refresh')?.addEventListener('click', () => {
    scanPath(currentPath, false);
  });

  document.getElementById('analyze-toggle-system')?.addEventListener('click', () => {
    showSystemFiles = !showSystemFiles;
    updateToggleLabel();
    if (lastResult) {
      const contentEl = document.getElementById('analyze-content');
      if (contentEl) renderEntries(lastResult, contentEl);
    }
  });

  // Quick nav buttons
  document.querySelectorAll('.analyze-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.path;
      pathHistory = [];
      if (p === 'Library') {
        scanPath('~/Library');
      } else if (p === 'Applications') {
        scanPath('/Applications');
      } else {
        scanPath(p);
      }
    });
  });
}

function updateToggleLabel() {
  const label = document.getElementById('system-toggle-label');
  if (label) {
    label.innerHTML = `${icon('eye',10)} ${showSystemFiles ? 'Shown' : 'Hidden'}`;
  }
  const btn = document.getElementById('analyze-toggle-system');
  if (btn) {
    btn.style.borderColor = showSystemFiles ? 'var(--accent)' : 'var(--border-subtle)';
    btn.style.color = showSystemFiles ? 'var(--accent)' : 'var(--text-2)';
  }
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
    lastResult = result;
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

  let entries = [...result.entries].sort((a, b) => b.size - a.size);

  const totalAll = entries.length;
  const hiddenCount = entries.filter(e => isSystemFile(e.name, e.path)).length;
  if (!showSystemFiles) {
    entries = entries.filter(e => !isSystemFile(e.name, e.path));
  }

  const maxSize = entries[0]?.size || 1;
  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
  const shown = entries.slice(0, 100);

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">
        ${entries.length} items · ${formatBytes(totalSize)}
        ${!showSystemFiles && hiddenCount > 0 ? `<span style="opacity:0.5;"> · ${hiddenCount} system hidden</span>` : ''}
      </span>
      <span style="font-size:11px;color:var(--text-3);">Sorted by size</span>
    </div>
    <div id="analyze-list" style="display:flex;flex-direction:column;gap:1px;"></div>
    ${entries.length > 100 ? `<div style="text-align:center;padding:10px;color:var(--text-3);font-size:11px;">Showing top 100 of ${entries.length}</div>` : ''}
  `;

  const list = document.getElementById('analyze-list');

  shown.forEach(entry => {
    const isSys = isSystemFile(entry.name, entry.path);
    const isSafe = isSafeToDelete(entry.name);

    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:var(--r-xs);cursor:default;transition:background 150ms;${isSys ? 'opacity:0.4;' : ''}`;
    row.addEventListener('mouseenter', () => row.style.background = 'rgba(255,255,255,0.03)');
    row.addEventListener('mouseleave', () => row.style.background = 'transparent');

    const iconHtml = entry.is_dir
      ? `<span style="color:${isSys ? 'var(--text-3)' : 'var(--accent)'};flex-shrink:0;">${icon('hardDrive', 14)}</span>`
      : `<span style="color:var(--text-3);flex-shrink:0;">${icon('monitor', 14)}</span>`;

    let badge = '';
    if (isSys) {
      badge = `<span style="flex-shrink:0;font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(255,255,255,0.06);color:var(--text-3);font-weight:600;">SYS</span>`;
    } else if (isSafe) {
      badge = `<span style="flex-shrink:0;font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(74,222,128,0.1);color:var(--green);font-weight:600;">SAFE</span>`;
    }

    const nameSpan = `<span style="flex:1;min-width:0;font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${entry.is_dir && !isSys ? 'color:var(--text-1);cursor:pointer;' : 'color:var(--text-2);'}" title="${entry.path}" ${entry.is_dir ? `data-path="${entry.path}"` : ''}>${entry.name}${entry.is_dir ? '/' : ''}</span>`;

    const barHtml = sizeBar(entry.size, maxSize);
    const sizeSpan = `<span style="flex:0 0 65px;text-align:right;font-size:11px;font-weight:500;font-variant-numeric:tabular-nums;color:${sizeColor(entry.size)};">${formatBytes(entry.size)}</span>`;

    let deleteBtn = '<span style="width:26px;"></span>';
    if (!isSys && entry.size > 0) {
      deleteBtn = `<button class="analyze-delete-btn" data-path="${entry.path}" data-name="${entry.name}" data-size="${entry.size}" style="flex-shrink:0;background:none;border:1px solid var(--border-subtle);border-radius:var(--r-xs);padding:3px 6px;cursor:pointer;color:var(--text-3);transition:all 150ms;display:flex;align-items:center;" title="Delete">${icon('trash', 12)}</button>`;
    } else if (isSys) {
      deleteBtn = `<span style="flex-shrink:0;display:flex;align-items:center;color:var(--text-3);opacity:0.3;">${icon('shield', 12)}</span>`;
    }

    row.innerHTML = iconHtml + nameSpan + badge + barHtml + sizeSpan + deleteBtn;
    list.appendChild(row);

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
      if (!btn.dataset.confirmed) {
        btn.style.borderColor = 'var(--border-subtle)';
        btn.style.color = 'var(--text-3)';
        btn.style.background = 'none';
      }
    });
    btn.addEventListener('click', async () => {
      const path = btn.dataset.path;

      if (!btn.dataset.confirmed) {
        btn.dataset.confirmed = 'true';
        btn.innerHTML = `<span style="font-size:10px;font-weight:600;">Delete?</span>`;
        btn.style.borderColor = 'var(--red)';
        btn.style.color = 'var(--red)';
        btn.style.background = 'var(--red-soft)';
        btn.style.padding = '3px 8px';
        setTimeout(() => {
          if (btn.dataset.confirmed) {
            delete btn.dataset.confirmed;
            btn.innerHTML = icon('trash', 12);
            btn.style.borderColor = 'var(--border-subtle)';
            btn.style.color = 'var(--text-3)';
            btn.style.background = 'none';
            btn.style.padding = '3px 6px';
          }
        }, 3000);
        return;
      }

      btn.innerHTML = `<span style="font-size:10px;">…</span>`;
      try {
        await window.go.main.App.DeletePath(path);
        const row = btn.closest('div');
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        row.style.transition = 'all 300ms';
        setTimeout(() => row.remove(), 300);
      } catch (e) {
        btn.innerHTML = `<span style="font-size:10px;color:var(--red);">Failed</span>`;
        setTimeout(() => {
          delete btn.dataset.confirmed;
          btn.innerHTML = icon('trash', 12);
          btn.style.padding = '3px 6px';
        }, 2000);
      }
    });
  });
}
