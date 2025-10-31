// ===============================
// EMPLOYEE PRODUCTS VIEW (READ-ONLY)
// ===============================

function loadEmployeeProducts() {
    const tableBody = document.querySelector(".data-table tbody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    const products = JSON.parse(localStorage.getItem("productsData")) || [];

    if (products.length === 0) {
        const row = tableBody.insertRow();
        row.innerHTML = `<td colspan="5" style="text-align:center; color:gray;">No products available.</td>`;
        return;
    }

    products.forEach(product => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>₱${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.stock}</td>
        `;
    });
}

function initializeProducts() {
    console.log("✅ Employee Products View Initialized");
    loadEmployeeProducts();
}
