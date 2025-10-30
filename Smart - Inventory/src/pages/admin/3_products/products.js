// ===============================
// PRODUCTS.JS – Full Working Version
// ===============================

// Load categories into dropdown and list
function loadCategoryOptions() {
    const categorySelect = document.getElementById('category');
    const categoryListDisplay = document.getElementById('categoryListDisplay');

    if (!categorySelect || !categoryListDisplay) return;

    // Clear previous entries
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    categoryListDisplay.innerHTML = '';

    const savedCategories = localStorage.getItem('categoriesData');
    if (savedCategories) {
        const categories = JSON.parse(savedCategories);

        categories.forEach(cat => {
            // Add to dropdown
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            categorySelect.appendChild(option);

            // Add to visible category list
            const li = document.createElement('li');
            li.textContent = `${cat.id} - ${cat.name}`;
            categoryListDisplay.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'No categories available yet.';
        categoryListDisplay.appendChild(li);
    }
}

// ===============================
// 🔹 MODAL FUNCTIONS
// ===============================

function openProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'block';
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'none';
}

// ===============================
// 🔹 PRODUCT MANAGEMENT
// ===============================

function addProduct(event) {
    event.preventDefault();

    const productName = document.getElementById('productName').value.trim();
    const category = document.getElementById('category').value.trim();
    const price = parseFloat(document.getElementById('price').value);
    const stock = parseInt(document.getElementById('stock').value);
    const status = document.getElementById('status') ? document.getElementById('status').value : 'available';
    const dateAdded = new Date().toLocaleDateString();

    if (!productName || !category || isNaN(price) || isNaN(stock)) {
        alert("Please fill in all fields correctly.");
        return false;
    }

    const productId = "P" + String(Date.now()).slice(-5);
    const newProduct = {
        id: productId,
        name: productName,
        category,
        price,
        stock,
        dateAdded,
        status
    };

    let productsData = JSON.parse(localStorage.getItem('productsData')) || [];
    productsData.push(newProduct);
    localStorage.setItem('productsData', JSON.stringify(productsData));

    addProductToTable(newProduct);
    closeProductModal();
    document.getElementById('addProductForm').reset();
    return false;
}

function addProductToTable(product) {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;

    const row = tableBody.insertRow();
    row.innerHTML = `
        <td>${product.id}</td>
        <td>${product.name}</td>
        <td>${product.category}</td>
        <td>₱${product.price.toFixed(2)}</td>
        <td>${product.stock}</td>
        <td>${product.dateAdded}</td>
        <td>${product.status}</td>
        <td>
            <button class="action-button edit-button" onclick="editProduct('${product.id}')">Edit</button>
            <button class="action-button delete-button" onclick="deleteProduct('${product.id}', this)">Delete</button>
        </td>
    `;
}

function loadProductsData() {
    const productsData = JSON.parse(localStorage.getItem('productsData')) || [];
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    productsData.forEach(product => addProductToTable(product));
}

function editProduct(id) {
    alert(`Edit function for ${id} not implemented yet.`);
}

function deleteProduct(id, button) {
    if (confirm('Are you sure you want to delete this product?')) {
        let productsData = JSON.parse(localStorage.getItem('productsData')) || [];
        productsData = productsData.filter(prod => prod.id !== id);
        localStorage.setItem('productsData', JSON.stringify(productsData));

        const row = button.closest('tr');
        row.remove();
    }
}

// ===============================
// 🔹 INITIALIZATION
// ===============================

function initializeProducts() {
    console.log("✅ Products initialized");

    const addButton = document.querySelector('.add-button');
    if (addButton) addButton.onclick = openProductModal;

    window.addEventListener('click', e => {
        const modal = document.getElementById('productModal');
        if (e.target === modal) closeProductModal();
    });

    loadCategoryOptions();
    loadProductsData();
    window.addEventListener("categoriesUpdated", loadCategoryOptions);
}
