// ===============================
// 🔹 DASHBOARD INITIALIZATION
// ===============================
function initializeDashboard() {
    console.log("✅ Dashboard Initialized");

    // Load products immediately
    loadDashboardProducts();

    // Auto-refresh when Admin updates products
    window.addEventListener('storage', e => {
        if (e.key === 'productsData') loadDashboardProducts();
    });

    // Attach checkout button event
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", goToCheckout);
    }
}

// ===============================
// 🔹 LOAD PRODUCT LIST FROM LOCALSTORAGE
// ===============================
function loadDashboardProducts() {
    const tableBody = document.getElementById('dashboardProductList');
    const totalProductsEl = document.getElementById('totalProducts');
    const lowStockEl = document.getElementById('lowStock');

    if (!tableBody) return;

    tableBody.innerHTML = ''; // Clear existing rows

    const products = JSON.parse(localStorage.getItem('productsData')) || [];

    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color:gray;">No products found.</td>
            </tr>`;
        totalProductsEl.textContent = '0';
        lowStockEl.textContent = '0';
        return;
    }

    let lowStockCount = 0;

    products.forEach(product => {
        // Count low stock
        if (product.stock < 10) lowStockCount++;

        // Create a row
        const row = document.createElement('tr');

        // Add red color for low-stock items
        const stockStyle = product.stock < 10 ? 'color: red; font-weight: bold;' : '';

        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td style="${stockStyle}">${product.stock}</td>
            <td>${product.category}</td>
        `;

        tableBody.appendChild(row);
    });

    totalProductsEl.textContent = products.length;
    lowStockEl.textContent = lowStockCount;
}

// ===============================
// 🔹 GO TO CHECKOUT FUNCTION
// ===============================
function goToCheckout() {
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) checkoutBtn.textContent = "Loading Checkout...";

    // If running inside Employee.html (dynamic loader)
    if (typeof loadContent === 'function') {
        setTimeout(() => {
            loadContent('checkout', '3_checkout');
            if (checkoutBtn) checkoutBtn.textContent = "Go to Checkout";
        }, 300);
    } 
    // Fallback if opened directly
    else {
        window.location.href = '../../../3_checkout/checkout.html';
    }
}
