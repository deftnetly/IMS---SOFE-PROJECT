/* categories_AD.js — shows C001 from category_id, uses internal id for ops
   NOTE: uses button classes 'action-button edit-button delete-button'
   so your CSS for those classes will apply.
*/

(function(){
  // compute API base using script src to avoid path issues
  function computeBase() {
    let src = (document.currentScript && document.currentScript.src) || '';
    if (!src) {
      const scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        const s = scripts[i].src || '';
        if (s.indexOf('categories_AD.js') !== -1) { src = s; break; }
      }
    }
    if (!src) {
      const adminFolder = window.location.pathname.replace(/\/[^\/]*$/, '');
      return window.location.origin + adminFolder + '/2_categories';
    }
    return src.replace(/\/[^\/]*$/, '');
  }
  const API = computeBase();

  let categoriesData = [];
  let editingInternalId = null;

  function $id(id){ return document.getElementById(id); }
  function escapeHtml(s){ if(s===null||s===undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function codeFromNumber(n){ return 'C' + String(n).padStart(3,'0'); }

  async function loadCategories() {
    try {
      const res = await fetch(API + '/get_categories.php', {cache:'no-store'});
      if (!res.ok) { console.error('get_categories.php returned', res.status); return; }
      const json = await res.json();
      if (json && json.success) {
        categoriesData = json.data;
        renderTable();
      } else {
        console.error('Failed loading categories', json);
      }
    } catch (e) { console.error(e); alert('Error loading categories. See console.'); }
  }

  function renderTable(){
    const tbody = $id('categoriesTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    categoriesData.forEach(cat => {
      const tr = document.createElement('tr');
      tr.dataset.internalId = cat.id; // internal id
      tr.innerHTML = `
        <td class="col-id">${escapeHtml(codeFromNumber(cat.category_id))}</td>
        <td class="col-name">${escapeHtml(cat.category_name)}</td>
        <td class="col-desc">${escapeHtml(cat.description)}</td>
        <td class="col-actions">
          <button class="action-button edit-button">Edit</button>
          <button class="action-button delete-button">Delete</button>
        </td>
      `;
      // attach handlers using the classes your CSS expects
      const editBtn = tr.querySelector('.edit-button');
      const delBtn = tr.querySelector('.delete-button');

      if (editBtn) editBtn.addEventListener('click', () => openEditModal(cat));
      if (delBtn) delBtn.addEventListener('click', () => confirmDelete(cat));

      tbody.appendChild(tr);
    });
  }

  function openEditModal(cat) {
    editingInternalId = cat.id;
    $id('categoryName').value = cat.category_name || '';
    $id('description').value = cat.description || '';
    const modal = $id('categoryModal'); if(modal) modal.style.display = 'block';
    const title = modal.querySelector('h3'); if(title) title.textContent = 'Edit Category';
    const submitBtn = modal.querySelector('.submit-button'); if(submitBtn) submitBtn.textContent = 'Update Category';
  }

  function openAddModal() {
    editingInternalId = null;
    const form = $id('addCategoryForm'); if (form) form.reset();
    const modal = $id('categoryModal'); if(modal) modal.style.display = 'block';
    const title = modal.querySelector('h3'); if(title) title.textContent = 'Add New Category';
    const submitBtn = modal.querySelector('.submit-button'); if(submitBtn) submitBtn.textContent = 'Add Category';
  }

  function closeModal(){ const m = $id('categoryModal'); if(m) m.style.display = 'none'; editingInternalId = null; }

  async function submitForm(e){
    e.preventDefault();
    const name = ($id('categoryName').value || '').trim();
    const desc = ($id('description').value || '').trim();
    if(!name){ alert('Enter category name'); return; }

    if (editingInternalId) {
      // update
      try {
        const res = await fetch(API + '/update_category.php', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: editingInternalId, category_name: name, description: desc })
        });
        const json = await res.json();
        if (json && json.success) {
          await loadCategories(); closeModal();
        } else alert('Update failed: '+(json.error||'unknown'));
      } catch (err){ console.error(err); alert('Update error'); }
    } else {
      // add
      try {
        const res = await fetch(API + '/add_category.php', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ category_name: name, description: desc })
        });
        const json = await res.json();
        if (json && json.success) {
          await loadCategories(); closeModal();
        } else alert('Add failed: '+(json.error||'unknown'));
      } catch (err){ console.error(err); alert('Add error'); }
    }
  }

  async function confirmDelete(cat) {
    if (!confirm('Delete this category?')) return;
    try {
      // delete by internal id
      const res = await fetch(API + '/delete_category.php', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id: cat.id })
      });
      const json = await res.json();
      if (json && json.success) {
        await loadCategories();
      } else alert('Delete failed: '+(json.error||'unknown'));
    } catch (err) { console.error(err); alert('Delete error'); }
  }

  function initUI(){
    const addBtn = document.querySelector('.add-button'); if (addBtn) addBtn.onclick = openAddModal;
    const form = $id('addCategoryForm'); if (form) { form.removeEventListener('submit', submitForm); form.addEventListener('submit', submitForm); }
    const closeBtn = $id('categoryModalClose'); if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { const modal = $id('categoryModal'); if (modal && e.target === modal) closeModal(); });

    loadCategories();
  }

  // wire to loader
  document.addEventListener('sectionLoaded', (e) => {
    if (!e.detail || !e.detail.section) return;
    const sec = e.detail.section;
    if (sec === 'categories' || sec === 'categories_AD') setTimeout(initUI, 10);
  });

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if ($id('categoriesTbody')) initUI(); }, 20);
  });

  // expose (debug)
  window.__CATEGORIES_API_BASE = API;
})();
