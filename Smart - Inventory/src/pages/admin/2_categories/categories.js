// ===============================
// categories.js – persistent version
// ===============================

let categoryCounter = 1;
let currentEditingRow = null;
let categoriesData = [];

// Get next category ID
function getNextCategoryId() {
    return `C${String(categoryCounter).padStart(3, '0')}`;
}

// ✅ Load saved categories from localStorage and display them
function loadCategoriesData() {
    const savedData = localStorage.getItem('categoriesData');
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    categoriesData = savedData ? JSON.parse(savedData) : [];

    if (categoriesData.length > 0) {
        categoryCounter =
            parseInt(categoriesData[categoriesData.length - 1].id.substring(1)) + 1;
    } else {
        categoryCounter = 1;
    }

    categoriesData.forEach(cat => addCategoryToTable(cat));
}

// ✅ Add a single row to the table
function addCategoryToTable(category) {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;

    const row = tableBody.insertRow();
    row.innerHTML = `
        <td>${category.id}</td>
        <td>${category.name}</td>
        <td>${category.description}</td>
        <td>
            <button class="action-button edit-button" onclick="editCategory(this)">Edit</button>
            <button class="action-button delete-button" onclick="deleteCategory(this)">Delete</button>
        </td>
    `;
}

// ✅ Modal controls
function openCategoryModal(isEditing = false) {
    const modal = document.getElementById('categoryModal');
    const modalTitle = modal.querySelector('h2');
    const submitBtn = modal.querySelector('.submit-button');

    modal.style.display = 'block';
    document.getElementById('addCategoryForm').reset();

    if (isEditing) {
        modalTitle.textContent = 'Edit Category';
        submitBtn.textContent = 'Update Category';
    } else {
        modalTitle.textContent = 'Add New Category';
        submitBtn.textContent = 'Add Category';
    }
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    currentEditingRow = null;
}

// ✅ Add / Update category
function addCategory(event) {
    event.preventDefault();

    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!name || !description) {
        alert("Please fill in all fields.");
        return false;
    }

    if (currentEditingRow) {
        // Update
        const id = currentEditingRow.cells[0].textContent;
        const index = categoriesData.findIndex(c => c.id === id);

        categoriesData[index] = { id, name, description };
        currentEditingRow.cells[1].textContent = name;
        currentEditingRow.cells[2].textContent = description;

        currentEditingRow = null;
    } else {
        // Add new
        const newCategory = {
            id: getNextCategoryId(),
            name,
            description
        };
        categoriesData.push(newCategory);
        categoryCounter++;
        addCategoryToTable(newCategory);
    }

    localStorage.setItem('categoriesData', JSON.stringify(categoriesData));
    window.dispatchEvent(new Event("categoriesUpdated"));
    closeCategoryModal();
    document.getElementById('addCategoryForm').reset();
    return false;
}

// ✅ Edit existing category
function editCategory(button) {
    const row = button.closest('tr');
    currentEditingRow = row;

    const name = row.cells[1].textContent;
    const desc = row.cells[2].textContent;

    document.getElementById('categoryName').value = name;
    document.getElementById('description').value = desc;

    openCategoryModal(true);
}

// ✅ Delete category
function deleteCategory(button) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    const row = button.closest('tr');
    const id = row.cells[0].textContent;

    categoriesData = categoriesData.filter(c => c.id !== id);
    localStorage.setItem('categoriesData', JSON.stringify(categoriesData));
    row.remove();
    window.dispatchEvent(new Event("categoriesUpdated"));
}

// ✅ Initialization (runs every time the tab loads)
function initializeCategories() {
    console.log("✅ Categories initialized");

    // Set Add button
    const addButton = document.querySelector('.add-button');
    if (addButton) addButton.onclick = openCategoryModal;

    // Modal close handler
    window.addEventListener('click', e => {
        const modal = document.getElementById('categoryModal');
        if (e.target === modal) closeCategoryModal();
    });

    // Load table from localStorage each time
    loadCategoriesData();
}

// Expose functions globally (for inline onclick)
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.addCategory = addCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.initializeCategories = initializeCategories;
