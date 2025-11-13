let categoryCounter = 1;
let currentEditingRow = null;
let categoriesData = [];

function getNextCategoryId() {
    return `C${String(categoryCounter).padStart(3, '0')}`;
}

function loadCategoriesData() {
    const savedData = localStorage.getItem('categoriesData');
    const tableBody = document.getElementById("categoriesTbody");
    if (!tableBody) return;

    tableBody.innerHTML = '';
    categoriesData = savedData ? JSON.parse(savedData) : [];

    if (categoriesData.length > 0) {
        categoryCounter = parseInt(categoriesData[categoriesData.length - 1].id.substring(1)) + 1;
    } else {
        categoryCounter = 1;
    }

    categoriesData.forEach(cat => addCategoryToTable(cat));
}

function addCategoryToTable(category) {
    const tableBody = document.getElementById("categoriesTbody");
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

function openCategoryModal(isEditing = false) {
    const modal = document.getElementById('categoryModal');
    const title = modal.querySelector('h3');
    const submitBtn = modal.querySelector('.submit-button');

    modal.style.display = 'block';

    if (!isEditing) {
        document.getElementById('addCategoryForm').reset();
        title.textContent = "Add New Category";
        submitBtn.textContent = "Add Category";
    } else {
        title.textContent = "Edit Category";
        submitBtn.textContent = "Update Category";
    }
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    currentEditingRow = null;
}

function addCategory(event) {
    event.preventDefault();

    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!name || !description) {
        alert("Please fill in all fields.");
        return false;
    }

    if (currentEditingRow) {
        const id = currentEditingRow.cells[0].textContent;
        const index = categoriesData.findIndex(c => c.id === id);

        categoriesData[index] = { id, name, description };
        currentEditingRow.cells[1].textContent = name;
        currentEditingRow.cells[2].textContent = description;

        currentEditingRow = null;
    } else {
        const newCategory = {
            id: getNextCategoryId(),
            name,
            description
        };

        categoriesData.push(newCategory);
        addCategoryToTable(newCategory);
        categoryCounter++;
    }

    localStorage.setItem("categoriesData", JSON.stringify(categoriesData));
    window.dispatchEvent(new Event("categoriesUpdated"));

    closeCategoryModal();
    document.getElementById('addCategoryForm').reset();
    return false;
}

function editCategory(button) {
    const row = button.closest("tr");
    currentEditingRow = row;

    document.getElementById('categoryName').value = row.cells[1].textContent;
    document.getElementById('description').value = row.cells[2].textContent;

    openCategoryModal(true);
}

function deleteCategory(button) {
    const row = button.closest("tr");
    const id = row.cells[0].textContent;

    if (!confirm("Are you sure?")) return;

    categoriesData = categoriesData.filter(c => c.id !== id);
    localStorage.setItem("categoriesData", JSON.stringify(categoriesData));

    row.remove();

    window.dispatchEvent(new Event("categoriesUpdated"));
}

function initializeCategories() {
    loadCategoriesData();

    const addBtn = document.querySelector('.add-button');
    if (addBtn) addBtn.onclick = () => openCategoryModal(false);
}

document.addEventListener("sectionLoaded", e => {
    if (e.detail.section === "categories") initializeCategories();
});
