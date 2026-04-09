// transactions_AD.js - JS-only fix: View in Items column + working modal close
(function () {
  'use strict';

  if (window.__transactionsAD_fixed_v6) {
    console.log('transactions_AD.js: already loaded (v6).');
    return;
  }
  window.__transactionsAD_fixed_v6 = true;

  var TB_ID = 'txBody';
  var LIST_API = '/smart-inventory/src/pages/admin/5_transactions/get_transactions.php';
  var DETAILS_API = '/smart-inventory/src/pages/admin/5_transactions/get_transaction_details.php';
  var DELETE_API = '/smart-inventory/src/pages/admin/5_transactions/delete_transaction.php';
  var EMPLOYEES_API = '/smart-inventory/src/pages/admin/4_employees/get_employees.php';

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

  function populateEmployeeFilter(items) {
    var select = document.getElementById('employeeFilter');
    if (!select) return;

    var previous = select.value || '';
    select.innerHTML = '<option value="">All Employees</option>';

    (items || []).forEach(function (emp) {
      var name = String(emp.full_name || emp.employee_name || '').trim();
      if (!name) return;
      var option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });

    if (previous) select.value = previous;
    renderEmployeeFilterMenu();
  }

  function renderEmployeeFilterMenu() {
    var select = document.getElementById('employeeFilter');
    var menu = document.getElementById('employeeFilterMenu');
    var label = document.getElementById('employeeFilterLabel');
    if (!select || !menu || !label) return;

    var current = select.value || '';
    label.textContent = current || 'All Employees';
    menu.innerHTML = '';

    Array.prototype.forEach.call(select.options, function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'employee-filter-option' + (opt.value === current ? ' is-active' : '');
      btn.textContent = opt.textContent;
      btn.setAttribute('data-value', opt.value);
      btn.onclick = function () {
        select.value = opt.value;
        label.textContent = opt.textContent;
        renderEmployeeFilterMenu();
        closeEmployeeFilterMenu();
      };
      menu.appendChild(btn);
    });
  }

  function closeEmployeeFilterMenu() {
    var control = document.getElementById('employeeFilterControl');
    if (control) control.classList.remove('open');
  }

  function bindEmployeeFilterMenu() {
    var control = document.getElementById('employeeFilterControl');
    var trigger = document.getElementById('employeeFilterTrigger');
    var select = document.getElementById('employeeFilter');
    if (!control || !trigger || !select || trigger.__bound) return;

    trigger.__bound = true;
    trigger.onclick = function () {
      control.classList.toggle('open');
      renderEmployeeFilterMenu();
    };

    document.addEventListener('click', function (ev) {
      if (!control.contains(ev.target)) closeEmployeeFilterMenu();
    });

    select.addEventListener('change', renderEmployeeFilterMenu);
    renderEmployeeFilterMenu();
  }

  function loadEmployeeFilterOptions() {
    var select = document.getElementById('employeeFilter');
    if (!select) return Promise.resolve();

    return fetch(EMPLOYEES_API, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        var rows = (j && (j.employees || j.data)) || [];
        populateEmployeeFilter(rows);
      })
      .catch(function (err) {
        console.error('employee filter load error', err);
        populateEmployeeFilter([]);
      });
  }

  function actionButtonHtml(kind, txn) {
    var isView = kind === 'view';
    var cls = isView ? 'view-btn' : 'remove-btn';
    var label = isView ? 'View' : 'Remove';
    var shadow = isView ? 'rgba(234,88,12,0.18)' : 'rgba(220,38,38,0.18)';
    var background = isView
      ? '#f97316'
      : 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)';

    return '<button class="' + cls + '" data-txn="' + txn + '" style="border:none;border-radius:999px;padding:8px 16px;background:' + background + ';color:#fff;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 8px 18px ' + shadow + ';transition:transform 0.18s ease,box-shadow 0.18s ease,opacity 0.18s ease;">' + label + '</button>';
  }

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
      btn.onclick = async function () {
        var txn = btn.getAttribute('data-txn');
        if (!txn) return;
        var confirmed = typeof window.showDeleteConfirm === 'function'
          ? await window.showDeleteConfirm({
              title: 'Delete Transaction',
              message: 'Do you want to permanently delete transaction ' + txn + '? This cannot be undone.',
              confirmLabel: 'Delete Transaction'
            })
          : confirm('Do you want to permanently delete transaction ' + txn + '?\n\nThis cannot be undone.');
        if (!confirmed) return;
        removeTransaction(txn);
      };
    });
  }

  function openDetails(txn) {
    fetch(DETAILS_API + '?id=' + encodeURIComponent(txn), { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || !j.success) {
          alert(j && j.message ? j.message : 'Failed to load details');
          return;
        }
        var tx = j.transaction || j.data || j;
        try {
          var elId = document.getElementById('modalTransactionId');
          if (elId) elId.textContent = tx.transaction_id || tx.txn_id || txn;
          var elDt = document.getElementById('modalTransactionDateTime');
          if (elDt) elDt.textContent = tx.transaction_date || tx.date_time || '';
          var elEmp = document.getElementById('modalEmployee');
          if (elEmp) elEmp.textContent = tx.employee_name || j.employee_name || '-';

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
                return '<tr><td style="text-align:left;color:#7c2d12;font-weight:600;">' + name + '</td><td style="text-align:center;color:#6b7280;">' + qty + '</td><td style="text-align:right;color:#9a3412;font-weight:600;">&#8369;' + price + '</td><td style="text-align:right;color:#c2410c;font-weight:700;">&#8369;' + sub + '</td></tr>';
              }).join('');
            }
          }

          if (document.getElementById('modalSubtotal')) document.getElementById('modalSubtotal').innerHTML = '&#8369;' + Number(tx.subtotal || 0).toFixed(2);
          if (document.getElementById('modalTax')) document.getElementById('modalTax').innerHTML = '&#8369;' + Number(tx.tax !== undefined && tx.tax !== null ? tx.tax : (Number(tx.subtotal || 0) * 0.12)).toFixed(2);
          if (document.getElementById('modalTotal')) document.getElementById('modalTotal').innerHTML = '&#8369;' + Number(tx.total || tx.total_amount || 0).toFixed(2);

          var modal = document.getElementById('transactionModal');
          if (modal) modal.style.display = 'flex';
        } catch (e) {
          console.error('populate modal error', e);
        }
      })
      .catch(function (err) {
        console.error('details fetch error', err);
        alert('Failed to fetch details - see console');
      });
  }

  window.closeTransactionModal = function () {
    var modal = document.getElementById('transactionModal');
    if (modal) modal.style.display = 'none';
  };

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
          if (typeof window.__adminLoadTransactions_original === 'function') {
            try { window.__adminLoadTransactions_original(); return; } catch (e) { console.error(e); }
          }
          renderListFallback();
        } else {
          alert('Delete failed: ' + (j && j.message ? j.message : 'unknown'));
        }
      }).catch(function (e) { console.error('delete error', e); alert('Delete failed - see console'); });
  }

  function renderListFallback(filters) {
    filters = filters || {};
    var table = document.querySelector('.data-table');
    var tb = getTbody();
    if (!tb) {
      if (!table) {
        console.warn('renderListFallback: .data-table not found; aborting render.');
        return;
      }
      tb = document.createElement('tbody');
      tb.id = TB_ID || 'txBody';
      table.appendChild(tb);
      console.log('renderListFallback: created tbody #' + tb.id);
    }

    setMessage(tb, 'Loading transactions...');

    var url = LIST_API;
    if (filters && (filters.date || filters.employee)) {
      var params = [];
      if (filters.date) params.push('date=' + encodeURIComponent(filters.date));
      if (filters.employee) params.push('employee=' + encodeURIComponent(filters.employee));
      url += '?' + params.join('&');
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
          var emp = esc(r.employee_name || r.employee_id || '-');
          var total = Number(r.total_amount || r.total || r.subtotal || 0).toFixed(2);

          out.push(
            '<tr data-txn="' + txn + '">',
            '<td style="color:#9a3412;font-weight:700;">' + txn + '</td>',
            '<td style="color:#6b7280;">' + date + '</td>',
            '<td style="color:#7c2d12;font-weight:600;">' + emp + '</td>',
            '<td style="text-align:center">' + actionButtonHtml('view', txn) + '</td>',
            '<td style="text-align:right;color:#c2410c;font-weight:700;">&#8369;' + total + '</td>',
            '<td style="text-align:center">' + actionButtonHtml('remove', txn) + '</td>',
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

  if (typeof window.adminLoadTransactions === 'function' && !window.__adminLoadTransactions_original) {
    window.__adminLoadTransactions_original = window.adminLoadTransactions;
  }

  window.adminLoadTransactions = function (filters) {
    return renderListFallback(filters || {});
  };

  var periodicId = setInterval(function () {
    var tb = getTbody();
    if (!tb || !tb.innerText || tb.innerText.trim() === '' || tb.innerText.toLowerCase().includes('loading')) {
      if (typeof window.adminLoadTransactions === 'function') {
        try { window.adminLoadTransactions(); return; } catch (e) { console.warn('adminLoadTransactions threw', e); }
      }
      renderListFallback();
    }
  }, 1000);

  window._transactionsAD_cleanup = function () {
    clearInterval(periodicId);
    console.log('transactions_AD: cleaned up');
  };

  try {
    bindEmployeeFilterMenu();
    loadEmployeeFilterOptions();
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
    if (ef) {
      ef.selectedIndex = 0;
      renderEmployeeFilterMenu();
    }

    adminLoadTransactions({});
  };
})();
