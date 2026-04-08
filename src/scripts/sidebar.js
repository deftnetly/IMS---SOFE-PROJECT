// /scripts/sidebar.js
// Put this file in your scripts folder and include it after the sidebar markup.
// Example include: <script src="../../scripts/sidebar.js"></script>

(function () {
  let loadingOverlay = null;
  let loadingTimer = null;
  let loadingStartedAt = 0;
  const MIN_LOADING_MS = 350;

  function ensureLoadingOverlay() {
    if (loadingOverlay) return loadingOverlay;

    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'sidebar-loading-overlay';
    loadingOverlay.setAttribute('aria-hidden', 'true');
    loadingOverlay.innerHTML = `
      <div class="sidebar-loading-spinner" aria-hidden="true"></div>
      <p class="sidebar-loading-text">Loading section...</p>
    `;

    document.body.appendChild(loadingOverlay);
    return loadingOverlay;
  }

  function showSidebarLoading() {
    const overlay = ensureLoadingOverlay();
    clearTimeout(loadingTimer);
    loadingStartedAt = Date.now();
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }

  function hideSidebarLoading() {
    if (!loadingOverlay) return;

    const elapsed = Date.now() - loadingStartedAt;
    const delay = Math.max(0, MIN_LOADING_MS - elapsed);
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
      if (!loadingOverlay) return;

      loadingOverlay.classList.remove('visible');
      loadingOverlay.setAttribute('aria-hidden', 'true');

      clearTimeout(loadingTimer);
      loadingTimer = setTimeout(() => {
        if (loadingOverlay && loadingOverlay.getAttribute('aria-hidden') === 'true') {
          loadingOverlay.remove();
          loadingOverlay = null;
        }
      }, 220);
    }, delay);
  }

  window.showSidebarLoading = showSidebarLoading;
  window.hideSidebarLoading = hideSidebarLoading;

  // Helper - find sidebar links (excluding logout)
  function getSidebarLinks() {
    return Array.from(document.querySelectorAll('.sidebar a:not(.logout)'));
  }

  // Expose setActiveLink globally so existing code (e.g. loadContent) can call it
  window.setActiveLink = function (sectionName) {
    try {
      const links = getSidebarLinks();
      links.forEach(l => l.classList.remove('active'));

      if (!sectionName) return;

      // Try to match by onclick content first (your current pattern)
      let matched = links.find(l => {
        const onclick = l.getAttribute('onclick') || '';
        return onclick.includes("'" + sectionName + "'") || onclick.includes('"' + sectionName + '"');
      });

      // fallback: match by title or text
      if (!matched) {
        matched = links.find(l => {
          const title = (l.getAttribute('title') || '').toLowerCase();
          const text = (l.textContent || '').toLowerCase();
          return title.includes(sectionName.toLowerCase()) || text.includes(sectionName.toLowerCase());
        });
      }

      if (matched) matched.classList.add('active');
      // persist active for reloads
      localStorage.setItem('activeSidebar', sectionName);
    } catch (err) {
      console.error('setActiveLink error:', err);
    }
  };

  // DOM ready init
  function init() {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const links = getSidebarLinks();

    // If there is no sidebar, nothing to do
    if (!sidebar) return;

    // === BURGER TOGGLE ===
    if (toggle) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
      });

      // restore collapsed state
      if (localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('collapsed');
      }
    } else {
      // optionally create a toggle if missing (only if you want auto-creation)
      // const btn = document.createElement('div');
      // btn.id = 'sidebarToggle';
      // btn.className = 'sidebar-toggle';
      // btn.innerHTML = '&#9776;';
      // document.body.insertBefore(btn, sidebar);
      // btn.addEventListener('click', () => { sidebar.classList.toggle('collapsed'); });
    }

    // === CLICK -> ACTIVE (and save) ===
    links.forEach(link => {
      link.addEventListener('click', () => {
        showSidebarLoading();
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Save active by parsing onclick or using title/text
        let sectionName = null;
        const onclick = link.getAttribute('onclick');
        if (onclick) {
          const m = onclick.match(/['"]([^'"]+)['"]/);
          if (m && m[1]) sectionName = m[1];
        }
        if (!sectionName) sectionName = (link.getAttribute('title') || link.textContent || '').trim();

        if (sectionName) localStorage.setItem('activeSidebar', sectionName);
      });
    });

    // === Restore active from localStorage (if any) ===
    const savedActive = localStorage.getItem('activeSidebar');
    if (savedActive) {
      // prefer to use the global function so behavior is consistent
      window.setActiveLink(savedActive);
    }

    window.addEventListener('sidebar:loading:start', showSidebarLoading);
    window.addEventListener('sidebar:loading:end', hideSidebarLoading);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
