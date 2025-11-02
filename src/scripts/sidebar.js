// /scripts/sidebar.js
// Put this file in your scripts folder and include it after the sidebar markup.
// Example include: <script src="../../scripts/sidebar.js"></script>

(function () {
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
