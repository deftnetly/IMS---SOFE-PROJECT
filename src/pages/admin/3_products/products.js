function loadCategoryOptions() {
    const select = document.getElementById("category");
    const list = document.getElementById("categoryListDisplay");

    if (!select || !list) return;

    select.innerHTML = '<option value="">Select Category</option>';
    list.innerHTML = "";

    const saved = JSON.parse(localStorage.getItem("categoriesData")) || [];

    saved.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.name;
        opt.textContent = cat.name;
        select.appendChild(opt);

        const li = document.createElement("li");
        li.textContent = cat.name;
        list.appendChild(li);
    });

    if (!saved.length) {
        const li = document.createElement("li");
        li.textContent = "No categories yet.";
        list.appendChild(li);
    }
}

function openProductModal() {
    document.getElementById("productModal").style.display = "block";
}

function closeProductModal() {
    document.getElementById("productModal").style.display = "none";
}

function addProduct(event) {
    event.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const category = document.getElementById("category").value;
    const price = parseFloat(document.getElementById("price").value);
    const stock = parseInt(document.getElementById("stock").value);
    const status = document.getElementById("status").value;
    const dateAdded = new Date().toLocaleDateString();

    if (!name || !category || isNaN(price) || isNaN(stock)) {
        alert("Fill in all fields correctly.");
        return false;
    }

    const id = "P" + String(Date.now()).slice(-6);

    const product = { id, name, category, price, stock, dateAdded, status };

    let products = JSON.parse(localStorage.getItem("productsData")) || [];
    products.push(product);
    localStorage.setItem("productsData", JSON.stringify(products));

    addProductToTable(product);
    document.getElementById("addProductForm").reset();
    closeProductModal();
    return false;
}

function addProductToTable(product) {
    const tableBody = document.getElementById("productsTbody");
    if (!tableBody) return;

    const row = tableBody.insertRow();

    row.insertCell().textContent = product.id;
    row.insertCell().textContent = product.name;
    row.insertCell().textContent = product.category;
    row.insertCell().textContent = "₱" + product.price.toFixed(2);
    row.insertCell().textContent = product.stock;
    row.insertCell().textContent = product.dateAdded;
    row.insertCell().textContent = product.status;

    const btns = row.insertCell();

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "action-button edit-button";
    editBtn.onclick = () => editProduct(product.id);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "action-button delete-button";
    deleteBtn.onclick = () => deleteProduct(product.id, deleteBtn);

    btns.appendChild(editBtn);
    btns.appendChild(deleteBtn);
}

function loadProductsData() {
    const list = JSON.parse(localStorage.getItem("productsData")) || [];
    const tableBody = document.getElementById("productsTbody");

    tableBody.innerHTML = "";
    list.forEach(addProductToTable);
}

// Editing logic stays same…

function initializeProducts() {
    loadCategoryOptions();
    loadProductsData();
}

document.addEventListener("sectionLoaded", e => {
    if (e.detail.section === "products") initializeProducts();
});
