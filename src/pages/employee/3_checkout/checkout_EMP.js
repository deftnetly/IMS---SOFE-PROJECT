/* checkout_EMP.js  — improved, robust product loader + transaction save
   - uses your PRODUCTS_API
   - does NOT use PRODUCT_CANDIDATES
   - processCheckout POSTs txn_id and items that match save_transaction.php
*/

(function () {
  const CART_KEY = "empCart_v1";
  const TAX_RATE = 0.12;

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
  function loadCart() {
    try {
      const raw = sessionStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
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
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const txnId = generateTxnId();

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
      cart = [];
      saveCart();
      renderCart();
      renderSummary();
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
})();
