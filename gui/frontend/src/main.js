import { icon } from './utils/icons.js';
import { renderDashboard, startDashboardUpdates, stopDashboardUpdates } from './pages/dashboard.js';
import { renderStatusPage, startStatusUpdates, stopStatusUpdates } from './pages/status.js';
import { renderCleanPage } from './pages/clean.js';
import { renderOptimizePage } from './pages/optimize.js';

let currentPage = 'dashboard';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'status',    label: 'Live Status', icon: 'activity' },
  { id: 'clean',     label: 'Clean',       icon: 'sparkles' },
  { id: 'optimize',  label: 'Optimize',    icon: 'zap' },
];

const pages = {
  dashboard: { render: renderDashboard, start: startDashboardUpdates, stop: stopDashboardUpdates },
  status:    { render: renderStatusPage, start: startStatusUpdates,   stop: stopStatusUpdates },
  clean:     { render: renderCleanPage,  start: null, stop: null },
  optimize:  { render: renderOptimizePage, start: null, stop: null },
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

  // Stop current page
  const current = pages[currentPage];
  if (current?.stop) current.stop();

  currentPage = page;
  renderNav();

  // Render new page
  const target = pages[page];
  if (target) {
    const content = document.getElementById('content');
    content.innerHTML = '';
    target.render(content);
    if (target.start) target.start();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderNav();

  const content = document.getElementById('content');
  renderDashboard(content);
  startDashboardUpdates();
});
