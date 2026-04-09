// dashboard_AD.js â€” fixed, defensive admin dashboard loader
// - No TypeScript operators
// - Writes to multiple id variants (ad_* and plain ids)
// - Builds absolute URLs so fragment-relative loading works
// - LOW_THRESHOLD = 40 (stock <= 40 => low)

(function () {
  // ENDPOINTS â€” change only if your project actually places them elsewhere
  const ENDPOINT_PRODUCTS = '/src/pages/admin/3_products/get_products.php';
  const ENDPOINT_CATEGORIES = '/src/pages/admin/2_categories/get_categories.php';
  const ENDPOINT_EMPLOYEES = '/src/pages/admin/4_employees/get_employees.php';
  const ENDPOINT_TRANSACTIONS = '/src/pages/admin/5_transactions/get_transactions.php';

  const LOW_THRESHOLD = 40; // <= 40 is low stock

  // DOM helpers
  function $(id) { return document.getElementById(id); }
  function setIf(id, value) { const el = $(id); if (el) el.textContent = value; }
  function setAny(ids, value) { if (!Array.isArray(ids)) return; ids.forEach(i => setIf(i, value)); }

  function money(n) {
    try {
      return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(Number(n || 0));
    } catch (e) {
      return 'â‚±' + (Number(n || 0)).toFixed(2);
    }
  }

  // build absolute URL relative to your /src base (works when fragments are injected)
  function buildUrl(path) {
    try {
      // try to find a loaded script that contains dashboard_AD.js to compute base
      const scripts = Array.from(document.scripts || []);
      const me = scripts.find(s => s.src && s.src.indexOf('dashboard_AD.js') !== -1);
      if (me && me.src) {
        const u = new URL(me.src, location.href);
        const idx = u.pathname.indexOf('/src');
        if (idx !== -1) {
          return u.origin + u.pathname.slice(0, idx) + path;
        } else {
          return u.origin + path;
        }
      }
    } catch (e) {
      // fall through to fallback
    }
    // fallback used by earlier code paths
    return '/smart-inventory' + path;
  }

  async function fetchJsonSafe(url) {
    try {
      const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) {
        console.warn('[dashboard_AD] fetch non-ok', res.status, url);
        return null;
      }
      const j = await res.json().catch(() => null);
      return j;
    } catch (e) {
      console.warn('[dashboard_AD] fetch error', e, url);
      return null;
    }
  }

  // normalize product list from various shapes
  function normalizeProducts(json) {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json.items)) return json.items;
    return [];
  }

  // write to both ad_ and non-prefixed ids
  function writeTotals(obj) {
    // mapping keys -> possible ids in DOM
    const map = {
      totalProducts: ['totalProducts','ad_totalProducts'],
      totalCategories: ['totalCategories','ad_totalCategories'],
      totalEmployees: ['totalEmployees','ad_totalEmployees'],
      todaysSales: ['todaysSales','ad_todaysSales'],
      monthlySales: ['monthlySales','ad_monthSales'],
      monthlyTransactions: ['monthlyTransactions','ad_monthTransactions','ad_month_txn'],
      averageSale: ['averageSale','ad_avgTxn'],
      highestSale: ['highestSale'],
      totalStockValue: ['totalStockValue','ad_totalStockValue'],
      lowStockItems: ['lowStockItems','ad_lowStockItems','ad_lowstock'],
      outOfStockItems: ['outOfStockItems','ad_outOfStock','ad_out_of_stock']
    };

    Object.keys(map).forEach(key => {
      if (obj[key] !== undefined) {
        setAny(map[key], String(obj[key]));
      }
    });
  }

  function normalizeTransactions(json) {
    if (!json) return [];
    if (Array.isArray(json.transactions)) return json.transactions;
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json)) return json;
    return [];
  }

  function renderMonthlySalesHistogram(items) {
    const chart = $('salesHistoryChart');
    const summary = $('salesHistorySummary');
    if (!chart || !summary) return;

    if (!items || !items.length) {
      chart.innerHTML = '<div class="sales-chart-empty">No sales history yet.</div>';
      summary.textContent = 'Waiting for transaction history';
      return;
    }

    const grouped = new Map();
    let minDate = null;
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);

    items.forEach((t) => {
      const rawDate = String(t.transaction_date || t.date_time || t.date || '').trim();
      const amount = Number(t.total_amount ?? t.total ?? t.amount ?? 0) || 0;
      if (!rawDate) return;

      const date = new Date(rawDate.replace(' ', 'T'));
      if (Number.isNaN(date.getTime())) return;
      const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);

      if (!minDate || monthDate < minDate) {
        minDate = monthDate;
      }

      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const label = monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      if (!grouped.has(key)) {
        grouped.set(key, { label, total: 0 });
      }

      grouped.get(key).total += amount;
    });

    if (!minDate) {
      chart.innerHTML = '<div class="sales-chart-empty">No sales history yet.</div>';
      summary.textContent = 'Waiting for transaction history';
      return;
    }

    const months = [];
    const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cursor <= currentMonthDate) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const label = cursor.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const existing = grouped.get(key);
      months.push(existing || { label, total: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const max = Math.max(...months.map((m) => m.total), 1);
    const first = months[0].label;
    const last = months[months.length - 1].label;
    summary.textContent = `${first} to ${last}`;

    chart.innerHTML = months.map((month) => {
      const height = Math.max(10, Math.round((month.total / max) * 158));
      return `
        <div class="sales-bar-card">
          <div class="sales-bar-value">${escapeHtml(money(month.total))}</div>
          <div class="sales-bar-track">
            <div class="sales-bar-fill" style="height:${height}px;"></div>
          </div>
          <div class="sales-bar-label">${escapeHtml(month.label)}</div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function bindNextPageButton() {
    const btn = document.getElementById('checkoutBtn');
    if (!btn || btn.__dashboardBound) return;
    btn.__dashboardBound = true;
    btn.addEventListener('click', () => {
      if (typeof window.openPage === 'function') {
        window.openPage('categories', '2_categories');
      }
    });
  }

  // ---------- loaders ----------

  async function loadProductsSummary() {
    const url = buildUrl(ENDPOINT_PRODUCTS);
    const json = await fetchJsonSafe(url);
    const products = normalizeProducts(json);

    console.log('[dashboard_AD] products fetched:', (products || []).length);

    // total products
    writeTotals({ totalProducts: (products || []).length });

    // categories (try categories endpoint, else infer)
    const catsUrl = buildUrl(ENDPOINT_CATEGORIES);
    const catsJson = await fetchJsonSafe(catsUrl);
    let categoryCount = 0;
    if (catsJson && Array.isArray(catsJson.data)) categoryCount = catsJson.data.length;
    else {
      const set = new Set((products || []).map(p => (p.category ?? p.category_name ?? 'Uncategorized')));
      categoryCount = set.size;
    }
    writeTotals({ totalCategories: categoryCount });

    // stock stats
    let totalStockValue = 0;
    let lowCount = 0;
    let outCount = 0;

    for (const p of products) {
      // safe parse of stock
      const raw = p.stock ?? p.current_stock ?? p.qty ?? p.quantity ?? 0;
      // remove non-digit chars and parse
      const stock = Number(String(raw).replace(/[^0-9.\-]/g,'').trim());
      const price = Number(p.price ?? p.selling_price ?? p.unit_price ?? 0) || 0;

      const s = Number.isFinite(stock) ? stock : 0;
      totalStockValue += s * (Number.isFinite(price) ? price : 0);

      if (s === 0) outCount++;
      else if (s > 0 && s <= LOW_THRESHOLD) lowCount++;
    }

    writeTotals({
      totalStockValue: money(totalStockValue),
      lowStockItems: lowCount + outCount,
      outOfStockItems: outCount
    });
  }

  async function loadEmployeeCount() {
    const url = buildUrl(ENDPOINT_EMPLOYEES);
    const json = await fetchJsonSafe(url);
    // employee endpoint sometimes returns { employees: [...] } or { data: [...] }
    const list = (json && Array.isArray(json.employees)) ? json.employees : (json && Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []));
    console.log('[dashboard_AD] employees fetched:', list.length);
    writeTotals({ totalEmployees: list.length });
  }

  async function loadSalesMetrics() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2,'0');
    const dd = String(now.getDate()).padStart(2,'0');

    const today = `${yyyy}-${mm}-${dd}`;
    const urlToday = buildUrl(ENDPOINT_TRANSACTIONS + '?date=' + encodeURIComponent(today));
    const urlAll = buildUrl(ENDPOINT_TRANSACTIONS);

    const [todayJson, allJson] = await Promise.all([fetchJsonSafe(urlToday), fetchJsonSafe(urlAll)]);
    const todayTx = normalizeTransactions(todayJson);
    const allTx = normalizeTransactions(allJson);

    const monthPrefix = `${yyyy}-${mm}`;
    const monthTx = allTx.filter((t) => {
      const rawDate = String(t.transaction_date || t.date_time || t.date || '');
      return rawDate.indexOf(monthPrefix) === 0;
    });

    const todayTotal = (todayTx || []).reduce((s, t) => s + (Number(t.total_amount ?? t.total ?? t.amount ?? 0) || 0), 0);
    const monthTotal = (monthTx || []).reduce((s, t) => s + (Number(t.total_amount ?? t.total ?? t.amount ?? 0) || 0), 0);
    const monthCount = (monthTx || []).length || 0;
    const avg = monthCount ? (monthTotal / monthCount) : 0;
    let highest = 0;
    for (const t of (monthTx || [])) {
      const v = Number(t.total_amount ?? t.total ?? t.amount ?? 0) || 0;
      if (v > highest) highest = v;
    }

    writeTotals({
      todaysSales: money(todayTotal),
      monthlySales: money(monthTotal),
      monthlyTransactions: monthCount,
      averageSale: money(avg),
      highestSale: money(highest)
    });

    renderMonthlySalesHistogram(allTx);

    console.log('[dashboard_AD] sales: today=', todayTotal, 'month=', monthTotal, 'txns=', monthCount);
  }

  // ---------- init ----------
  async function startDashboard() {
    console.log('[dashboard_AD] startDashboard');
    // run parallel where safe
    await Promise.all([
      loadProductsSummary(),
      loadEmployeeCount(),
      loadSalesMetrics()
    ]);
    console.log('[dashboard_AD] populated');
  }

  function init() {
    // small delay to allow SPA fragment injection
    bindNextPageButton();
    setTimeout(startDashboard, 40);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);

  // SPA hooks
  document.addEventListener('sectionLoaded', (e) => {
    try {
      const sec = e && e.detail && e.detail.section ? String(e.detail.section).toLowerCase() : '';
      if (sec.includes('dashboard')) init();
    } catch (err) {}
  });
  document.addEventListener('dashboardLoaded', init);

})();
