<<<<<<< HEAD
/* checkout_EMP.js */
=======
/* checkout_EMP.js  — improved, robust product loader + transaction save
   - uses your PRODUCTS_API
   - does NOT use PRODUCT_CANDIDATES
   - processCheckout POSTs txn_id and items that match save_transaction.php
*/
>>>>>>> 8f8842294032db287e642deef9d19e5986b2269e

(function () {
  const CART_KEY = "empCart_v1";
  const TAX_RATE = 0.12;
<<<<<<< HEAD
  const PRODUCT_API_PATH = "get_checkout_products.php";
  const CATEGORY_API_PATH = "get_checkout_categories.php";
  const SAVE_TXN_API_PATH = "save_checkout_transaction.php";

  let products = [];
  let categories = [];
  let cart = [];
  let filtersBound = false;

  function buildUrlCandidates(path) {
    const normalizedPath = String(path || "");
    const scriptTag = Array.from(document.scripts).reverse().find((script) =>
      script.src && script.src.toLowerCase().includes("checkout_emp.js")
    );
    const scriptBase = scriptTag ? scriptTag.src.slice(0, scriptTag.src.lastIndexOf("/") + 1) : window.location.href;

    return [...new Set([
      normalizedPath === "get_checkout_products.php"
        ? `${window.location.origin}/smart-inventory/src/pages/employee/3_checkout/get_checkout_products.php`
        : null,
      normalizedPath === "save_checkout_transaction.php"
        ? `${window.location.origin}/smart-inventory/src/pages/employee/3_checkout/save_checkout_transaction.php`
        : null,
      normalizedPath === "get_checkout_categories.php"
        ? `${window.location.origin}/smart-inventory/src/pages/employee/3_checkout/get_checkout_categories.php`
        : null,
      normalizedPath === "get_checkout_products.php"
        ? "http://localhost/smart-inventory/src/pages/employee/3_checkout/get_checkout_products.php"
        : null,
      normalizedPath === "save_checkout_transaction.php"
        ? "http://localhost/smart-inventory/src/pages/employee/3_checkout/save_checkout_transaction.php"
        : null,
      normalizedPath === "get_checkout_categories.php"
        ? "http://localhost/smart-inventory/src/pages/employee/3_checkout/get_checkout_categories.php"
        : null,
      new URL(path, scriptBase).href,
      new URL(path, window.location.href).href
    ].filter(Boolean))];
  }

  async function loadProductsDirect() {
    const res = await fetch("http://localhost/smart-inventory/src/pages/employee/3_checkout/get_checkout_products.php", {
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const rows = Array.isArray(json) ? json : (json.data ?? json.items ?? []);

    products = rows.map((row) => ({
      id: row.product_code ?? row.productid ?? row.id ?? "",
      name: row.product_name ?? row.name ?? "",
      category: row.category_name ?? row.category ?? "",
      price: Number(row.price ?? row.selling_price ?? row.unit_price ?? 0),
      stock: Number(row.stock ?? 0)
    }));

    console.log("[checkout] direct product load:", products.length);
  }

  function removeHeaderSearch() {
    const searchArea = document.querySelector(".checkout-container .search-area");
    if (searchArea) searchArea.remove();
  }

  async function fetchJsonFromCandidates(path, options = {}) {
    let lastError = null;

    for (const url of buildUrlCandidates(path)) {
      try {
        console.log("[checkout] requesting:", url);
        const res = await fetch(url, { cache: "no-store", credentials: "same-origin", ...options });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const json = await res.json();
        if (json && json.success === false) {
          throw new Error(json.error || "Server error");
        }

        return json;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Request failed");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[char]));
  }

  function normalizeCategory(value) {
    return String(value ?? "").trim().toLowerCase();
  }

=======

  // Use the product endpoint you provided
  const PRODUCTS_API = "/Smart-Inventory/src/pages/admin/3_products/get_products.php";

  // Where we POST completed transactions (relative to checkout file)
  const SAVE_TXN_API = "/smart-inventory/src/pages/employee/4_transactions/save_transaction.php";

  let products = []; // kept empty until fetch succeeds
  let cart = [];

  async function fetchProductsFromServer() {
    console.log("[checkout] Fetching products from:", PRODUCTS_API);
    try {
      const res = await fetch(PRODUCTS_API, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);

      const json = await res.json();
      const rows = Array.isArray(json) ? json : (json.data ?? []);

      products = rows.map(r => ({
        id: r.product_code ?? r.productid ?? r.id ?? "",
        name: r.product_name ?? r.name ?? "",
        category: r.category_name ?? r.category ?? "",
        price: Number(r.price ?? r.selling_price ?? r.unit_price ?? 0),
        stock: Number(r.stock ?? 0)
      }));

      console.log("[checkout] loaded products:", products.length);
    } catch (err) {
      console.error("[checkout] Failed to load products from server — keeping products array as-is. Error:", err);
      // do not inject demo products — leave products empty or previously loaded
    }
  }

  /* cart persistence */
>>>>>>> 8f8842294032db287e642deef9d19e5986b2269e
  function loadCart() {
    try {
      const raw = sessionStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
<<<<<<< HEAD
    } catch (error) {
      console.warn("[checkout] loadCart error", error);
      return [];
    }
  }

  function saveCart() {
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
      console.warn("[checkout] saveCart error", error);
    }
  }

  function generateTxnId() {
    const d = new Date();
    return `TXN-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  function renderCart() {
    const tbody = document.querySelector("#cartTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    cart.forEach((item, index) => {
      const row = document.createElement("tr");
      const total = Number(item.price) * Number(item.qty);

      row.innerHTML = `
        <td>${escapeHtml(item.id)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.qty}</td>
        <td>PHP ${Number(item.price).toFixed(2)}</td>
        <td>PHP ${total.toFixed(2)}</td>
        <td><button type="button" class="cart-remove-button" onclick="removeFromCart(${index})">Remove</button></td>
      `;

      tbody.appendChild(row);
    });
  }

  function renderSummary() {
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    const subtotalEl = document.getElementById("orderSubtotal");
    const taxEl = document.getElementById("orderTax");
    const totalEl = document.getElementById("orderTotal");
    const txnEl = document.getElementById("transactionId");

    if (subtotalEl) subtotalEl.textContent = `PHP ${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `PHP ${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `PHP ${total.toFixed(2)}`;
    if (txnEl) txnEl.textContent = generateTxnId();
  }

  function productCardHtml(product) {
    const thumb = (product.name || "").split(" ").map((part) => part[0] || "").join("").slice(0, 2).toUpperCase();
    const shortName = product.name.length > 30 ? `${product.name.slice(0, 27)}...` : product.name;

    return `
      <div class="product-item">
        <div class="product-card">
          <div class="card-top">
            <div class="thumb">${escapeHtml(thumb)}</div>
            <div class="card-body">
              <div class="card-title">${escapeHtml(shortName)}</div>
              <div class="card-sub">ID ${escapeHtml(product.id)} - ${escapeHtml(product.category)}</div>
            </div>
          </div>
          <div class="card-top-row">
            <div class="price">PHP ${Number(product.price).toFixed(2)}</div>
            <div class="qty-controls">
              <button class="qty-minus" data-id="${escapeHtml(product.id)}" type="button">-</button>
              <input id="qty_${escapeHtml(product.id)}" value="1" min="1" type="number" />
              <button class="qty-plus" data-id="${escapeHtml(product.id)}" type="button">+</button>
            </div>
          </div>
        </div>
        <button class="external-add card-add-btn" data-id="${escapeHtml(product.id)}" type="button">Add</button>
      </div>
    `;
  }

  function attachGridListeners() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.querySelectorAll(".qty-minus").forEach((button) => {
      button.onclick = () => {
        const input = document.getElementById(`qty_${button.dataset.id}`);
        if (input) input.value = Math.max(1, Number(input.value) - 1);
      };
    });

    grid.querySelectorAll(".qty-plus").forEach((button) => {
      button.onclick = () => {
        const input = document.getElementById(`qty_${button.dataset.id}`);
        if (input) input.value = Number(input.value) + 1;
      };
    });

    grid.querySelectorAll(".card-add-btn").forEach((button) => {
      button.onclick = () => {
        const qty = Math.max(1, Number(document.getElementById(`qty_${button.dataset.id}`)?.value || 1));
        window.addProductToCart(button.dataset.id, qty);
        button.textContent = "Added";
        setTimeout(() => {
          button.textContent = "Add";
        }, 700);
      };
    });
  }

  function renderProductGrid(filterText = "", filterCategory = "all") {
    const grid = document.getElementById("productGrid");
    const countEl = document.getElementById("productCount");
    if (!grid) return;

    const query = String(filterText || "").trim().toLowerCase();
    const category = normalizeCategory(filterCategory || "all");

    const filtered = products.filter((product) => {
      if (category !== "all" && normalizeCategory(product.category) !== category) {
        return false;
      }

      if (!query) return true;

      return String(product.name || "").toLowerCase().includes(query)
        || String(product.id || "").toLowerCase().includes(query)
        || String(product.category || "").toLowerCase().includes(query);
    });

    if (countEl) {
      countEl.textContent = String(filtered.length);
    }

    grid.innerHTML = filtered.map(productCardHtml).join("");
    attachGridListeners();
  }

  function renderWhenReady(attempts = 10) {
    const grid = document.getElementById("productGrid");
    if (grid) {
      renderProductGrid(
        document.getElementById("productGridSearch")?.value || "",
        document.getElementById("productCategoryFilter")?.value || "all"
      );
      return;
    }

    if (attempts > 0) {
      setTimeout(() => renderWhenReady(attempts - 1), 100);
    }
  }

  function buildCategoryList() {
    const select = document.getElementById("productCategoryFilter");
    if (!select) return;

    const currentValue = normalizeCategory(select.value || "all");
    const categoryOptions = (categories.length ? categories : Array.from(
      new Map(
        products
          .filter((product) => normalizeCategory(product.category))
          .map((product) => [normalizeCategory(product.category), { value: normalizeCategory(product.category), label: String(product.category).trim() }])
      ).values()
    )).sort((a, b) => a.label.localeCompare(b.label));

    select.innerHTML = `<option value="all">All categories</option>${
      categoryOptions
        .map((category) => `<option value="${escapeHtml(category.value)}">${escapeHtml(category.label)}</option>`)
        .join("")
    }`;

    select.value = categoryOptions.some((category) => category.value === currentValue) ? currentValue : "all";
  }

  function buildCategoryListWhenReady(attempts = 10) {
    const select = document.getElementById("productCategoryFilter");
    if (select) {
      buildCategoryList();
      return;
    }

    if (attempts > 0) {
      setTimeout(() => buildCategoryListWhenReady(attempts - 1), 100);
    }
  }

  function findProductFromQuickSearch(query) {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return null;

    return products.find((product) => String(product.id || "").toLowerCase() === normalized)
      || products.find((product) => String(product.name || "").toLowerCase() === normalized)
      || products.find((product) => String(product.name || "").toLowerCase().startsWith(normalized))
      || products.find((product) => String(product.name || "").toLowerCase().includes(normalized))
      || null;
  }

  function wireFilters() {
    if (filtersBound) return;

    const searchEl = document.getElementById("productGridSearch");
    const categoryEl = document.getElementById("productCategoryFilter");
    if (!searchEl || !categoryEl) return;

    filtersBound = true;

    searchEl.addEventListener("input", () => {
      renderProductGrid(searchEl.value, categoryEl.value || "all");
    });

    categoryEl.addEventListener("change", () => {
      renderProductGrid(searchEl.value || "", categoryEl.value || "all");
    });
  }

  function wireFiltersWhenReady(attempts = 10) {
    const searchEl = document.getElementById("productGridSearch");
    const categoryEl = document.getElementById("productCategoryFilter");

    if (searchEl && categoryEl) {
      wireFilters();
      return;
    }

    if (attempts > 0) {
      setTimeout(() => wireFiltersWhenReady(attempts - 1), 100);
    }
  }

  function wireQuickAdd() {
    const searchInput = document.getElementById("productSearch");
    const addButton = document.getElementById("quickAddButton");

    if (addButton) {
      addButton.onclick = (event) => {
        event.preventDefault();
        window.addToCart();
      };
    }

    [searchInput].forEach((input) => {
      if (!input) return;
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          window.addToCart();
        }
      });
    });
  }

  window.addProductToCart = function (productId, qty = 1) {
    const product = products.find((entry) => String(entry.id) === String(productId));
    if (!product) {
      alert("Product not found.");
      return;
    }

    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      existing.qty += Number(qty);
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: Number(product.price),
        qty: Number(qty)
      });
    }

=======
    } catch (e) {
      console.warn("[checkout] loadCart parse error", e);
      return [];
    }
  }
  function saveCart() {
    try { sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { console.warn("[checkout] saveCart error", e); }
  }

  /* global cart API (used by buttons in HTML) */
  window.addProductToCart = function (productId, qty = 1) {
    const p = products.find(x => String(x.id) === String(productId));
    if (!p) return alert("Product not found (product list may have failed to load).");
    const existing = cart.find(c => c.id === p.id);
    if (existing) existing.qty += Number(qty);
    else cart.push({ id: p.id, name: p.name, category: p.category, price: Number(p.price), qty: Number(qty) });
>>>>>>> 8f8842294032db287e642deef9d19e5986b2269e
    saveCart();
    renderCart();
    renderSummary();
  };

  window.removeFromCart = function (index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
    renderSummary();
  };

<<<<<<< HEAD
  window.addToCart = function () {
    const searchInput = document.getElementById("productSearch");
    if (!searchInput) return;

    const query = searchInput.value.trim();
    const qty = 1;

    if (!query) {
      alert("Enter a product name or ID first.");
      searchInput.focus();
      return;
    }

    const matched = findProductFromQuickSearch(query);
    if (!matched) {
      alert("No matching product found.");
      searchInput.focus();
      searchInput.select();
      return;
    }

    window.addProductToCart(matched.id, qty);
    renderProductGrid(document.getElementById("productGridSearch")?.value || "", document.getElementById("productCategoryFilter")?.value || "all");
    searchInput.value = "";
    searchInput.focus();
  };

  async function postTransactionToServer(payload) {
    const json = await fetchJsonFromCandidates(SAVE_TXN_API_PATH, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    return { success: true, data: json };
  }

  window.processCheckout = async function () {
    if (!cart.length) {
      alert("Cart empty.");
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
=======
  /* POST the transaction to server and clear local cart on success */
  async function postTransactionToServer(payload) {
    try {
      const res = await fetch(SAVE_TXN_API, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      console.log("[checkout] server raw response:", text);
      try {
        const json = JSON.parse(text);
        return { success: true, data: json };
      } catch (e) {
        console.error("[checkout] Save transaction error - invalid JSON:", e, "raw:", text);
        return { success: false, error: "Invalid JSON from server", raw: text, status: res.status };
      }
    } catch (err) {
      console.error("[checkout] Save transaction error", err);
      return { success: false, error: err.message || String(err) };
    }
  }

  window.processCheckout = async function () {
    if (cart.length === 0) return alert("Cart empty.");
    const subtotal = cart.reduce((a,b) => a + b.price * b.qty, 0);
>>>>>>> 8f8842294032db287e642deef9d19e5986b2269e
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const txnId = generateTxnId();

<<<<<<< HEAD
    const payload = {
      txn_id: txnId,
      employee_id: null,
      subtotal,
      tax,
      total,
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price
      }))
    };

    try {
      await postTransactionToServer(payload);
      alert(`Checkout saved. TXN ${txnId}`);
=======
    // Build payload that matches your PHP: txn_id and item keys {id,name,qty,price}
    const payload = {
      txn_id: txnId,
      employee_id: null, // set if you provide logged-in employee
      subtotal: subtotal,
      tax: tax,
      total: total,
      items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price }))
    };

    console.log("[checkout] Posting transaction to server", SAVE_TXN_API, payload);
    const result = await postTransactionToServer(payload);
    if (result && result.success) {
      alert(`Checkout saved ✔ — TXN ${txnId} — Total: ₱${total.toFixed(2)}`);
>>>>>>> 8f8842294032db287e642deef9d19e5986b2269e
      cart = [];
      saveCart();
      renderCart();
      renderSummary();
<<<<<<< HEAD
    } catch (error) {
      console.error("[checkout] process error", error);
      alert(`Failed to save transaction: ${error.message || error}`);
    }
  };

  async function initCheckout() {
    removeHeaderSearch();
    cart = loadCart();

    try {
      const categoryJson = await fetchJsonFromCandidates(CATEGORY_API_PATH);
      const categoryRows = Array.isArray(categoryJson) ? categoryJson : (categoryJson.data ?? categoryJson.items ?? []);
      categories = categoryRows.map((row) => {
        return {
          value: normalizeCategory(row.category_name),
          label: row.category_name
        };
      });
    } catch (categoryError) {
      console.error("[checkout] failed to load categories", categoryError);
      categories = [];
    }

    try {
      await loadProductsDirect();
    } catch (error) {
      console.error("[checkout] direct load failed, falling back", error);
      try {
        const json = await fetchJsonFromCandidates(PRODUCT_API_PATH);
        const rows = Array.isArray(json) ? json : (json.data ?? json.items ?? []);

        products = rows.map((row) => ({
          id: row.product_code ?? row.productid ?? row.id ?? "",
          name: row.product_name ?? row.name ?? "",
          category: row.category_name ?? row.category ?? "",
          price: Number(row.price ?? row.selling_price ?? row.unit_price ?? 0),
          stock: Number(row.stock ?? 0)
        }));
      } catch (fallbackError) {
        console.error("[checkout] failed to load products", fallbackError);
        products = [];
      }
    }

    buildCategoryListWhenReady();
    wireFiltersWhenReady();
    wireQuickAdd();
    renderWhenReady();
    renderCart();
    renderSummary();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCheckout, { once: true });
  } else {
    initCheckout();
  }

  setTimeout(() => {
    if (!products.length) {
      initCheckout();
    }
  }, 400);

  setTimeout(() => {
    buildCategoryListWhenReady();
  }, 500);

  setTimeout(() => {
    wireFiltersWhenReady();
  }, 550);
=======
    } else {
      console.warn("[checkout] Server save failed", result);
      const msg = (result && result.data && result.data.error) ? result.data.error : (result && result.error) ? result.error : "Unknown server error";
      if (confirm("Failed to save transaction to server: " + msg + "\nDo you still want to clear the cart locally? (Cancel to keep cart)")) {
        cart = []; saveCart(); renderCart(); renderSummary();
      }
    }
  };

  /* product card html (external Add button) */
  function productCardHtml(p) {
    const thumb = (p.name || "").split(" ").map(s => s[0] || "").join("").substring(0,2).toUpperCase();
    const short = (p.name || "").length > 30 ? p.name.slice(0,27) + "..." : p.name;
    return `
      <div class="product-item">
        <div class="product-card">
          <div class="card-top">
            <div class="thumb">${escapeHtml(thumb)}</div>
            <div class="card-body">
              <div class="card-title">${escapeHtml(short)}</div>
              <div class="card-sub">ID ${escapeHtml(p.id)} • ${escapeHtml(p.category)}</div>
            </div>
          </div>

          <div class="card-top-row">
            <div class="price">₱${Number(p.price).toFixed(2)}</div>
            <div class="qty-controls">
              <button class="qty-minus" data-id="${escapeHtml(p.id)}" type="button">-</button>
              <input id="qty_${escapeHtml(p.id)}" value="1" min="1" type="number" />
              <button class="qty-plus" data-id="${escapeHtml(p.id)}" type="button">+</button>
            </div>
          </div>
        </div>

        <button class="external-add card-add-btn" data-id="${escapeHtml(p.id)}" type="button">Add</button>
      </div>
    `;
  }

  /* render product grid with optional filters */
  function renderProductGrid(filterText = "", filterCategory = "all") {
    const grid = document.getElementById("productGrid");
    if (!grid) return console.warn("[checkout] productGrid missing");
    const q = String(filterText || "").trim().toLowerCase();
    const cat = String(filterCategory || "all").toLowerCase();

    const visible = products.filter(p => {
      if (cat !== "all" && (String(p.category || "").toLowerCase() !== cat)) return false;
      if (!q) return true;
      return String(p.name || "").toLowerCase().includes(q) || String(p.id || "").toLowerCase() === q || String(p.category || "").toLowerCase().includes(q);
    });

    const countEl = document.getElementById("productCount");
    if (countEl) countEl.textContent = `${visible.length} product${visible.length !== 1 ? "s" : ""}`;
    grid.innerHTML = visible.map(productCardHtml).join("");
    attachGridListeners();
  }

  function attachGridListeners() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;
    grid.querySelectorAll(".qty-minus").forEach(b => b.onclick = () => {
      const id = b.dataset.id; const input = document.getElementById(`qty_${id}`); if (!input) return; input.value = Math.max(1, Number(input.value) - 1);
    });
    grid.querySelectorAll(".qty-plus").forEach(b => b.onclick = () => {
      const id = b.dataset.id; const input = document.getElementById(`qty_${id}`); if (!input) return; input.value = Number(input.value) + 1;
    });
    grid.querySelectorAll(".card-add-btn").forEach(btn => btn.onclick = () => {
      const id = btn.dataset.id;
      const qty = Math.max(1, Number(document.getElementById(`qty_${id}`)?.value || 1));
      addProductToCart(id, qty);
      btn.textContent = "Added ✓";
      setTimeout(()=> btn.textContent = "Add", 700);
    });
  }

  /* build category dropdown from loaded products */
  function buildCategoryList() {
    const sel = document.getElementById("productCategoryFilter");
    if (!sel) return;
    const cats = Array.from(new Set(products.map(p => p.category))).filter(Boolean).sort();
    sel.innerHTML = `<option value="all">All categories</option>` + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  }

  /* wire filters: search input and category select */
  function wireFilters() {
    const searchEl = document.getElementById("productGridSearch");
    const catEl = document.getElementById("productCategoryFilter");
    if (searchEl) searchEl.addEventListener("input", () => renderProductGrid(searchEl.value, catEl ? catEl.value : "all"));
    if (catEl) catEl.addEventListener("change", () => renderProductGrid(searchEl ? searchEl.value : "", catEl.value));
  }

  /* cart table render */
  function renderCart() {
    const tbody = document.querySelector("#cartTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    cart.forEach((item, i) => {
      const subtotal = item.price * item.qty;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.id)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.qty}</td>
        <td>₱${Number(item.price).toFixed(2)}</td>
        <td>₱${subtotal.toFixed(2)}</td>
        <td><button type="button" onclick="removeFromCart(${i})">Remove</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* summary render */
  function renderSummary() {
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const subEl = document.getElementById("orderSubtotal");
    const taxEl = document.getElementById("orderTax");
    const totEl = document.getElementById("orderTotal");
    const txEl = document.getElementById("transactionId");
    if (subEl) subEl.textContent = `₱${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `₱${tax.toFixed(2)}`;
    if (totEl) totEl.textContent = `₱${total.toFixed(2)}`;
    if (txEl) txEl.textContent = generateTxnId();
  }

  function generateTxnId() {
    const d = new Date();
    return `TXN-${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  }

  function escapeHtml(s) { return String(s || "").replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  /* init */
  document.addEventListener("DOMContentLoaded", async () => {
    cart = loadCart();
    await fetchProductsFromServer();
    buildCategoryList();
    wireFilters();
    renderProductGrid();
    renderCart();
    renderSummary();
    console.log("[checkout] initialized (robust loader)");
  });

  // safety retry (fragment timing)
  setTimeout(async () => {
    if (!products || products.length === 0) {
      console.log("[checkout] retrying products fetch after delay");
      await fetchProductsFromServer();
      buildCategoryList();
      renderProductGrid();
      renderCart();
      renderSummary();
    }
  }, 300);

  // expose for debugging
  window.__checkout_products = () => products;
  window.__checkout_candidates = () => PRODUCT_CANDIDATES;
>>>>>>> 8f8842294032db287e642deef9d19e5986b2269e
})();
