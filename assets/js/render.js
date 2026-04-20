(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function setText(id, value) {
    const element = byId(id);
    if (!element) {
      return;
    }

    if (value) {
      element.hidden = false;
      element.textContent = value;
      return;
    }

    element.hidden = true;
    element.textContent = '';
  }

  function isExternalLink(href) {
    return /^(https?:)?\/\//.test(href || '');
  }

  function createLink(label, href, className) {
    const link = document.createElement('a');
    const targetHref = href || '#';

    link.className = className;
    link.textContent = label;
    link.href = targetHref;

    if (isExternalLink(targetHref)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }

    return link;
  }

  function createMedia(mediaClassName, entry, fallbackLabel, imageAlt) {
    const media = document.createElement('div');
    media.className = mediaClassName;

    if (fallbackLabel) {
      const badge = document.createElement('span');
      badge.className = 'publication-media-badge';
      badge.textContent = fallbackLabel;
      media.appendChild(badge);
    }

    if (entry && entry.image) {
      const image = document.createElement('img');
      image.src = entry.image;
      image.alt = imageAlt || fallbackLabel || 'Preview image';
      image.className = 'pub-poster';
      media.appendChild(image);
    }

    if (entry && entry.video) {
      const video = document.createElement('video');
      video.src = entry.video;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'none';
      video.className = 'pub-video';
      if (entry.image) {
        video.poster = entry.image;
      }
      video.setAttribute('aria-label', imageAlt || fallbackLabel || 'Publication preview');
      media.appendChild(video);
      return media;
    }

    if (!entry || (!entry.image && !entry.video)) {
      media.textContent = fallbackLabel || 'Preview';
    }

    return media;
  }

  async function loadYaml(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error('Failed to load ' + path);
    }

    const raw = await response.text();
    return window.jsyaml.load(raw) || {};
  }

  function showStatus(message) {
    const banner = byId('page-status');
    if (!banner) {
      return;
    }

    banner.textContent = message;
    banner.hidden = false;
  }

  function hideStatus() {
    const banner = byId('page-status');
    if (!banner) {
      return;
    }

    banner.hidden = true;
    banner.textContent = '';
  }

  function renderNavigation(site) {
    const container = byId('site-nav-links');
    if (!container) {
      return;
    }

    container.textContent = '';

    toArray(site.navigation).forEach(function (item) {
      if (!item || !item.id || !item.label) {
        return;
      }

      const link = document.createElement('a');
      link.className = 'site-nav-link';
      link.href = '#' + item.id;
      link.textContent = item.label;
      container.appendChild(link);
    });
  }

  function createBackgroundController(root, hero) {
    const controls = byId('hero-background-controls');
    const bgA = document.getElementById('hero-bg-a');
    const bgB = document.getElementById('hero-bg-b');
    if (!controls || !bgA || !bgB) {
      return;
    }

    function normalizeEntries(list) {
      return toArray(list).map(function (item) {
        if (typeof item === 'string') {
          return { src: item };
        }
        return { src: item.src || item.image || '', position: item.position || '', size: item.size || '' };
      });
    }

    const backgroundSets = {
      light: normalizeEntries(hero.backgrounds && hero.backgrounds.light),
      dark: normalizeEntries(hero.backgrounds && hero.backgrounds.dark),
    };
    const fallbackImage = hero.image || '';
    const activeIndices = { light: 0, dark: 0 };
    let currentLayer = 'a';
    let dotButtons = [];
    let dotPill = null;
    let pillReady = false;
    let autoTimer = null;
    const AUTO_INTERVAL = 12000;

    function getMode() {
      return root.classList.contains('theme-dark') ? 'dark' : 'light';
    }

    function getEntries(mode) {
      const entries = backgroundSets[mode];
      if (entries.length) {
        return entries;
      }
      return fallbackImage ? [{ src: fallbackImage }] : [];
    }

    function resolveUrl(src) {
      return new URL(src, window.location.href).href;
    }

    function setLayerBg(layer, entry) {
      layer.style.backgroundImage = 'url("' + resolveUrl(entry.src) + '")';
      layer.style.backgroundPosition = entry.position || 'center center';
      layer.style.backgroundSize = entry.size || '100% auto';
    }

    function movePillTo(idx) {
      if (!dotPill || !dotButtons[idx] || !pillReady) {
        return;
      }
      const btn = dotButtons[idx];
      const btnRect = btn.getBoundingClientRect();
      const containerRect = controls.getBoundingClientRect();
      const center = btnRect.left + btnRect.width / 2 - containerRect.left;
      const pillW = dotPill.offsetWidth || 18;
      dotPill.style.left = (center - pillW / 2) + 'px';
    }

    function applyBackground(mode, direction) {
      const entries = getEntries(mode);
      if (!entries.length) {
        return;
      }
      const idx = Math.min(activeIndices[mode], entries.length - 1);
      activeIndices[mode] = idx;

      const activeLayer = currentLayer === 'a' ? bgA : bgB;
      const nextLayer = currentLayer === 'a' ? bgB : bgA;

      setLayerBg(nextLayer, entries[idx]);

      const startX = direction >= 0 ? '100%' : '-100%';
      const endX = direction >= 0 ? '-100%' : '100%';

      nextLayer.style.transition = 'none';
      nextLayer.style.transform = 'translateX(' + startX + ')';
      nextLayer.getBoundingClientRect(); // force reflow

      const trans = 'transform 520ms cubic-bezier(0.4, 0, 0.2, 1)';
      activeLayer.style.transition = trans;
      nextLayer.style.transition = trans;
      activeLayer.style.transform = 'translateX(' + endX + ')';
      nextLayer.style.transform = 'translateX(0)';

      currentLayer = currentLayer === 'a' ? 'b' : 'a';

      dotButtons.forEach(function (btn, i) {
        btn.setAttribute('aria-pressed', String(i === idx));
      });
      movePillTo(idx);
    }

    function renderDots(mode) {
      controls.textContent = '';
      dotButtons = [];
      dotPill = null;
      pillReady = false;

      const entries = getEntries(mode);
      if (entries.length < 2) {
        controls.hidden = true;
        return;
      }
      controls.hidden = false;

      entries.forEach(function (_, index) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hero-background-dot';
        btn.setAttribute('aria-label', 'Show background ' + (index + 1));
        btn.setAttribute('aria-pressed', String(index === activeIndices[mode]));
        btn.addEventListener('click', function () {
          if (index === activeIndices[mode]) {
            return;
          }
          const dir = index > activeIndices[mode] ? 1 : -1;
          activeIndices[mode] = index;
          applyBackground(mode, dir);
          resetAuto();
        });
        controls.appendChild(btn);
        dotButtons.push(btn);
      });

      dotPill = document.createElement('span');
      dotPill.className = 'dot-pill';
      controls.appendChild(dotPill);

      requestAnimationFrame(function () {
        movePillTo(activeIndices[mode]);
        pillReady = true;
        requestAnimationFrame(function () {
          if (dotPill) {
            dotPill.style.transition = 'left 400ms cubic-bezier(0.4, 0, 0.2, 1)';
          }
        });
      });
    }

    function advance() {
      const mode = getMode();
      const entries = getEntries(mode);
      if (entries.length < 2) {
        return;
      }
      const nextIdx = (activeIndices[mode] + 1) % entries.length;
      activeIndices[mode] = nextIdx;
      applyBackground(mode, 1);
    }

    function startAuto() {
      if (autoTimer) {
        return;
      }
      autoTimer = setInterval(advance, AUTO_INTERVAL);
    }

    function resetAuto() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
      }
      startAuto();
    }

    // Init: set bgA to first image, bgB off-screen right
    const initMode = getMode();
    const initEntries = getEntries(initMode);
    if (initEntries.length) {
      setLayerBg(bgA, initEntries[0]);
      bgA.style.transform = 'translateX(0)';
      bgB.style.transform = 'translateX(100%)';
    }

    renderDots(initMode);
    startAuto();

    document.addEventListener('homepage:theme-change', function (event) {
      const mode = (event.detail && event.detail.mode) || getMode();
      const entries = getEntries(mode);
      if (!entries.length) {
        return;
      }
      const idx = Math.min(activeIndices[mode], entries.length - 1);
      activeIndices[mode] = idx;
      const activeLayer = currentLayer === 'a' ? bgA : bgB;
      activeLayer.style.transition = 'none';
      setLayerBg(activeLayer, entries[idx]);
      renderDots(mode);
    });
  }

  function renderHero(site) {
    const hero = site.hero || {};
    const root = document.documentElement;
    const name = site.name || 'Your Name';
    const title = site.title || '';
    const affiliation = site.affiliation ? ' · ' + site.affiliation : '';

    document.title = name;
    setText('brand-text', name);
    setText('hero-eyebrow', hero.eyebrow);
    setText('hero-name', name);
    setText('hero-role', title + affiliation);

    createBackgroundController(root, hero);

    const avatar = byId('hero-avatar');
    if (avatar && hero.avatar) {
      avatar.src = hero.avatar;
      avatar.alt = name + ' portrait';
    }

    const actionRow = byId('hero-actions');
    if (actionRow) {
      actionRow.textContent = '';
      const links = toArray(hero.actions).concat(toArray(hero.socials));
      links.forEach(function (item) {
        if (!item || !item.label) {
          return;
        }

        const variant = item.variant === 'primary' ? 'primary' : 'secondary';
        actionRow.appendChild(createLink(item.label, item.href, 'button-link ' + variant));
      });
    }
  }

  function renderAbout(site) {
    const about = site.about || {};
    setText('about-heading', about.heading);

    const body = byId('about-body');
    if (body) {
      body.textContent = '';
      toArray(about.paragraphs).forEach(function (paragraph) {
        const p = document.createElement('p');
        appendLinkedText(p, paragraph);
        body.appendChild(p);
      });
    }

    const interestList = byId('interest-list');
    if (interestList) {
      interestList.textContent = '';
      toArray(about.interests).forEach(function (interest) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = interest;
        interestList.appendChild(chip);
      });
    }
  }

  function appendLinkedText(element, text) {
    const source = text || '';
    const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let lastIndex = 0;
    let match = pattern.exec(source);

    while (match) {
      if (match.index > lastIndex) {
        element.appendChild(document.createTextNode(source.slice(lastIndex, match.index)));
      }

      element.appendChild(createLink(match[1], match[2], 'inline-link'));
      lastIndex = pattern.lastIndex;
      match = pattern.exec(source);
    }

    if (lastIndex < source.length) {
      element.appendChild(document.createTextNode(source.slice(lastIndex)));
    }
  }

  function renderAuthors(element, text, selfName, authorLinks) {
    const tokens = (text || '').split(', ');
    const links = authorLinks || {};

    tokens.forEach(function (token, i) {
      if (i > 0) {
        element.appendChild(document.createTextNode(', '));
      }

      const hasStar = token.endsWith('*');
      const name = hasStar ? token.slice(0, -1) : token;

      if (name === selfName) {
        const mark = document.createElement('strong');
        mark.className = 'author-highlight';
        mark.textContent = name;
        element.appendChild(mark);
      } else if (links[name]) {
        element.appendChild(createLink(name, links[name], 'author-link'));
      } else {
        element.appendChild(document.createTextNode(name));
      }

      if (hasStar) {
        element.appendChild(document.createTextNode('*'));
      }
    });
  }

  function createPublicationItem(entry, authorLinks) {
    const item = document.createElement('li');
    item.className = 'publication-item' + (entry.selected ? ' is-selected' : '');

    const shortVenue = entry.short_venue || entry.conference_short || '';
    const venueName = entry.venue || entry.conference;

    item.appendChild(
      createMedia(
        'publication-media',
        entry,
        '',
        (entry.title || 'Publication') + ' preview'
      )
    );

    const content = document.createElement('div');
    content.className = 'publication-content';

    const topline = document.createElement('div');
    topline.className = 'publication-topline';

    const title = document.createElement('h3');
    title.className = 'publication-title';

    const titleLink = document.createElement(entry.abs || entry.page || entry.pdf || entry.code ? 'a' : 'span');
    titleLink.textContent = entry.title || 'Untitled publication';
    if (titleLink.tagName === 'A') {
      titleLink.href = entry.abs || entry.page || entry.pdf || entry.code;
      if (isExternalLink(titleLink.href)) {
        titleLink.target = '_blank';
        titleLink.rel = 'noopener noreferrer';
      }
    }
    title.appendChild(titleLink);
    topline.appendChild(title);

    const authors = document.createElement('p');
    authors.className = 'publication-authors';
    renderAuthors(authors, entry.authors, 'Yuhao Lin', authorLinks);

    const venue = document.createElement('p');
    venue.className = 'publication-venue';
    if (shortVenue) {
      const shortVenueBadge = document.createElement('span');
      shortVenueBadge.className = 'publication-venue-badge';
      shortVenueBadge.textContent = shortVenue;
      venue.appendChild(shortVenueBadge);
    }
    const venueText = venueName || '';
    if (venueText) {
      venue.appendChild(document.createTextNode((shortVenue ? ' ' : '') + venueText));
    }

    content.appendChild(topline);
    if (authors.textContent) {
      content.appendChild(authors);
    }
    if (venue.textContent) {
      content.appendChild(venue);
    }

    if (entry.summary) {
      const summary = document.createElement('p');
      summary.className = 'publication-summary';
      summary.textContent = entry.summary;
      content.appendChild(summary);
    }

    const actionItems = [
      ['PDF', entry.pdf],
      ['Code', entry.code],
      ['Project', entry.page],
      ['BibTeX', entry.bibtex],
    ].filter(function (pair) {
      return Boolean(pair[1]);
    });

    if (actionItems.length) {
      const actions = document.createElement('div');
      actions.className = 'publication-actions';
      actionItems.forEach(function (pair) {
        actions.appendChild(createLink(pair[0], pair[1], 'publication-action'));
      });
      content.appendChild(actions);
    }

    item.appendChild(content);
    return item;
  }

  function renderPublications(site, publications) {
    const meta = site.publications || {};
    setText('publications-heading', meta.heading);

    const container = byId('publication-groups');
    if (!container) {
      return;
    }

    container.textContent = '';
    const order = ['conference', 'workshop', 'journal', 'preprint'];
    const entries = order.reduce(function (items, key) {
      return items.concat(toArray(publications[key]));
    }, []);

    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Add publication entries in data/publications.yml.';
      container.appendChild(empty);
      return;
    }

    const authorLinks = site.author_links || {};
    const list = document.createElement('ol');
    list.className = 'publication-list publication-list-plain';

    entries.forEach(function (entry) {
      list.appendChild(createPublicationItem(entry, authorLinks));
    });

    container.appendChild(list);
  }

  function renderHonors(site) {
    const honors = site.honors || {};
    setText('honors-heading', honors.heading);

    const list = byId('honor-list');
    if (!list) {
      return;
    }

    list.textContent = '';
    const items = toArray(honors.items);

    if (!items.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'Add honors in data/site.yml.';
      list.appendChild(empty);
      return;
    }

    items.forEach(function (item) {
      const row = document.createElement('li');
      row.className = 'honor-item';

      const title = document.createElement('p');
      title.className = 'honor-title';
      title.textContent = item.title || 'Honor';

      if (item.detail) {
        const detail = document.createElement('span');
        detail.className = 'honor-detail';
        detail.textContent = item.detail;
        title.appendChild(detail);
      }

      row.appendChild(title);
      list.appendChild(row);
    });
  }

  function renderFooter(site) {
    setText('footer-title', site.name);
    setText('footer-note', site.footer_note);
    setText('footer-copy', site.footer_copy);

    const links = byId('footer-links');
    if (!links) {
      return;
    }

    links.textContent = '';
    toArray(site.footer_links).forEach(function (item) {
      if (!item || !item.label) {
        return;
      }

      links.appendChild(createLink(item.label, item.href, 'social-chip'));
    });
  }

  function initVideoAutoplay() {
    const items = Array.from(document.querySelectorAll('.publication-item'));
    const videoItems = items.filter(function (item) {
      return item.querySelector('.pub-video');
    });
    if (!videoItems.length) {
      return;
    }

    let currentItem = null;

    function playItem(item) {
      if (currentItem === item) {
        return;
      }
      if (currentItem) {
        const prevVideo = currentItem.querySelector('.pub-video');
        const prevMedia = currentItem.querySelector('.publication-media');
        if (prevVideo) {
          prevVideo.pause();
          prevVideo.currentTime = 0;
        }
        if (prevMedia) {
          prevMedia.classList.remove('is-playing');
        }
        currentItem = null;
      }
      const video = item.querySelector('.pub-video');
      const media = item.querySelector('.publication-media');
      if (video && media) {
        media.classList.add('is-playing');
        video.play().catch(function () {});
        currentItem = item;
      }
    }

    function pauseAll() {
      if (!currentItem) {
        return;
      }
      const prevVideo = currentItem.querySelector('.pub-video');
      const prevMedia = currentItem.querySelector('.publication-media');
      if (prevVideo) {
        prevVideo.pause();
        prevVideo.currentTime = 0;
      }
      if (prevMedia) {
        prevMedia.classList.remove('is-playing');
      }
      currentItem = null;
    }

    function update() {
      const vpCenter = window.innerHeight / 2;
      const threshold = window.innerHeight * 0.45;
      let closest = null;
      let closestDist = Infinity;

      videoItems.forEach(function (item) {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const dist = Math.abs(itemCenter - vpCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closest = item;
        }
      });

      if (closest && closestDist <= threshold) {
        playItem(closest);
      } else {
        pauseAll();
      }
    }

    let ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          update();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  async function init() {
    try {
      if (!window.jsyaml || typeof window.jsyaml.load !== 'function') {
        throw new Error('js-yaml is not available.');
      }

      const [site, publications] = await Promise.all([
        loadYaml('./data/site.yml'),
        loadYaml('./data/publications.yml'),
      ]);

      renderNavigation(site);
      renderHero(site);
      renderAbout(site);
      renderPublications(site, publications);
      renderHonors(site);
      renderFooter(site);
      hideStatus();
      initVideoAutoplay();
      document.dispatchEvent(new Event('homepage:content-ready'));
    } catch (error) {
      console.error(error);
      showStatus('Failed to load the homepage data. Start a local static server in /Users/lin/Desktop/code/personal_page/homepage and check that the YAML files are reachable.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
