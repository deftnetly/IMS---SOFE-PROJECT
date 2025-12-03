// employees_AD.js — replacement to ensure buttons use correct classes
// - robust endpoint fallback
// - idempotent (safe to append multiple times)
// - renders action buttons with correct classes so content.css styles apply

if (window.__employeesModuleLoaded) {
  // if module already loaded, re-run init to bind DOM again
  if (typeof window.__employeesInit === 'function') {
    try {
      window.__employeesInit();
    } catch (e) { console.warn('employees re-init failed', e); }
  }
} else {
  window.__employeesModuleLoaded = true;

  (function () {

    // ---------------- utilities ----------------
    const q = (s, r=document) => r.querySelector(s);
    const qa = (s, r=document) => Array.from(r.querySelectorAll(s));
    const esc = s => (s===null||s===undefined) ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    // determine script base candidates
    const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || (function(){
      const scripts = Array.from(document.getElementsByTagName('script')).reverse();
      for (const s of scripts) if (s.src && s.src.includes('employees_AD')) return s.src;
      return window.location.href;
    })();

    const SCRIPT_BASE = (function(s){
      try { return new URL('.', s).href; } catch(e) { return window.location.href.substring(0, window.location.href.lastIndexOf('/')+1); }
    })(SCRIPT_SRC);

    function guessAdminEmployeesBase(){
      try {
        const marker = '/src/pages/admin/';
        const p = window.location.pathname;
        const i = p.indexOf(marker);
        if (i !== -1) return window.location.origin + p.substring(0, i + marker.length) + '4_employees/';
      } catch(e){}
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
              const json = await res.json().catch(()=>null);
              if (json !== null) return { res, body: json, url };
            } else {
              const txt = await res.text().catch(()=>null);
              return { res, body: txt, url };
            }
          } else {
            lastErr = { res, url };
          }
        } catch (err) { lastErr = err; }
      }
      throw lastErr || new Error('All candidates failed for ' + name);
    }

    // ---------------- module state ----------------
    let employees = [];
    let editingCode = null;

    // ---------------- render ----------------
    function renderEmployeesTable() {
      const tbody = document.getElementById('employeesTbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      (employees || []).forEach(emp => {
        const tr = document.createElement('tr');
        tr.dataset.code = emp.employee_code || '';

        // Build actions HTML with proper classes so content.css applies
        const editBtnHtml = `<button type="button" class="action-button edit-button" data-code="${esc(emp.employee_code)}">Edit</button>`;
        const deleteBtnHtml = `<button type="button" class="action-button delete-button" data-code="${esc(emp.employee_code)}">Delete</button>`;

        tr.innerHTML = `
          <td>${esc(emp.employee_code)}</td>
          <td>${esc(emp.full_name)}</td>
          <td>${esc(emp.email||'')}</td>
          <td>${esc(emp.phone||'')}</td>
          <td>${esc(emp.username||'')}</td>
          <td>•••••••</td>
          <td class="employees-actions">${editBtnHtml} ${deleteBtnHtml}</td>
        `;

        tbody.appendChild(tr);
      });

      // attach event listeners (delegation is fine too; here we attach per-row)
      qa('button.edit-button', tbody).forEach(b => {
        b.removeEventListener('click', onEditButton);
        b.addEventListener('click', onEditButton);
      });
      qa('button.delete-button', tbody).forEach(b => {
        b.removeEventListener('click', onDeleteButton);
        b.addEventListener('click', onDeleteButton);
      });
      // NOTE: removed per-row reset-pass-btn listener — Reset is now in modal.
    }

    // ---------------- handlers ----------------
    function onEditButton(e) {
      const code = e.currentTarget.getAttribute('data-code');
      const emp = employees.find(x => x.employee_code === code);
      if (emp) openEditModal(emp);
    }
    function onDeleteButton(e) {
      const code = e.currentTarget.getAttribute('data-code');
      onDeleteEmployee(code);
    }
    function onResetButton(e) {
      const code = e.currentTarget.getAttribute('data-code');
      onResetPassword(code);
    }

    function openAddModal() {
      editingCode = null;
      const form = document.getElementById('employeeForm');
      if (form) form.reset();
      const codeEl = document.getElementById('employeeCode'); if (codeEl) codeEl.value = '';
      const title = document.getElementById('modalTitle'); if (title) title.textContent = 'Add New Employee';
      const sb = document.querySelector('.submit-button'); if (sb) sb.textContent = 'Add Employee';
      const modal = document.getElementById('employeeModal'); if (modal) modal.style.display = 'block';

      // hide reset button in add mode
      const resetBtn = document.getElementById('resetPasswordModalBtn');
      if (resetBtn) { resetBtn.style.display = 'none'; resetBtn.onclick = null; }
    }
    function openEditModal(emp) {
      editingCode = emp.employee_code;
      document.getElementById('employeeCode').value = emp.employee_code;
      document.getElementById('employeeName').value = emp.full_name || '';
      document.getElementById('email').value = emp.email || '';
      document.getElementById('phone').value = emp.phone || '';
      document.getElementById('username').value = emp.username || '';
      document.getElementById('password').value = '';
      const title = document.getElementById('modalTitle'); if (title) title.textContent = 'Edit Employee';
      const sb = document.querySelector('.submit-button'); if (sb) sb.textContent = 'Update Employee';
      const modal = document.getElementById('employeeModal'); if (modal) modal.style.display = 'block';

      // show reset button in edit mode and wire it to the same reset handler
      const resetBtn = document.getElementById('resetPasswordModalBtn');
      if (resetBtn) {
        resetBtn.style.display = 'inline-block';
        resetBtn.onclick = function() {
          // call existing function that handles password reset (will prompt)
          onResetPassword(editingCode);
        };
      }
    }
    function closeModal() {
      const modal = document.getElementById('employeeModal'); if (modal) modal.style.display = 'none';
      editingCode = null;
    }

    // ---------------- CRUD with server ----------------
    async function loadEmployeesFromServer() {
      try {
        const { res, body } = await fetchWithFallback('get_employees.php', { credentials:'same-origin' });
        let data = body;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch(e) { data = null; }
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
        const ce = document.getElementById('employeeCode'); if (ce) ce.value = code;
      }
      // basic required fields
      const required = ['full_name','email','phone','username'];
      for (const k of required) {
        if (!fd.get(k) || String(fd.get(k)).trim()==='') { alert('Please fill required fields'); return; }
      }
      const pw = fd.get('password') || '';
      if (pw && !( /[A-Z]/.test(pw) && pw.length >= 8 )) { alert('Password must be 8+ and include uppercase (or leave blank)'); return; }

      try {
        const name = editingCode
        ? '/smart-inventory/src/pages/admin/4_employees/update_employee.php'
        : '/smart-inventory/src/pages/admin/4_employees/add_employee.php';

        const { res, body } = await fetchWithFallback(name, { method:'POST', body: fd, credentials:'same-origin' });
        let data = body;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch(e){ data = null; }
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
      if (!confirm('Delete this employee?')) return;
      try {
        const fd = new FormData(); fd.append('employee_code', code);
        const { res, body } = await fetchWithFallback('delete_employee.php', { method:'POST', body:fd, credentials:'same-origin' });
        let data = body;
        if (typeof data === 'string') try { data = JSON.parse(data); } catch(e){ data = null; }
        if (data && data.success) { await loadEmployeesFromServer(); return; }
        alert('Delete failed: ' + (data && data.message ? data.message : 'Unknown'));
      } catch (err) { console.error(err); alert('Delete error'); }
    }

    // ---------------- RESET function (replaced) ----------------
    async function onResetPassword(code) {
      const newPw = prompt('Enter new password (8+ chars incl. uppercase):');
      if (newPw === null) return;
      if (!(/([A-Z])/.test(newPw) && newPw.length >= 8)) {
        alert('Invalid password. It must be at least 8 characters and include an uppercase letter.');
        return;
      }

      // candidate endpoints to try (ordered most-likely -> less-likely)
      const candidates = [
        '/smart-inventory/src/pages/admin/4_employees/update_employee.php', // absolute - most likely correct
        '/smart-inventory/src/pages/admin/update_employee.php',
        '/smart-inventory/src/pages/admin/4_employees/add_employee.php',
        '/smart-inventory/src/pages/admin/add_employee.php',
        '/smart-inventory/src/pages/admin/4_employees/update_employee.php', // fallback duplicates are harmless
        'update_employee.php',
        './update_employee.php'
      ];


      let lastErr = null;
      for (const url of candidates) {
        try {
          console.log('Trying reset endpoint:', url);
          const fd = new FormData();
          fd.append('employee_code', code);
          fd.append('password', newPw);
          fd.append('action', 'reset_password');

          const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
          // try to read text first (so we can show errors even if not JSON)
          const text = await res.text().catch(()=>null);
          let data = text;
          try { data = JSON.parse(text); } catch(e){ /* not JSON, keep text */ }

          console.log('Response for', url, { status: res.status, ok: res.ok, bodyPreview: typeof text === 'string' ? text.slice(0,1000) : text });

          if (!res.ok) {
            // 404 / 500 etc. not acceptable — record and try next candidate
            lastErr = { url, status: res.status, statusText: res.statusText, body: text };
            continue;
          }

          // if server returned JSON-like object with success
          if (data && typeof data === 'object' && data.success) {
            alert('Password updated successfully.');
            return;
          }

          // server responded 200 but body doesn't signal success
          // show a helpful message and stop trying further endpoints (server might be reachable but logic failed)
          let message = 'Reset failed: server returned unexpected response.';
          if (data && data.message) message = 'Reset failed: ' + data.message;
          else if (typeof text === 'string' && text.trim()) message = 'Reset failed: server response: ' + text.slice(0,1000);
          alert(message);
          console.error('Reset failed (200) details for', url, { body: text, parsed: data });
          return;

        } catch (err) {
          console.warn('Request to', url, 'failed:', err);
          lastErr = { url, error: err && err.message ? err.message : String(err) };
          // try next candidate
          continue;
        }
      } // end for candidates

      // If we get here, all candidate endpoints failed
      console.error('All reset endpoints failed. Last error:', lastErr);
      alert('Network/server error when resetting password. Check console for details (404 or unreachable).');
    }

    // ---------------- init UI ----------------
    function initUI() {
      // add button
      const addBtn = document.querySelector('.add-button');
      if (addBtn) { addBtn.removeEventListener('click', openAddModal); addBtn.addEventListener('click', openAddModal); }

      // close modal (x)
      const closeBtn = document.querySelector('#employeeModal .close');
      if (closeBtn) { closeBtn.removeEventListener('click', closeModal); closeBtn.addEventListener('click', closeModal); }

      // form
      const form = document.getElementById('employeeForm');
      if (form) { form.removeEventListener('submit', submitFormHandler); form.addEventListener('submit', submitFormHandler); }

      // password toggle
      const toggle = document.getElementById('togglePassword');
      if (toggle && !toggle.__init) {
        toggle.__init = true;
        toggle.addEventListener('click', () => {
          const pw = document.getElementById('password'); if (!pw) return;
          pw.type = pw.type === 'password' ? 'text' : 'password';
          toggle.textContent = pw.type === 'password' ? '👁 Show' : '🙈 Hide';
        });
      }

      // outside click to close modal
      window.addEventListener('click', (ev) => {
        const modal = document.getElementById('employeeModal');
        if (modal && ev.target === modal) closeModal();
      });

      loadEmployeesFromServer();
    }

    // ---------------- re-init wrapper (exposed) ----------------
    window.__employeesInit = function() {
      try {
        if (typeof initEmployeesModule === 'function') {
          initEmployeesModule.__inited = false;
          initEmployeesModule();
        }
      } catch (err) { console.warn('re-init failed', err); }
    };

    // init function
    async function initEmployeesModule() {
      if (initEmployeesModule.__inited) return;
      initEmployeesModule.__inited = true;
      setTimeout(initUI, 8);
    }

    // auto-run and listen for Admin loader event
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initEmployeesModule);
    } else {
      Promise.resolve().then(initEmployeesModule);
    }
    document.addEventListener('sectionLoaded', (e) => {
      try { if (e?.detail?.section === 'employees_AD') initEmployeesModule(); } catch(e){}
    });

    // expose some helpers if HTML uses them (safe)
    window.openEmployeeModalForAdd = openAddModal;
    window.openEmployeeModalForEdit = function(code) { const emp = employees.find(e => e.employee_code === code); if (emp) openEditModal(emp); };
    window.closeEmployeeModal = closeModal;

  })();
}
