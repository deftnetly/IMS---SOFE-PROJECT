/* products_EMP.js
   Scoped product loader for Employee panel.
   Only touches the table with class "products-table".
   Safe to include multiple times (idempotent).
*/

(function () {
  /* --- safety / single-install --- */
  if (window.__EMP_PRODUCTS_LOADER_INSTALLED) return;
  window.__EMP_PRODUCTS_LOADER_INSTALLED = true;

  /* --- configuration --- */
  const PRODUCTS_API = "/Smart-Inventory/src/pages/admin/3_products/get_products.php";
  const TABLE_TBODY_SELECTOR = ".products-table tbody";
  const TABLE_WRAPPER_SELECTOR = ".products-table";
  const DEBUG = true;

  /* --- small logger helpers --- */
  function dlog(...args) { if (DEBUG) console.log("[EMP-PROD]", ...args); }
  function deerr(...args) { if (DEBUG) console.error("[EMP-PROD]", ...args); }

  /* --- formatting helpers --- */
  function fmtPrice(v) {
    const n = Number(v);
    return isNaN(n) ? "₱0.00" : "₱" + n.toFixed(2);
  }
  function fmtDate(v) {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toLocaleString();
  }
  function stockClass(stock) {
    const s = Number(stock);
    if (isNaN(s)) return "";
    if (s === 0) return "stock-unavailable";
    if (s <= 20) return "stock-low";
    if (s <= 40) return "stock-medium";
    return "stock-high";
  }
  function statusInfo(stock) {
    return Number(stock) === 0 ? { text: "Unavailable", cls: "status-unavailable" } : { text: "Available", cls: "status-available" };
  }

  /* --- internal state --- */
  let __observer = null;
  let __debounceTimer = null;
  let __tbodySeen = false;      // whether we've observed the products tbody exist
  let __lastDataHash = null;    // to avoid re-rendering identical data
  const DEBOUNCE_MS = 160;

  /* --- rendering --- */
  function renderEmployeeProducts(products) {
    dlog("renderEmployeeProducts, count:", Array.isArray(products) ? products.length : typeof products);
    const tbody = document.querySelector(TABLE_TBODY_SELECTOR);
    if (!tbody) { deerr("render failed — products tbody not found"); return; }

    // Clear
    tbody.innerHTML = "";

    if (!Array.isArray(products) || products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:gray;">No products available.</td></tr>';
      return;
    }

    const frag = document.createDocumentFragment();
    for (const p of products) {
      const id = p.product_code || p.id || "";
      const name = p.product_name || p.product || "";
      const category = (p.category_code ? p.category_code + " - " : "") + (p.category_name || p.category || "");
      const price = p.price || 0;
      const stock = Number(p.stock || 0);
      const dateAdded = p.date_added || p.created_at || "";

      const status = statusInfo(stock);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(category)}</td>
        <td>${fmtPrice(price)}</td>
        <td class="${stockClass(stock)}">${stock === 0 ? "Unavailable" : escapeHtml(String(stock))}</td>
        <td>${escapeHtml(fmtDate(dateAdded))}</td>
        <td class="${status.cls}">${status.text}</td>
      `;
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
  }

  function renderError(msg) {
    const tbody = document.querySelector(TABLE_TBODY_SELECTOR);
    if (!tbody) { deerr("renderError: tbody not found", msg); return; }
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">${escapeHtml(msg)}</td></tr>`;
  }

  /* --- utilities --- */
  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[&<>"'`]/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" })[m];
    });
  }

  /* --- fetcher --- */
  async function loadEmployeeProducts() {
    dlog("loadEmployeeProducts — checking table presence");
    const tbody = document.querySelector(TABLE_TBODY_SELECTOR);
    if (!tbody) { deerr("load aborted — products tbody missing"); return; }

    try {
      const res = await fetch(PRODUCTS_API, { cache: "no-store" });
      dlog("fetch status:", res.status);
      if (!res.ok) { renderError(`Fetch failed (${res.status})`); return; }
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch (e) { deerr("Invalid JSON from server:", text.slice(0, 600)); renderError("Invalid server response"); return; }
      if (!json) { renderError("Empty server response"); return; }
      if (json.success === false) { renderError("Server error: " + (json.error || "Unknown")); deerr("API error payload:", json); return; }

      const data = Array.isArray(json.data) ? json.data : (json.products || json.items || []);
      const hash = JSON.stringify(data || []);
      if (__lastDataHash && __lastDataHash === hash) {
        dlog("data unchanged — skipping render");
      } else {
        __lastDataHash = hash;
        renderEmployeeProducts(data);
      }
      __tbodySeen = true;
    } catch (err) {
      deerr("loadEmployeeProducts failed:", err);
      renderError("Cannot load products (network/server).");
    }
  }

  /* --- schedule with debounce --- */
  function scheduleLoad(delay = DEBOUNCE_MS) {
    if (__debounceTimer) clearTimeout(__debounceTimer);
    __debounceTimer = setTimeout(() => {
      __debounceTimer = null;
      loadEmployeeProducts();
    }, delay);
  }

  /* --- MutationObserver: only care about products-table insertions --- */
  function attachObserver() {
    if (__observer) return;
    try {
      __observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.addedNodes && m.addedNodes.length) {
            for (const n of m.addedNodes) {
              try {
                if (n.nodeType === 1) {
                  // If a products table node was added or a container that includes it
                  if ((n.matches && n.matches(TABLE_WRAPPER_SELECTOR)) || (n.querySelector && n.querySelector(TABLE_TBODY_SELECTOR))) {
                    dlog("Observer: detected products-table insertion -> schedule load");
                    __tbodySeen = true;
                    scheduleLoad(80);
                    return;
                  }
                }
              } catch (e) {}
            }
          }
        }
        // fallback: if the tbody exists now and we haven't seen it
        if (!__tbodySeen && document.querySelector(TABLE_TBODY_SELECTOR)) {
          dlog("Observer: products tbody present now (fallback) -> schedule");
          __tbodySeen = true;
          scheduleLoad(80);
        }
      });
      __observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
      dlog("MutationObserver attached (products scoped)");
    } catch (err) {
      deerr("attachObserver failed:", err);
    }
  }

  /* --- public API expected by Employee.html --- */
  function startWatchingEmployeeProducts() {
    __tbodySeen = false;
    __lastDataHash = null;
    if (!__observer) attachObserver();
    scheduleLoad(50);
    dlog("startWatchingEmployeeProducts called");
  }

  /* expose safe APIs */
  window.loadEmployeeProducts = loadEmployeeProducts;
  window.startWatchingEmployeeProducts = startWatchingEmployeeProducts;

  /* --- init once DOM ready or if table already present --- */
  function init() {
    if (window.__EMP_PRODUCTS_LOADER_INITED) return;
    window.__EMP_PRODUCTS_LOADER_INITED = true;
    dlog("init products loader (scoped)");

    attachObserver();

    if (document.querySelector(TABLE_TBODY_SELECTOR)) {
      dlog("products tbody present on init -> schedule load");
      __tbodySeen = true;
      scheduleLoad(10);
    } else {
      dlog("products tbody not present on init");
    }

    // Listen for the event your loader dispatches (fallback path)
    document.addEventListener('startWatchingEmployeeProducts', () => {
      try { startWatchingEmployeeProducts(); } catch (e) { deerr("startWatchingEmployeeProducts event handler failed", e); }
    });

    // Also respond to your sectionLoaded custom event (if dispatched)
    document.addEventListener('sectionLoaded', (e) => {
      try {
        const sec = e && e.detail && e.detail.section ? String(e.detail.section).toLowerCase() : '';
        dlog("sectionLoaded event:", sec);
        if (sec.indexOf('product') !== -1) {
          // entering product page
          __tbodySeen = false; // let observer detect reinsertion
          setTimeout(() => {
            if (document.querySelector(TABLE_TBODY_SELECTOR)) scheduleLoad(40);
          }, 40);
        } else {
          dlog("sectionLoaded -> not product, no product load scheduled");
        }
      } catch (err) { deerr("sectionLoaded handler error", err); }
    });
  }

  // Run init ASAP
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
