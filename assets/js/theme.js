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
  }

  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', toggleTheme);
    }
  });
})();
