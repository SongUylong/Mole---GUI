import { icon } from './utils/icons.js';
import { renderDashboard, startDashboardUpdates, stopDashboardUpdates } from './pages/dashboard.js';
import { renderStatusPage, startStatusUpdates, stopStatusUpdates } from './pages/status.js';
import { renderCleanPage } from './pages/clean.js';
import { renderOptimizePage } from './pages/optimize.js';
import { renderAnalyzePage } from './pages/analyze.js';

let currentPage = 'dashboard';

// Page DOM cache — preserves state across tab switches
const pageCache = {};

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'status',    label: 'Live Status', icon: 'activity' },
  { id: 'clean',     label: 'Clean',       icon: 'sparkles' },
  { id: 'optimize',  label: 'Optimize',    icon: 'zap' },
  { id: 'analyze',   label: 'Analyze',     icon: 'hardDrive' },
];

const pages = {
  dashboard: { render: renderDashboard, start: startDashboardUpdates, stop: stopDashboardUpdates },
  status:    { render: renderStatusPage, start: startStatusUpdates,   stop: stopStatusUpdates },
  clean:     { render: renderCleanPage,  start: null, stop: null },
  optimize:  { render: renderOptimizePage, start: null, stop: null },
  analyze:   { render: renderAnalyzePage,  start: null, stop: null },
};

function renderNav() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = navItems.map(item => `
    <a href="#" class="nav-item ${item.id === currentPage ? 'active' : ''}" data-page="${item.id}" id="nav-${item.id}">
      <span class="nav-icon">${icon(item.icon, 18)}</span>
      <span class="nav-label">${item.label}</span>
    </a>
  `).join('');

  nav.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  });
}

function navigateTo(page) {
  if (currentPage === page) return;

  const content = document.getElementById('content');

  // Stop current page lifecycle
  const current = pages[currentPage];
  if (current?.stop) current.stop();

  // Save current page DOM to cache
  if (content.children.length > 0) {
    const fragment = document.createDocumentFragment();
    while (content.firstChild) {
      fragment.appendChild(content.firstChild);
    }
    pageCache[currentPage] = fragment;
  }

  currentPage = page;
  renderNav();

  // Restore from cache or render fresh
  if (pageCache[page]) {
    content.appendChild(pageCache[page]);
    delete pageCache[page]; // Move back to DOM
  } else {
    const target = pages[page];
    if (target) {
      target.render(content);
    }
  }

  // Start new page lifecycle
  const target = pages[page];
  if (target?.start) target.start();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  const content = document.getElementById('content');
  renderDashboard(content);
  startDashboardUpdates();
});
