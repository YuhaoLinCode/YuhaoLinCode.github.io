(function () {
  function setActiveNav() {
    const links = Array.from(document.querySelectorAll('.site-nav-link'));
    const sections = Array.from(document.querySelectorAll('[data-section]'));

    if (!links.length || !sections.length) {
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          const id = entry.target.id;
          links.forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
        });
      },
      {
        rootMargin: '-35% 0px -45% 0px',
        threshold: 0.01,
      }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function initMobileNav() {
    const toggle = document.getElementById('nav-toggle');
    const panel = document.getElementById('nav-panel');
    if (!toggle || !panel) {
      return;
    }

    const setOpen = function (open) {
      panel.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };

    toggle.addEventListener('click', function () {
      const isOpen = panel.classList.contains('is-open');
      setOpen(!isOpen);
    });

    document.addEventListener('click', function (event) {
      if (!panel.classList.contains('is-open')) {
        return;
      }

      if (panel.contains(event.target) || toggle.contains(event.target)) {
        return;
      }

      setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    });

    document.addEventListener('click', function (event) {
      const target = event.target.closest('.site-nav-link');
      if (!target) {
        return;
      }
      setOpen(false);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
  });

  document.addEventListener('homepage:content-ready', function () {
    setActiveNav();
  });
})();
