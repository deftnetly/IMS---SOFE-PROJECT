/* products_AD.js
   Matches the provided HTML:
   - functions: openProductModal(), closeProductModal(), addProduct(event)
   - elements: categoryListDisplay, category select, addProductForm, productsTbody
   Uses DB APIs in ../3_products: get_products.php, add_product.php, update_product.php, delete_product.php
*/

(function () {
  // compute API base for /3_products folder
  function computeApiBase() {
    let src = (document.currentScript && document.currentScript.src) || '';
    if (!src) {
      const scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        const s = scripts[i].src || '';
        if (s.indexOf('products_AD.js') !== -1) { src = s; break; }
      }
    }
    if (!src) {
      const adminFolder = window.location.pathname.replace(/\/[^\/]*$/, '');
      return window.location.origin + adminFolder + '/3_products';
    }
    return src.replace(/\/[^\/]*$/, '');
  }
  const API_BASE = computeApiBase();
  const PRODUCTS_API = API_BASE + '/get_products.php';
  const ADD_PRODUCT_API = API_BASE + '/add_product.php';
  const UPDATE_PRODUCT_API = API_BASE + '/update_product.php';
  const DELETE_PRODUCT_API = API_BASE + '/delete_product.php';
  const CATEGORIES_API = API_BASE.replace(/\/3_products$/, '/2_categories') + '/get_categories.php';

  // state
  let categories = []; // { id, category_id, category_name, code }
  let products = [];   // loaded from products API
  let editingProductId = null; // internal product id when editing

  // helpers
  const $ = id => document.getElementById(id);
  const esc = v => v == null ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function codeFromCategory(c) {
    return c.code || ('C' + String(c.category_id || c.category_number || c.id || '').padStart(3, '0'));
  }

  /* ---------- Categories ---------- */
  async function loadCategories() {
    try {
      // prefer global var if categories module set it
      let base = window.__CATEGORIES_API_BASE || '';
      if (!base) base = CATEGORIES_API.replace('/get_categories.php', '');
      const url = base.replace(/\/$/, '') + '/get_categories.php';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('categories API ' + res.status);
      const json = await res.json();
      if (!json || !json.success) throw new Error('invalid categories payload');
      categories = json.data.map(c => ({
        id: c.id,
        category_id: Number(c.category_id),
        category_name: c.category_name,
        code: c.code || c.category_code || ('C' + String(c.category_id).padStart(3, '0'))
      }));
    } catch (err) {
      console.error('loadCategories error', err);
      categories = [];
    }
    renderCategoryListAndSelect();
  }

  function renderCategoryListAndSelect() {
    const sel = $('category');
    const list = $('categoryListDisplay');
    if (!sel || !list) return;
    sel.innerHTML = '<option value="">Select Category</option>';
    list.innerHTML = '';
    if (!categories.length) {
      const li = document.createElement('li'); li.textContent = 'No categories.'; list.appendChild(li);
      return;
    }
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = String(c.id); // internal id (stable)
      opt.textContent = `${c.code} - ${c.category_name}`;
      sel.appendChild(opt);

      const li = document.createElement('li');
      li.textContent = `${c.code} - ${c.category_name}`;
      list.appendChild(li);
    });
  }

  /* ---------- Products ---------- */
  async function loadProducts() {
    try {
      const res = await fetch(PRODUCTS_API, { cache: 'no-store' });
      if (!res.ok) throw new Error('products API ' + res.status);
      const json = await res.json();
      if (!json || !json.success) throw new Error('invalid products payload');
      products = json.data;
    } catch (err) {
      console.error('loadProducts error', err);
      products = [];
    }
    renderProductsTable();
  }

  function renderProductsTable() {
    const tbody = $('productsTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    products.forEach(p => {
      const tr = document.createElement('tr');

      // Product ID (use product_code if exists)
      const code = p.product_code || ('P' + String(p.id).padStart(3, '0'));
      const catDisplay = (p.category_code ? (p.category_code + ' - ' + p.category_name) : (p.category_name || ''));

      // Correct stock classification: 0 -> unavailable, <=20 -> low, <=40 -> medium, >40 -> high
      const stockNum = Number(p.stock) || 0;

      // decide stock class and status text
      let stockClass = 'stock-high';
      let statusText = 'High';

      if (stockNum <= 0) {
        stockClass = 'stock-unavailable';
        statusText = 'Unavailable';
      } else if (stockNum <= 20) {
        stockClass = 'stock-low';
        statusText = 'Low';
      } else if (stockNum <= 40) {
        stockClass = 'stock-medium';
        statusText = 'Medium';
      } else {
        stockClass = 'stock-high';
        statusText = 'High';
      }

      // use the SAME stockClass for the status cell so text color matches the number
      const statusClass = stockClass;

      tr.innerHTML = `
        <td class="col-id">${esc(code)}</td>
        <td class="col-name">${esc(p.product_name)}</td>
        <td class="col-cat">${esc(catDisplay)}</td>
        <td class="col-price">₱${Number(p.price).toFixed(2)}</td>
        <td class="col-stock ${stockClass}">${esc(p.stock)}</td>
        <td class="col-date">${esc(p.date_added)}</td>
        <td class="col-status ${statusClass}">${statusText}</td>
        <td class="col-actions">
          <button class="action-button edit-button">Edit</button>
          <button class="action-button delete-button">Delete</button>
        </td>
      `;
      // attach handlers
      const editBtn = tr.querySelector('.edit-button');
      const delBtn = tr.querySelector('.delete-button');

      if (editBtn) editBtn.addEventListener('click', () => openEditProductModal(p));
      if (delBtn) delBtn.addEventListener('click', () => deleteProduct(p.id));

      tbody.appendChild(tr);
    });
  }

  /* ---------- Modal mode helper (ADDED) ---------- */
  function setModalMode(mode) {
    // mode: 'add' or 'edit'
    const titleEl = document.getElementById('productModalTitle') || document.querySelector('#productModal h2');
    const submitBtn = document.getElementById('productSubmitBtn') || document.querySelector('#productModal button[type="submit"], #productModal .submit-button');
    if (mode === 'edit') {
      if (titleEl) titleEl.textContent = 'Edit Product';
      if (submitBtn) {
        if (submitBtn.tagName === 'INPUT') submitBtn.value = 'Save Changes';
        else submitBtn.textContent = 'Save Changes';
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add New Product';
      if (submitBtn) {
        if (submitBtn.tagName === 'INPUT') submitBtn.value = 'Add Product';
        else submitBtn.textContent = 'Add Product';
      }
    }
  }

  /* ---------- Modal controls & form ---------- */
  window.openProductModal = function () {
    // reset form for add
    editingProductId = null;
    const form = $('addProductForm');
    if (form) form.reset();
    setModalMode('add');
    const modal = $('productModal'); if (modal) modal.style.display = 'block';
  };

  window.closeProductModal = function () {
    const modal = $('productModal'); if (modal) modal.style.display = 'none';
    editingProductId = null;
    const form = $('addProductForm'); if (form) form.reset();
    setModalMode('add');
  };

  function openEditProductModal(product) {
    editingProductId = product.id;
    // ensure the hidden id exists and set it
    const idEl = document.getElementById('productId') || (function(){
      const f = document.getElementById('addProductForm');
      if (!f) return null;
      const h = document.createElement('input');
      h.type = 'hidden'; h.id = 'productId'; h.name = 'id';
      f.appendChild(h);
      return h;
    })();
    if (idEl) idEl.value = editingProductId;

    setModalMode('edit');
    const modal = $('productModal'); if (modal) modal.style.display = 'block';

    // fill form fields
    if ($('productName')) $('productName').value = product.product_name || '';
    // set category select to internal id (product.category_internal_id might be provided)
    const internalCatId = (product.category_internal_id !== undefined && product.category_internal_id !== null) ? product.category_internal_id : (product.category_id || '');
    if ($('category')) {
      if (internalCatId) $('category').value = String(internalCatId);
      else $('category').value = '';
    }

    if ($('price')) $('price').value = (product.price != null) ? Number(product.price) : 0;
    if ($('stock')) $('stock').value = (product.stock != null) ? Number(product.stock) : 0;

  }

  // called from form onsubmit
  window.addProduct = async function (evt) {
    if (evt) evt.preventDefault();

    const name = ($('productName').value || '').trim();
    const categoryInternalId = $('category').value || '';
    let price = parseFloat($('price').value);
    if (isNaN(price)) price = 0.00;
    let stock = parseInt($('stock').value, 10);
    if (isNaN(stock)) stock = 0;
    const status = $('status') ? $('status').value : 'available';

    if (!name || !categoryInternalId) {
      alert('Please enter product name and choose a category.');
      return false;
    }

    // If status = unavailable, force stock = 0
    if (status === 'unavailable') stock = 0;

    try {
      if (editingProductId) {
        // update
        const res = await fetch(UPDATE_PRODUCT_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProductId,
            product_name: name,
            category_internal_id: Number(categoryInternalId),
            price: price,
            stock: stock
          })
        });
        const j = await res.json();
        if (!j || !j.success) throw new Error(j && j.error ? j.error : 'Update failed');
        await loadProducts();
        closeProductModal();
      } else {
        // add
        const res = await fetch(ADD_PRODUCT_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_name: name,
            category_internal_id: Number(categoryInternalId),
            price: price,
            stock: stock
          })
        });
        const j = await res.json();
        if (!j || !j.success) throw new Error(j && j.error ? j.error : 'Add failed');
        await loadProducts();
        closeProductModal();
      }
    } catch (err) {
      console.error('addProduct error', err);
      alert('Save failed: ' + (err.message || err));
    }

    return false; // prevent default
  };

  /* ---------- Delete ---------- */
  async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;
    try {
      const res = await fetch(DELETE_PRODUCT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId })
      });
      const j = await res.json();
      if (!j || !j.success) throw new Error(j && j.error ? j.error : 'Delete failed');
      await loadProducts();
    } catch (err) {
      console.error('deleteProduct error', err);
      alert('Delete failed: ' + (err.message || err));
    }
  }

  /* ---------- Init ---------- */
  async function initializeProductsPage() {
    // hook up form submit (form has onsubmit inline but safe to attach too)
    const form = $('addProductForm');
    if (form) {
      form.onsubmit = addProduct;
    }
    // modal close by clicking outside
    window.addEventListener('click', (e) => {
      const modal = $('productModal');
      if (modal && e.target === modal) closeProductModal();
    });

    await loadCategories();
    await loadProducts();
  }

  // wire to SPA loader or DOMContentLoaded
  document.addEventListener('sectionLoaded', (e) => {
    if (!e.detail || !e.detail.section) return;
    const sec = e.detail.section;
    if (sec === 'products' || sec === 'products_AD' || sec === 'products') setTimeout(initializeProductsPage, 10);
  });

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if ($('productsTbody')) initializeProductsPage(); }, 20);
  });

  // expose for debugging
  window.__PRODUCTS_API_BASE = API_BASE;
})();
