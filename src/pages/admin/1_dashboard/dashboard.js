document.addEventListener("sectionLoaded", (e) => {
    if (e.detail.section !== "dashboard") return;

    // Fire dashboardLoaded event
    document.dispatchEvent(new Event("dashboardLoaded"));
});

// Actual dashboard initialization
document.addEventListener("dashboardLoaded", () => {

    // ✔ REAL TOTAL CATEGORIES (reads from localStorage)
    const savedCategories = JSON.parse(localStorage.getItem("categoriesData")) || [];
    document.getElementById("totalCategories").textContent = savedCategories.length;

    // ✔ REAL TOTAL PRODUCTS (reads from localStorage)
    const savedProducts = JSON.parse(localStorage.getItem("productsData")) || [];
    document.getElementById("totalProducts").textContent = savedProducts.length;

     // ✔ Real total employees
    const savedEmployees = JSON.parse(localStorage.getItem("employeesData")) || [];
    document.getElementById("totalEmployees").textContent = savedEmployees.length;

    // ✔ Sales / Monthly stats (empty, for your future updates)
    document.getElementById("todaysSales").textContent = "₱0.00";
    document.getElementById("monthlySales").textContent = "₱0.00";
    document.getElementById("monthlyTransactions").textContent = "0";
    document.getElementById("averageSale").textContent = "₱0.00";
});

// Update categories count live
window.addEventListener("categoriesUpdated", () => {
    const savedCategories = JSON.parse(localStorage.getItem("categoriesData")) || [];
    document.getElementById("totalCategories").textContent = savedCategories.length;
});

// ✔ Update products live
window.addEventListener("productsUpdated", () => {
    const savedProducts = JSON.parse(localStorage.getItem("productsData")) || [];
    document.getElementById("totalProducts").textContent = savedProducts.length;
});
