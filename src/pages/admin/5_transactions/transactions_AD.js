// transactions_AD.js — JS-only fix: View in Items column + working modal close
(function () {
  'use strict';

  // duplicate guard
  if (window.__transactionsAD_fixed_v2) {
    console.log('transactions_AD.js: already loaded (v2).');
    return;
  }
  window.__transactionsAD_fixed_v2 = true;

  // Config
  var MARKER_ID = 'transactionsPage';
  var TB_ID = 'txBody';
  var LIST_API = '/smart-inventory/src/pages/employee/4_transactions/get_transactions.php';
  var DETAILS_API = '/smart-inventory/src/pages/employee/4_transactions/get_transaction_details.php';
  var DELETE_API = '/smart-inventory/src/pages/admin/5_transactions/delete_transaction.php';

  // Helpers
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function getTbody() {
    return document.getElementById(TB_ID) || document.querySelector('.data-table tbody');
  }
  function setMessage(tb, msg, color) {
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:' + (color || 'gray') + ';padding:14px">' + esc(msg) + '</td></tr>';
  }

  // Attach handlers for rows
  function attachRowHandlers(tb) {
    if (!tb) tb = getTbody();
    if (!tb) return;

    Array.prototype.forEach.call(tb.querySelectorAll('.view-btn'), function (btn) {
      btn.onclick = function () {
        var txn = btn.getAttribute('data-txn');
        if (txn) openDetails(txn);
      };
    });

    Array.prototype.forEach.call(tb.querySelectorAll('.remove-btn'), function (btn) {
      btn.onclick = function () {
        var txn = btn.getAttribute('data-txn');
        if (!txn) return;
        if (!confirm('Delete ' + txn + '?')) return;
        removeTransaction(txn);
      };
    });
  }

  // Modal show
  function openDetails(txn) {
    fetch(DETAILS_API + '?id=' + encodeURIComponent(txn), { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || !j.success) {
          alert(j && j.message ? j.message : 'Failed to load details');
          return;
        }
        var tx = j.transaction || j.data || j;
        // populate modal fields (if exist)
        try {
          var elId = document.getElementById('modalTransactionId');
          if (elId) elId.textContent = tx.transaction_id || tx.txn_id || txn;
          var elDt = document.getElementById('modalTransactionDateTime');
          if (elDt) elDt.textContent = tx.transaction_date || tx.date_time || '';
          var elEmp = document.getElementById('modalEmployee');
          if (elEmp) elEmp.textContent = tx.employee_name || j.employee_name || '—';

          var body = document.getElementById('modalItemsList');
          if (body) {
            var items = j.items || tx.items || [];
            if (!items.length) body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:gray">No items</td></tr>';
            else {
              body.innerHTML = items.map(function (it) {
                var name = esc(it.product_name || it.product || it.name || '');
                var qty = esc(String(it.quantity || it.qty || 0));
                var price = Number(it.unit_price || it.price || it.amount || 0).toFixed(2);
                var sub = Number(it.subtotal || ((it.quantity || 0) * (it.unit_price || it.price || 0))).toFixed(2);
                return '<tr><td style="text-align:left">' + name + '</td><td style="text-align:center">' + qty + '</td><td style="text-align:right">₱' + price + '</td><td style="text-align:right">₱' + sub + '</td></tr>';
              }).join('');
            }
          }

          if (document.getElementById('modalSubtotal')) document.getElementById('modalSubtotal').textContent = '₱' + Number(tx.subtotal || 0).toFixed(2);
          if (document.getElementById('modalTax')) document.getElementById('modalTax').textContent = '₱' + Number(tx.tax !== undefined && tx.tax !== null ? tx.tax : (Number(tx.subtotal || 0) * 0.12)).toFixed(2);
          if (document.getElementById('modalTotal')) document.getElementById('modalTotal').textContent = '₱' + Number(tx.total || tx.total_amount || 0).toFixed(2);

          var modal = document.getElementById('transactionModal');
          if (modal) modal.style.display = 'flex';
        } catch (e) {
          console.error('populate modal error', e);
        }
      })
      .catch(function (err) {
        console.error('details fetch error', err);
        alert('Failed to fetch details — see console');
      });
  }

  // Close modal (exposed for HTML button)
  window.closeTransactionModal = function () {
    var modal = document.getElementById('transactionModal');
    if (modal) modal.style.display = 'none';
  };

  // Close modal on overlay click and Esc
  (function modalMisc() {
    document.addEventListener('click', function (ev) {
      var modal = document.getElementById('transactionModal');
      if (!modal) return;
      if (ev.target === modal) modal.style.display = 'none';
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        var modal = document.getElementById('transactionModal');
        if (modal && modal.style.display === 'flex') modal.style.display = 'none';
      }
    });
  })();

  // Remove transaction
  function removeTransaction(txn) {
    fetch(DELETE_API, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'id=' + encodeURIComponent(txn)
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        if (j && j.success) {
          alert('Deleted');
          // if original loader exists call it, else fallback
          if (typeof window.__adminLoadTransactions_original === 'function') {
            try { window.__adminLoadTransactions_original(); return; } catch (e) { console.error(e); }
          }
          renderListFallback();
        } else alert('Delete failed: ' + (j && j.message ? j.message : 'unknown'));
      }).catch(function (e) { console.error('delete error', e); alert('Delete failed — see console'); });
  }

  // Fallback renderer (fetches list and populates tbody)
  function renderListFallback(filters) {
    filters = filters || {};
    // ensure tbody exists (create one if missing)
    var table = document.querySelector('.data-table');
    var tb = getTbody();
    if (!tb) {
      if (!table) {
        console.warn('renderListFallback: .data-table not found; aborting render.');
        return;
      }
      // create tbody and attach id so future code can find it
      tb = document.createElement('tbody');
      tb.id = TB_ID || 'txBody';
      table.appendChild(tb);
      console.log('renderListFallback: created tbody #' + tb.id);
    }

  setMessage(tb, 'Loading transactions...');

    var url = LIST_API;

  if (filters && (filters.date || filters.employee)) {
    var params = [];
    if (filters.date) params.push("date=" + encodeURIComponent(filters.date));
    if (filters.employee) params.push("employee=" + encodeURIComponent(filters.employee));
    url += "?" + params.join("&");
  }

  fetch(url, { credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (j) {
      var rows = (j && (j.transactions || j.data)) || [];
      if (!rows.length) { setMessage(tb, 'No transactions found.', 'gray'); return; }

      var out = [];
      rows.forEach(function (r) {
        var txn = esc(r.transaction_id || r.txn_id || r.id || '');
        var date = esc(r.transaction_date || r.date_time || r.date || '');
        var emp = esc(r.employee_name || r.employee_id || '—');
        var total = Number(r.total_amount || r.total || r.subtotal || 0).toFixed(2);
        var itemsCount = (r.items && Array.isArray(r.items)) ? r.items.length : (r.items_count || '—');

        out.push(
          '<tr data-txn="' + txn + '">',
          '<td>' + txn + '</td>',
          '<td>' + date + '</td>',
          '<td>' + emp + '</td>',
          '<td style="text-align:center"><button class="view-btn" data-txn="' + txn + '">View</button></td>',
          '<td style="text-align:right">₱' + total + '</td>',
          '<td style="text-align:center"><button class="remove-btn" data-txn="' + txn + '">Remove</button></td>',
          '</tr>'
        );
      });
      tb.innerHTML = out.join('');
      attachRowHandlers(tb);
    })
    .catch(function (e) {
      console.error('list fetch error', e);
      setMessage(tb, 'Failed to load transactions', 'red');
    });
  }

  // Keep reference to any original loader BEFORE overriding
  if (typeof window.adminLoadTransactions === 'function' && !window.__adminLoadTransactions_original) {
    window.__adminLoadTransactions_original = window.adminLoadTransactions;
  }

  // Expose adminLoadTransactions wrapper
  window.adminLoadTransactions = function (filters) {
     return renderListFallback(filters || {});
  };

  // Periodic health-check to ensure table exists; if empty, reload (1s)
  var periodicId = setInterval(function () {
    var tb = getTbody();
    if (!tb || !tb.innerText || tb.innerText.trim() === '' || tb.innerText.toLowerCase().includes('loading')) {
      if (typeof window.adminLoadTransactions === 'function') {
        try { window.adminLoadTransactions(); return; } catch (e) { console.warn('adminLoadTransactions threw', e); }
      }
      renderListFallback();
    }
  }, 1000);

  // Allow cleanup
  window._transactionsAD_cleanup = function () {
    clearInterval(periodicId);
    console.log('transactions_AD: cleaned up');
  };

  // Initial run
  try {
    if (typeof window.adminLoadTransactions === 'function') window.adminLoadTransactions();
    else renderListFallback();
  } catch (e) {
    renderListFallback();
  }

  window.applyFilters = function () {
    var date = document.getElementById('dateFilter')?.value || null;
    var emp = document.getElementById('employeeFilter')?.value || null;
    adminLoadTransactions({ date: date, employee: emp });
  };

  window.clearFilters = function () {
    var df = document.getElementById('dateFilter');
    var ef = document.getElementById('employeeFilter');

    if (df) df.value = '';
    if (ef) ef.selectedIndex = 0;

    adminLoadTransactions({});
  };

})();
