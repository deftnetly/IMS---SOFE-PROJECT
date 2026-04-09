/* checkout_EMP.js */

(function () {
  const CART_KEY = "empCart_v1";
  const LEGACY_CART_KEY = "empCart_v1_session";
  const TAX_RATE = 0.12;
  const PRODUCT_API_PATH = "get_checkout_products.php";
  const CATEGORY_API_PATH = "get_checkout_categories.php";
  const SAVE_TXN_API_PATH = "save_checkout_transaction.php";

  let products = [];
  let categories = [];
  let cart = [];
  let filtersBound = false;
  let noticeBound = false;

  function bindNoticeModal() {
    if (noticeBound) return;
    const modal = document.getElementById("checkoutNotice");
    const okBtn = document.getElementById("checkoutNoticeOk");
    if (!modal || !okBtn) return;

    noticeBound = true;

    const closeNotice = () => {
      modal.classList.remove("active");
    };

    okBtn.addEventListener("click", closeNotice);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeNotice();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("active")) {
        closeNotice();
      }
    });
  }

  function showCheckoutNotice(title, message, tone = "info") {
    const modal = document.getElementById("checkoutNotice");
    const badge = document.getElementById("checkoutNoticeBadge");
    const titleEl = document.getElementById("checkoutNoticeTitle");
    const messageEl = document.getElementById("checkoutNoticeMessage");
    const okBtn = document.getElementById("checkoutNoticeOk");

    if (!modal || !badge || !titleEl || !messageEl || !okBtn) {
      alert(message);
      return;
    }

    bindNoticeModal();

    let badgeText = "i";
    let badgeBg = "#fff7ed";
    let badgeColor = "#c2410c";

    if (tone === "success") {
      badgeText = "✓";
      badgeBg = "#dcfce7";
      badgeColor = "#166534";
    } else if (tone === "error") {
      badgeText = "!";
      badgeBg = "#fee2e2";
      badgeColor = "#b91c1c";
    }

    badge.textContent = badgeText;
    badge.style.background = badgeBg;
    badge.style.color = badgeColor;
    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.add("active");
    okBtn.focus();
  }

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

  function loadCart() {
    try {
      const localRaw = localStorage.getItem(CART_KEY);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        return Array.isArray(parsed) ? parsed : [];
      }

      const sessionRaw = sessionStorage.getItem(CART_KEY) || sessionStorage.getItem(LEGACY_CART_KEY);
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (Array.isArray(parsed)) {
          localStorage.setItem(CART_KEY, JSON.stringify(parsed));
          return parsed;
        }
      }

      return [];
    } catch (error) {
      console.warn("[checkout] loadCart error", error);
      return [];
    }
  }

  function saveCart() {
    try {
      const serialized = JSON.stringify(cart);
      localStorage.setItem(CART_KEY, serialized);
      sessionStorage.setItem(CART_KEY, serialized);
      sessionStorage.setItem(LEGACY_CART_KEY, serialized);
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
    if (!cart.length) {
      tbody.innerHTML = `
        <tr class="cart-empty-row">
          <td colspan="6" style="text-align:center;color:#9ca3af;font-weight:600;padding:18px 14px;">Empty cart</td>
        </tr>
      `;
      return;
    }

    cart.forEach((item, index) => {
      const row = document.createElement("tr");
      const total = Number(item.price) * Number(item.qty);

      row.innerHTML = `
        <td>${escapeHtml(item.id)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>
          <div class="cart-qty-controls">
            <button type="button" class="cart-qty-button" onclick="changeCartQty(${index}, -1)">-</button>
            <span class="cart-qty-value">${item.qty}</span>
            <button type="button" class="cart-qty-button" onclick="changeCartQty(${index}, 1)">+</button>
          </div>
        </td>
        <td>&#8369;${Number(item.price).toFixed(2)}</td>
        <td>&#8369;${total.toFixed(2)}</td>
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

    if (subtotalEl) subtotalEl.innerHTML = `&#8369;${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.innerHTML = `&#8369;${tax.toFixed(2)}`;
    if (totalEl) totalEl.innerHTML = `&#8369;${total.toFixed(2)}`;
    if (txnEl) txnEl.textContent = generateTxnId();
  }

  function renderCheckoutStateWhenReady(attempts = 20) {
    const cartBody = document.querySelector("#cartTable tbody");
    const subtotalEl = document.getElementById("orderSubtotal");
    const totalEl = document.getElementById("orderTotal");

    if (cartBody && subtotalEl && totalEl) {
      renderCart();
      renderSummary();
      return;
    }

    if (attempts > 0) {
      setTimeout(() => renderCheckoutStateWhenReady(attempts - 1), 100);
    }
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
            <div class="price">&#8369;${Number(product.price).toFixed(2)}</div>
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
      showCheckoutNotice("Product Not Found", "The selected product could not be found.", "error");
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

  window.changeCartQty = function (index, delta) {
    const item = cart[index];
    if (!item) return;

    const nextQty = Number(item.qty) + Number(delta);
    if (nextQty <= 0) {
      cart.splice(index, 1);
    } else {
      item.qty = nextQty;
    }

    saveCart();
    renderCart();
    renderSummary();
  };

  window.addToCart = function () {
    const searchInput = document.getElementById("productSearch");
    if (!searchInput) return;

    const query = searchInput.value.trim();
    const qty = 1;

    if (!query) {
      showCheckoutNotice("Search Required", "Enter a product name or ID first.", "info");
      searchInput.focus();
      return;
    }

    const matched = findProductFromQuickSearch(query);
    if (!matched) {
      showCheckoutNotice("No Match Found", "No matching product was found.", "error");
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
      showCheckoutNotice("Cart Empty", "Add at least one product before processing checkout.", "error");
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const txnId = generateTxnId();

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
      showCheckoutNotice("Checkout Saved", `Transaction ${txnId} was saved successfully.`, "success");
      cart = [];
      saveCart();
      renderCart();
      renderSummary();
    } catch (error) {
      console.error("[checkout] process error", error);
      showCheckoutNotice("Checkout Failed", `Failed to save transaction: ${error.message || error}`, "error");
    }
  };

  async function initCheckout() {
    removeHeaderSearch();
    bindNoticeModal();
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
    renderWhenReady();
    renderCheckoutStateWhenReady();
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

  document.addEventListener("sectionLoaded", (event) => {
    const section = String(event?.detail?.section || "").toLowerCase();
    if (section.includes("checkout")) {
      setTimeout(() => {
        renderCheckoutStateWhenReady();
      }, 60);
    }
  });
})();
