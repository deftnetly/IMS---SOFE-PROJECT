// reports_AD.js (simplified: no threshold inputs; DB-only)
(function () {
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  }

  async function fetchJSON(url) {
    console.log('[LowStock] Fetching:', url);
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      const txt = await res.text();
      const err = `Network ${res.status}: ${txt}`;
      console.error('[LowStock] fetch error:', err);
      throw new Error(err);
    }
    const json = await res.json().catch(e => {
      console.error('[LowStock] invalid JSON response', e);
      throw new Error('Invalid JSON response from server');
    });
    if (!json || json.success !== true) {
      console.error('[LowStock] server returned error payload', json);
      throw new Error(json && json.error ? json.error : 'Server returned unsuccessful response');
    }
    return json;
  }

  function ensureTable() {
    const existing = document.getElementById('reportTable');
    if (!existing) {
      const wrapper = document.getElementById('tableWrapper') || document.body;
      wrapper.insertAdjacentHTML('beforeend', `
        <table class="data-table" id="reportTable">
          <thead><tr id="reportTableHead"></tr></thead>
          <tbody></tbody>
        </table>`);
    }
  }

  function setHeaders() {
    const head = document.getElementById('reportTableHead');
    if (!head) return;
    head.innerHTML = `
      <th>Product ID</th>
      <th>Product Name</th>
      <th>Category</th>
      <th>Current Stock</th>
      <th>Status</th>
      <th>Sold (range)</th>
      <th>Actions</th>`;
  }

  function clearTableMessage(msg) {
    const tbody = document.querySelector('#reportTable tbody');
    if (!tbody) return;
    const cols = document.querySelectorAll('#reportTable thead th').length || 7;
    tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center">${escapeHtml(String(msg))}</td></tr>`;
  }

  function statusBadgeClass(status) {
    if (status === 'Unavailable') return 'status-unavailable';
    if (status === 'Critical') return 'status-critical';
    if (status === 'Low') return 'status-low';
    if (status === 'Available') return 'status-available';
    return 'status-available';
  }

  function statusBadgeHtml(status) {
    const cls = statusBadgeClass(status);
    let background = '#dcfce7';
    let color = '#166534';

    if (cls === 'status-unavailable') {
      background = '#fee2e2';
      color = '#b91c1c';
    } else if (cls === 'status-critical') {
      background = '#fef2f2';
      color = '#991b1b';
    } else if (cls === 'status-low') {
      background = '#fff7ed';
      color = '#c2410c';
    }

    return `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:112px;padding:8px 14px;border-radius:999px;font-weight:700;font-size:13px;line-height:1.1;background:${background};color:${color};white-space:nowrap;">${escapeHtml(status)}</span>`;
  }

  function decorateRenderedReportStatuses() {
    try {
      document.querySelectorAll('#reportTable tbody tr').forEach((row) => {
        const statusCell = row.cells[4];
        if (!statusCell) return;
        const rawText = (statusCell.textContent || '').trim();
        if (!rawText) return;
        statusCell.style.whiteSpace = 'nowrap';
        statusCell.innerHTML = statusBadgeHtml(rawText);
      });
    } catch (err) {
      console.warn('[LowStock] decorateRenderedReportStatuses failed', err);
    }
  }

  function viewButtonHtml(productId) {
    return `<button class="view-btn" data-id="${escapeHtml(productId)}" style="border:none;border-radius:999px;padding:8px 16px;background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);color:#fff;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 8px 18px rgba(234,88,12,0.18);transition:transform 0.18s ease,box-shadow 0.18s ease,opacity 0.18s ease;">View</button>`;
  }

    function render(items) {
        const tbody = document.querySelector('#reportTable tbody');
        if (!tbody) return;
        if (!items || !items.length) {
            clearTableMessage('No low-stock items found for the selected range.');
            return;
        }
        let html = '';
        for (const it of items) {
            // stock color: unavailable red, <=20 red, <=40 orange, >40 green
            let stockColor = '#000';
            if (it.current_stock === 0) stockColor = '#6b6363ff';
            else if (it.current_stock <= 20) stockColor = '#d32f2f';
            else if (it.current_stock <= 40) stockColor = '#ecbf43ff';
            else stockColor = '#36993bff';

            html += `<tr data-prod="${escapeHtml(it.product_id)}">
            <td>${escapeHtml(it.product_id)}</td>
            <td>${escapeHtml(it.product_name)}</td>
            <td>${escapeHtml(it.category)}</td>
            <td style="color:${stockColor}; font-weight:600">${escapeHtml(String(it.current_stock))}</td>
            <td style="white-space:nowrap;">${statusBadgeHtml(it.status)}</td>
            <td>${escapeHtml(String(it.sold_in_range || 0))}</td>
            <td>${viewButtonHtml(it.product_id)}</td>
            </tr>`;
        }
        tbody.innerHTML = html;
        decorateRenderedReportStatuses();

        tbody.querySelectorAll('.view-btn').forEach(b => b.onclick = (ev) => openModal(b.dataset.id, items));
        }


  function openModal(productId, items) {
    const modal = document.getElementById('reportModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const prod = (items || []).find(x => String(x.product_id) === String(productId));
    title.textContent = `Product â€” ${productId}`;
    if (!prod) {
      body.innerHTML = '<p>No details found for this product.</p>';
      modal.style.display = 'flex';
      return;
    }
    body.innerHTML = `
      <p><strong>Product ID:</strong> ${escapeHtml(prod.product_id)}</p>
      <p><strong>Name:</strong> ${escapeHtml(prod.product_name)}</p>
      <p><strong>Category:</strong> ${escapeHtml(prod.category)}</p>
      <p><strong>Current Stock:</strong> ${escapeHtml(String(prod.current_stock))}</p>
      <p><strong>Status:</strong> ${escapeHtml(prod.status)}</p>
      <p><strong>Sold in range:</strong> ${escapeHtml(String(prod.sold_in_range))}</p>
    `;
    modal.style.display = 'flex';
  }

  function closeModal() {
    const modal = document.getElementById('reportModal');
    if (modal) modal.style.display = 'none';
  }

  function removeLegacyControls() {
    try {
      document.querySelectorAll('.filter-section').forEach((section) => section.remove());
      document.querySelectorAll('#generateBtn, #startDate, #endDate').forEach((el) => el.remove());
      document.querySelectorAll('label[for="startDate"], label[for="endDate"]').forEach((label) => {
        const wrapper = label.closest('div');
        if (wrapper) wrapper.remove();
        else label.remove();
      });
    } catch (err) {
      console.warn('[LowStock] removeLegacyControls failed', err);
    }
  }

  async function generate() {
    const start = '';
    const end = '';

    // we allow empty range (server will still return low-stock items based on internal thresholds)
    console.log('[LowStock] generate, start=', start, 'end=', end);

    ensureTable();
    setHeaders();
    clearTableMessage('Loadingâ€¦');

    function buildReportUrl(pathAndQuery) {
        try {
        const scripts = Array.from(document.scripts || []);
        // find script tag that loaded reports_AD.js
        const me = scripts.find(s => s.src && s.src.indexOf('reports_AD.js') !== -1);
        if (me && me.src) {
            const u = new URL(me.src);
            // try to identify '/src' segment and use base before it
            const idx = u.pathname.indexOf('/src');
            if (idx !== -1) {
            const base = u.origin + u.pathname.slice(0, idx);
            return base + pathAndQuery;
            }
            return u.origin + pathAndQuery;
        }
        } catch (e) {
        // ignore and fallback
        console.warn('[LowStock] buildReportUrl detection failed:', e);
        }
        // fallback guess (common in your project)
        return '/smart-inventory' + pathAndQuery;
    }

    try {
        const endpointPath = '/src/pages/admin/6_reports/get_low_stock_report.php';
        const query = `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
        const url = buildReportUrl(endpointPath + query);

        console.log('[LowStock] built endpoint URL:', url);
        const json = await fetchJSON(url);
        const items = json.items || [];
        window.__lastLowStockItems = items;
        render(items);
        console.log('[LowStock] rendered', items.length, 'items');
    } catch (err) {
        console.error('[LowStock] generate error', err);
        clearTableMessage('Error: ' + err.message);
    }
  }

  function bind() {
    removeLegacyControls();
    ensureTable();
    setHeaders();
    clearTableMessage('Loading...');
    const close = document.getElementById('closeModal');
    if (close) close.onclick = closeModal;
    generate();
    setTimeout(removeLegacyControls, 50);
    setTimeout(removeLegacyControls, 250);
  }

  document.addEventListener('DOMContentLoaded', bind);
  document.addEventListener('sectionLoaded', (e) => {
    if (!e || !e.detail) return;
    const s = String(e.detail.section || '').toLowerCase(); 
    if (s === 'reports' || s === 'reports_ad') bind();
  });

})();
