// employees_AD.js - replacement to ensure buttons use correct classes
// - robust endpoint fallback
// - idempotent (safe to append multiple times)
// - renders action buttons with correct classes so page styling applies

if (window.__employeesModuleLoaded) {
  if (typeof window.__employeesInit === 'function') {
    try {
      window.__employeesInit();
    } catch (e) {
      console.warn('employees re-init failed', e);
    }
  }
} else {
  window.__employeesModuleLoaded = true;

  (function () {
    const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
    const esc = s => (s === null || s === undefined) ? '' : String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

    const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || (function () {
      const scripts = Array.from(document.getElementsByTagName('script')).reverse();
      for (const s of scripts) {
        if (s.src && s.src.includes('employees_AD')) return s.src;
      }
      return window.location.href;
    })();

    const SCRIPT_BASE = (function (s) {
      try {
        return new URL('.', s).href;
      } catch (e) {
        return window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
      }
    })(SCRIPT_SRC);

    function guessAdminEmployeesBase() {
      try {
        const marker = '/src/pages/admin/';
        const p = window.location.pathname;
        const i = p.indexOf(marker);
        if (i !== -1) return window.location.origin + p.substring(0, i + marker.length) + '4_employees/';
      } catch (e) {}
      return SCRIPT_BASE;
    }

    const ADMIN_EMP_BASE = guessAdminEmployeesBase();

    async function fetchWithFallback(name, opts = {}) {
      const candidates = [
        new URL(name, SCRIPT_BASE).href,
        new URL(name, ADMIN_EMP_BASE).href,
        new URL(name, window.location.href).href
      ];
      let lastErr = null;
      for (const url of candidates) {
        try {
          const res = await fetch(url, opts);
          if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const json = await res.json().catch(() => null);
              if (json !== null) return { res, body: json, url };
            } else {
              const txt = await res.text().catch(() => null);
              return { res, body: txt, url };
            }
          } else {
            lastErr = { res, url };
          }
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr || new Error('All candidates failed for ' + name);
    }

    let employees = [];
    let editingCode = null;
    let employeeSearchTerm = '';

    function normalizePhone(value) {
      return String(value || '').replace(/\D/g, '').slice(0, 11);
    }

    function isValidPhMobile(value) {
      return /^09\d{9}$/.test(String(value || ''));
    }

    function getFilteredEmployees() {
      const term = String(employeeSearchTerm || '').trim().toLowerCase();
      if (!term) return employees || [];

      return (employees || []).filter(emp => {
        const code = String(emp.employee_code || '').toLowerCase();
        const name = String(emp.full_name || '').toLowerCase();
        const email = String(emp.email || '').toLowerCase();
        const username = String(emp.username || '').toLowerCase();
        return code.includes(term) || name.includes(term) || email.includes(term) || username.includes(term);
      });
    }

    function renderEmployeesTable() {
      const tbody = document.getElementById('employeesTbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      const filteredEmployees = getFilteredEmployees();
      if (!filteredEmployees.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:18px 12px;">No employees matched your search.</td></tr>';
        return;
      }

      filteredEmployees.forEach(emp => {
        const tr = document.createElement('tr');
        tr.dataset.code = emp.employee_code || '';

        const editBtnHtml = `<button type="button" class="action-button edit-button" data-code="${esc(emp.employee_code)}">Edit</button>`;
        const deleteBtnHtml = `<button type="button" class="action-button delete-button" data-code="${esc(emp.employee_code)}">Delete</button>`;

        tr.innerHTML = `
          <td><span class="employee-code">${esc(emp.employee_code)}</span></td>
          <td><span class="employee-name">${esc(emp.full_name)}</span></td>
          <td><span class="employee-email">${esc(emp.email || '')}</span></td>
          <td><span class="employee-phone">${esc(emp.phone || '')}</span></td>
          <td><span class="employee-username">${esc(emp.username || '')}</span></td>
          <td><span class="employee-password">•••••••</span></td>
          <td class="employees-actions">${editBtnHtml} ${deleteBtnHtml}</td>
        `;

        tbody.appendChild(tr);
      });

      qa('button.edit-button', tbody).forEach(b => {
        b.removeEventListener('click', onEditButton);
        b.addEventListener('click', onEditButton);
      });
      qa('button.delete-button', tbody).forEach(b => {
        b.removeEventListener('click', onDeleteButton);
        b.addEventListener('click', onDeleteButton);
      });
    }

    function onEditButton(e) {
      const code = e.currentTarget.getAttribute('data-code');
      const emp = employees.find(x => x.employee_code === code);
      if (emp) openEditModal(emp);
    }

    function onDeleteButton(e) {
      const code = e.currentTarget.getAttribute('data-code');
      onDeleteEmployee(code);
    }

    function openAddModal() {
      editingCode = null;
      const form = document.getElementById('employeeForm');
      if (form) form.reset();
      const codeEl = document.getElementById('employeeCode');
      if (codeEl) codeEl.value = '';
      const title = document.getElementById('modalTitle');
      if (title) title.textContent = 'Add New Employee';
      const sb = document.querySelector('.submit-button');
      if (sb) sb.textContent = 'Add Employee';
      const modal = document.getElementById('employeeModal');
      if (modal) modal.style.display = 'block';

      const resetBtn = document.getElementById('resetPasswordModalBtn');
      if (resetBtn) {
        resetBtn.style.display = 'none';
        resetBtn.onclick = null;
      }
    }

    function openEditModal(emp) {
      editingCode = emp.employee_code;
      document.getElementById('employeeCode').value = emp.employee_code;
      document.getElementById('employeeName').value = emp.full_name || '';
      document.getElementById('email').value = emp.email || '';
      document.getElementById('phone').value = emp.phone || '';
      document.getElementById('username').value = emp.username || '';
      document.getElementById('password').value = '';
      const title = document.getElementById('modalTitle');
      if (title) title.textContent = 'Edit Employee';
      const sb = document.querySelector('.submit-button');
      if (sb) sb.textContent = 'Update Employee';
      const modal = document.getElementById('employeeModal');
      if (modal) modal.style.display = 'block';

      const resetBtn = document.getElementById('resetPasswordModalBtn');
      if (resetBtn) {
        resetBtn.style.display = 'inline-block';
        resetBtn.onclick = function () {
          onResetPassword(editingCode);
        };
      }
    }

    function closeModal() {
      const modal = document.getElementById('employeeModal');
      if (modal) modal.style.display = 'none';
      editingCode = null;
    }

    async function loadEmployeesFromServer() {
      try {
        const { res, body } = await fetchWithFallback('get_employees.php', { credentials: 'same-origin' });
        let data = body;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            data = null;
          }
        }
        if (!res.ok || !data || !data.success) {
          employees = [];
          renderEmployeesTable();
          return;
        }
        employees = data.employees || [];
        renderEmployeesTable();
      } catch (err) {
        console.error('loadEmployeesFromServer error', err);
        employees = [];
        renderEmployeesTable();
      }
    }

    async function submitFormHandler(e) {
      e.preventDefault();
      const form = document.getElementById('employeeForm');
      if (!form) return;
      const fd = new FormData(form);
      if (!fd.get('employee_code') || String(fd.get('employee_code')).trim() === '') {
        const code = 'E' + Date.now().toString().slice(-6);
        fd.set('employee_code', code);
        const ce = document.getElementById('employeeCode');
        if (ce) ce.value = code;
      }

      const required = ['full_name', 'email', 'phone', 'username'];
      for (const k of required) {
        if (!fd.get(k) || String(fd.get(k)).trim() === '') {
          alert('Please fill required fields');
          return;
        }
      }

      const normalizedPhone = normalizePhone(fd.get('phone'));
      if (!isValidPhMobile(normalizedPhone)) {
        alert('Phone number must be a valid PH mobile number in 11-digit format, like 09171234567.');
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
          phoneInput.focus();
          phoneInput.select();
        }
        return;
      }
      fd.set('phone', normalizedPhone);
      const phoneInput = document.getElementById('phone');
      if (phoneInput) phoneInput.value = normalizedPhone;

      const pw = fd.get('password') || '';
      if (pw && !(/[A-Z]/.test(pw) && pw.length >= 8)) {
        alert('Password must be 8+ and include uppercase (or leave blank)');
        return;
      }

      try {
        const name = editingCode
          ? '/smart-inventory/src/pages/admin/4_employees/update_employee.php'
          : '/smart-inventory/src/pages/admin/4_employees/add_employee.php';

        const { res, body } = await fetchWithFallback(name, { method: 'POST', body: fd, credentials: 'same-origin' });
        let data = body;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            data = null;
          }
        }
        if (res.ok && data && data.success) {
          closeModal();
          await loadEmployeesFromServer();
          return;
        }
        alert('Save failed: ' + (data && data.message ? data.message : 'Unknown'));
      } catch (err) {
        console.error('submit error', err);
        alert('Network/server error');
      }
    }

    async function onDeleteEmployee(code) {
      const confirmed = typeof window.showDeleteConfirm === 'function'
        ? await window.showDeleteConfirm({
            title: 'Delete Employee',
            message: 'Do you want to permanently delete this employee? This cannot be undone.',
            confirmLabel: 'Delete Employee'
          })
        : confirm('Do you want to permanently delete this employee?\n\nThis cannot be undone.');
      if (!confirmed) return;
      try {
        const fd = new FormData();
        fd.append('employee_code', code);
        const { body } = await fetchWithFallback('delete_employee.php', { method: 'POST', body: fd, credentials: 'same-origin' });
        let data = body;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            data = null;
          }
        }
        if (data && data.success) {
          await loadEmployeesFromServer();
          return;
        }
        alert('Delete failed: ' + (data && data.message ? data.message : 'Unknown'));
      } catch (err) {
        console.error(err);
        alert('Delete error');
      }
    }

    async function onResetPassword(code) {
      const newPw = prompt('Enter new password (8+ chars incl. uppercase):');
      if (newPw === null) return;
      if (!(/([A-Z])/.test(newPw) && newPw.length >= 8)) {
        alert('Invalid password. It must be at least 8 characters and include an uppercase letter.');
        return;
      }

      const candidates = [
        '/smart-inventory/src/pages/admin/4_employees/update_employee.php',
        '/smart-inventory/src/pages/admin/update_employee.php',
        '/smart-inventory/src/pages/admin/4_employees/add_employee.php',
        '/smart-inventory/src/pages/admin/add_employee.php',
        'update_employee.php',
        './update_employee.php'
      ];

      let lastErr = null;
      for (const url of candidates) {
        try {
          const fd = new FormData();
          fd.append('employee_code', code);
          fd.append('password', newPw);
          fd.append('action', 'reset_password');

          const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
          const text = await res.text().catch(() => null);
          let data = text;
          try {
            data = JSON.parse(text);
          } catch (e) {}

          if (!res.ok) {
            lastErr = { url, status: res.status, statusText: res.statusText, body: text };
            continue;
          }

          if (data && typeof data === 'object' && data.success) {
            alert('Password updated successfully.');
            return;
          }

          let message = 'Reset failed: server returned unexpected response.';
          if (data && data.message) message = 'Reset failed: ' + data.message;
          else if (typeof text === 'string' && text.trim()) message = 'Reset failed: server response: ' + text.slice(0, 1000);
          alert(message);
          return;
        } catch (err) {
          lastErr = { url, error: err && err.message ? err.message : String(err) };
        }
      }

      console.error('All reset endpoints failed. Last error:', lastErr);
      alert('Network/server error when resetting password. Check console for details.');
    }

    function initUI() {
      const addBtn = document.querySelector('.add-button');
      if (addBtn) {
        addBtn.removeEventListener('click', openAddModal);
        addBtn.addEventListener('click', openAddModal);
      }

      const searchInput = document.getElementById('employeeSearch');
      if (searchInput && !searchInput.__init) {
        searchInput.__init = true;
        searchInput.addEventListener('input', () => {
          employeeSearchTerm = searchInput.value || '';
          renderEmployeesTable();
        });
      }
      const clearBtn = document.getElementById('employeeSearchClear');
      if (clearBtn && !clearBtn.__init) {
        clearBtn.__init = true;
        clearBtn.addEventListener('click', () => {
          const input = document.getElementById('employeeSearch');
          if (!input) return;
          input.value = '';
          employeeSearchTerm = '';
          renderEmployeesTable();
          input.focus();
        });
      }

      const closeBtn = document.querySelector('#employeeModal .close');
      if (closeBtn) {
        closeBtn.removeEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
      }

      const form = document.getElementById('employeeForm');
      if (form) {
        form.removeEventListener('submit', submitFormHandler);
        form.addEventListener('submit', submitFormHandler);
      }

      const toggle = document.getElementById('togglePassword');
      if (toggle && !toggle.__init) {
        toggle.__init = true;
        toggle.addEventListener('click', () => {
          const pw = document.getElementById('password');
          if (!pw) return;
          pw.type = pw.type === 'password' ? 'text' : 'password';
          toggle.textContent = pw.type === 'password' ? 'Show' : 'Hide';
        });
      }

      const phoneInput = document.getElementById('phone');
      if (phoneInput && !phoneInput.__init) {
        phoneInput.__init = true;
        phoneInput.addEventListener('input', () => {
          phoneInput.value = normalizePhone(phoneInput.value);
        });
      }

      window.addEventListener('click', (ev) => {
        const modal = document.getElementById('employeeModal');
        if (modal && ev.target === modal) closeModal();
      });

      loadEmployeesFromServer();
    }

    window.__employeesInit = function () {
      try {
        if (typeof initEmployeesModule === 'function') {
          initEmployeesModule.__inited = false;
          initEmployeesModule();
        }
      } catch (err) {
        console.warn('re-init failed', err);
      }
    };

    async function initEmployeesModule() {
      if (initEmployeesModule.__inited) return;
      initEmployeesModule.__inited = true;
      setTimeout(initUI, 8);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initEmployeesModule);
    } else {
      Promise.resolve().then(initEmployeesModule);
    }

    document.addEventListener('sectionLoaded', (e) => {
      try {
        if (e?.detail?.section === 'employees_AD') initEmployeesModule();
      } catch (err) {}
    });

    window.openEmployeeModalForAdd = openAddModal;
    window.openEmployeeModalForEdit = function (code) {
      const emp = employees.find(e => e.employee_code === code);
      if (emp) openEditModal(emp);
    };
    window.closeEmployeeModal = closeModal;
  })();
}
