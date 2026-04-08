// ===============================
// dashboard_EMP.js  (FINAL VERSION)
// ===============================
// Loads low stock, total products, today's sales
// + Adds working SPA-compatible "Go to Checkout" button
// ===============================

(function () {

  // ===============================
  // CONFIG — modify if needed
  // ===============================
  const ENDPOINT_LOW_STOCK = "/src/pages/admin/6_reports/get_low_stock_report.php";
  const ENDPOINT_PRODUCTS = "/src/pages/admin/3_products/get_products.php";
  const ENDPOINT_TRANSACTIONS = "/src/pages/employee/4_transactions/get_transactions.php";

  // ===============================
  // HELPERS
  // ===============================
  function escapeHtml(v) {
    if (v === null || v === undefined) return "";
    return String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) throw new Error("Network " + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Server error");
    return json;
  }

  function buildURL(path) {
    try {
      const scripts = [...document.scripts];
      const me = scripts.find(s => s.src.includes("dashboard_EMP.js"));
      if (me) {
        const u = new URL(me.src);
        const base = u.pathname.split("/src")[0];
        return u.origin + base + path;
      }
    } catch (e) {}
    return "/smart-inventory" + path;
  }

  // ===============================
  // LOAD LOW STOCK
  // ===============================
  async function loadLowStock() {
    const tbody = document.getElementById("lowStockList");
    const count = document.getElementById("lowStockCount");

    if (!tbody) return;

    try {
      const url = buildURL(ENDPOINT_LOW_STOCK);
      const json = await fetchJSON(url);
      const items = json.items || json.data || [];

      if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:gray;">No low stock items</td></tr>`;
        if (count) count.textContent = "0";
        return;
      }

      let html = "";
      items.forEach(it => {
        const cat = escapeHtml(it.category);
        const name = escapeHtml(it.product_name);
        const stock = Number(it.current_stock);
        const status = escapeHtml(it.status);

        let stockColor = stock === 0 ? "#d32f2f"
                     : stock <= 20 ? "#d32f2f"
                     : stock <= 40 ? "#ff9800"
                     : "#2e7d32";

        let statusColor = status === "Unavailable" || stock === 0 ? "#d32f2f"
                        : status === "Low" ? "#ff9800"
                        : "#2e7d32";

        html += `
          <tr>
            <td>${cat}</td>
            <td>${name}</td>
            <td style="color:${stockColor}; font-weight:600">${stock}</td>
            <td style="color:${statusColor}; font-weight:600">${status}</td>
          </tr>`;
      });

      tbody.innerHTML = html;
      if (count) count.textContent = items.length;

    } catch (err) {
      console.error("Low stock error:", err);
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Error fetching low stock</td></tr>`;
      if (count) count.textContent = "0";
    }
  }

  // ===============================
  // LOAD TOTAL PRODUCTS
  // ===============================
  async function loadTotalProducts() {
    const el = document.getElementById("totalProducts");
    if (!el) return;

    try {
      const url = buildURL(ENDPOINT_PRODUCTS);
      const json = await fetchJSON(url);
      const products = json.data || json.items || [];
      el.textContent = products.length;
    } catch (err) {
      console.error("Total products error:", err);
      el.textContent = "0";
    }
  }

  // ===============================
  // LOAD TODAY'S SALES
  // ===============================
  async function loadTodaysSales() {
    const el = document.getElementById("todaysSales");
    if (!el) return;

    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");

      const url = buildURL(`${ENDPOINT_TRANSACTIONS}?date=${yyyy}-${mm}-${dd}`);
      const json = await fetchJSON(url);

      const tx = json.transactions || [];
      const total = tx.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);

      el.textContent = "₱" + total.toFixed(2);

    } catch (err) {
      console.error("Today's sales error:", err);
      el.textContent = "₱0";
    }
  }

  // ===============================
  // CHECKOUT NAVIGATION (IMPORTANT)
  // ===============================
  function goToCheckout() {
    try {
      if (typeof loadContent === "function") {
        loadContent("checkout", "3_checkout");
        return;
      }
      if (typeof openPage === "function") {
        openPage("checkout", "3_checkout");
        return;
      }
    } catch (e) {
      console.warn("SPA navigation failed, using fallback.");
    }

    // fallback normal navigation
    window.location.href = "../3_checkout/checkout_EMP.html";
  }

  function attachCheckoutButton() {
    const btn = document.getElementById("checkoutBtn");
    if (btn) btn.addEventListener("click", goToCheckout);
  }

  // ===============================
  // INITIALIZER
  // ===============================
  function start() {
    attachCheckoutButton();
    loadLowStock();
    loadTotalProducts();
    loadTodaysSales();
  }

  // ensure dashboard loads after SPA injection
  document.addEventListener("DOMContentLoaded", () => setTimeout(start, 30));
  document.addEventListener("sectionLoaded", e => {
    if (!e.detail) return;
    const sec = String(e.detail.section || "").toLowerCase();
    if (sec.includes("dashboard")) setTimeout(start, 30);
  });

})();
