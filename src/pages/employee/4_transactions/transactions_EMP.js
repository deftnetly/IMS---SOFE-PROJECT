// transactions_EMP.js - full, robust version with View button and aligned columns
(function () {
  const LIST_API = '/smart-inventory/src/pages/employee/4_transactions/get_transactions.php';
  const DETAILS_API = '/smart-inventory/src/pages/employee/4_transactions/get_transaction_details.php';

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  async function loadList() {
    const tableBody = document.querySelector('#transactionTable tbody');
    const dateFilter = document.getElementById('dateFilter');

    if (!tableBody) {
      console.warn('transactions_EMP.js: #transactionTable tbody not found yet.');
      return;
    }

    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:gray;">Loading transactions...</td></tr>';
    try {
      const q = new URLSearchParams();
      if (dateFilter?.value) q.set('date', dateFilter.value);
      const res = await fetch(LIST_API + (q.toString() ? ('?' + q.toString()) : ''), { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'List API failed');
      const rows = json.transactions ?? json.data ?? [];
      renderList(rows, tableBody);
    } catch (err) {
      console.error('[emp tx] loadList Error:', err);
      tableBody.innerHTML = '<tr><td colspan="4" style="color:red">Failed to load transactions. See console.</td></tr>';
    }
  }

  function renderList(rows, tableBody) {
    if (!tableBody) return;
    if (!rows || rows.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:gray">No transactions found.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map(r => {
      const txn = escapeHtml(r.transaction_id ?? r.txn_id ?? r.id ?? '');
      const date = escapeHtml(r.transaction_date ?? r.date_time ?? r.date ?? '');
      const total = Number(r.total_amount ?? r.total ?? r.subtotal ?? 0).toFixed(2);

      return `<tr data-txn="${txn}">
        <td>${txn}</td>
        <td>${date}</td>
        <td class="td-amount">&#8369;${escapeHtml(total)}</td>
        <td class="td-method"><button class="view-btn" data-txn="${txn}">View</button></td>
      </tr>`;
    }).join('');

    tableBody.querySelectorAll('.view-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openDetails(btn.dataset.txn);
      };
    });
  }

  async function openDetails(txn) {
    if (!txn) return;
    try {
      const res = await fetch(DETAILS_API + '?id=' + encodeURIComponent(txn), { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Details API failed');

      const header = json.transaction ?? json.data?.transaction ?? json.data ?? {};
      const items = json.items ?? [];

      const idEl = document.getElementById('modalTransactionId');
      const dateEl = document.getElementById('modalDateTime');
      const itemsBody = document.getElementById('modalItemsList');

      if (idEl) idEl.textContent = header.transaction_id ?? header.txn_id ?? txn;
      if (dateEl) dateEl.textContent = header.transaction_date ?? header.date_time ?? '';

      if (itemsBody) {
        itemsBody.innerHTML = items.length ? items.map(it => {
          const name = escapeHtml(it.product_name ?? it.productname ?? it.product ?? it.name ?? '');
          const qty = Number(it.quantity ?? it.qty ?? 0);
          const price = Number(it.unit_price ?? it.price ?? it.amount ?? 0);
          const sub = Number(it.subtotal ?? (qty * price));

          return `<tr>
            <td class="td-product">${name}</td>
            <td class="td-qty">${escapeHtml(String(qty))}</td>
            <td class="td-price">&#8369;${price.toFixed(2)}</td>
            <td class="td-subtotal">&#8369;${sub.toFixed(2)}</td>
          </tr>`;
        }).join('') : '<tr><td colspan="4" style="text-align:center;color:gray">No items</td></tr>';
      }

      let subtotal = 0;
      items.forEach(it => {
        const qty = Number(it.quantity ?? it.qty ?? 0);
        const price = Number(it.unit_price ?? it.price ?? it.amount ?? 0);
        const sub = Number(it.subtotal ?? qty * price);
        subtotal += sub;
      });

      let tax = 0;
      if (header.tax !== undefined && header.tax !== null) {
        tax = Number(header.tax);
      } else {
        tax = subtotal * 0.12;
      }

      const total = subtotal + tax;

      document.getElementById('modalSubtotal').innerHTML = '&#8369;' + subtotal.toFixed(2);
      document.getElementById('modalTax').innerHTML = '&#8369;' + tax.toFixed(2);
      document.getElementById('modalTotal').innerHTML = '&#8369;' + total.toFixed(2);

      const modal = document.getElementById('transactionModal');
      if (modal) modal.style.display = 'flex';
    } catch (err) {
      console.error('[emp tx] openDetails', err);
      alert('Failed to load transaction details. Check console.');
    }
  }

  window.closeTransactionModal = function () {
    const m = document.getElementById('transactionModal');
    if (m) m.style.display = 'none';
  };
  window.reloadTransactions = loadList;
  window.applyFilters = loadList;

  window.clearFilters = function() {
    const dateInput = document.getElementById('dateFilter');
    if (dateInput) dateInput.value = '';
    reloadTransactions();
  };

  setTimeout(loadList, 300);
})();
