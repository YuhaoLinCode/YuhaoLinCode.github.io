(function () {
  const root = document.documentElement;

  function applyTheme(mode) {
    const isDark = mode === 'dark';
    root.classList.toggle('theme-dark', isDark);
    document.body.classList.toggle('dark', isDark);
    document.dispatchEvent(
      new CustomEvent('homepage:theme-change', {
        detail: { mode: isDark ? 'dark' : 'light' },
      })
    );

    const toggle = document.getElementById('theme-toggle');
    const label = document.getElementById('theme-toggle-label');
    const icon = document.getElementById('theme-toggle-icon');

    if (toggle) {
      toggle.setAttribute('aria-pressed', String(isDark));
      toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    if (label) {
      label.textContent = isDark ? 'Light' : 'Dark';
    }
    if (icon) {
      icon.textContent = isDark ? '☼' : '◐';
    }
  }

  function toggleTheme() {
    const nextMode = document.body.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(nextMode);
    try { localStorage.setItem('theme_choice', nextMode); } catch (_) {}
  }

  // Priority 1: first visit → light (default, do nothing)
  // Priority 2: user has explicit choice → apply it
  // Priority 3: return visit, no choice → follow system
  var visited = null, choice = null;
  try {
    visited = localStorage.getItem('theme_visited');
    choice = localStorage.getItem('theme_choice');
  } catch (_) {}

  if (!visited) {
    // First visit: mark as visited, stay in light mode
    try { localStorage.setItem('theme_visited', '1'); } catch (_) {}
  } else if (choice) {
    applyTheme(choice);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  }

  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', toggleTheme);
    }
  });
})();
