// ===============================
// EMPLOYEES.JS – Persistent Version
// ===============================

let employeeCounter = 1;
let currentEditingRow = null;
let employeesData = [];

// ✅ Generate Employee ID
function getNextEmployeeId() {
    return `E${String(employeeCounter).padStart(3, '0')}`;
}

// ✅ Load saved employees from localStorage
function loadEmployeesData() {
    const savedData = localStorage.getItem('employeesData');
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    employeesData = savedData ? JSON.parse(savedData) : [];

    if (employeesData.length > 0) {
        employeeCounter =
            parseInt(employeesData[employeesData.length - 1].id.substring(1)) + 1;
    } else {
        employeeCounter = 1;
    }

    employeesData.forEach(emp => addEmployeeToTable(emp));
}

// ✅ Add one employee to the table
function addEmployeeToTable(employee) {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;

    const row = tableBody.insertRow();
    row.innerHTML = `
        <td>${employee.id}</td>
        <td>${employee.fullName}</td>
        <td>${employee.position}</td>
        <td>${employee.email}</td>
        <td>${employee.phone}</td>
        <td>${employee.username}</td>
        <td>
            <span class="password-mask">${maskPassword(employee.password)}</span>
            <button class="small-btn" onclick="toggleRowPassword(this)">Show</button>
        </td>
        <td>${employee.dateCreated}</td>
        <td>
            <button class="action-button edit-button" onclick="editEmployee(this)">Edit</button>
            <button class="action-button delete-button" onclick="deleteEmployee(this)">Delete</button>
        </td>
    `;
    row.dataset.password = employee.password;
}

// ✅ Modal controls
function openEmployeeModal(isEditing = false) {
    const modal = document.getElementById('employeeModal');
    const modalTitle = modal.querySelector('h2');
    const submitBtn = modal.querySelector('.submit-button');

    modal.style.display = 'block';
    document.getElementById('addEmployeeForm').reset();

    if (isEditing) {
        modalTitle.textContent = 'Edit Employee';
        submitBtn.textContent = 'Update Employee';
    } else {
        modalTitle.textContent = 'Add New Employee';
        submitBtn.textContent = 'Add Employee';
    }
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'none';
    currentEditingRow = null;
}

// ✅ Password validation
function validatePassword(password) {
    const hasUppercase = /[A-Z]/.test(password);
    const isAtLeastEight = password.length >= 8;

    if (!hasUppercase && !isAtLeastEight) {
        alert("Password must contain at least one uppercase letter and be at least 8 characters long.");
        return false;
    }
    if (!hasUppercase) {
        alert("Password must contain at least one uppercase letter.");
        return false;
    }
    if (!isAtLeastEight) {
        alert("Password must be at least 8 characters long.");
        return false;
    }
    return true;
}

// ✅ Add / Update Employee
function addEmployee(event) {
    event.preventDefault();

    const fullName = document.getElementById('employeeName').value.trim();
    const position = document.getElementById('position').value;
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!fullName || !position || !email || !phone || !username || !password) {
        alert("Please fill in all fields.");
        return false;
    }

    if (!validatePassword(password)) {
        return false;
    }

    const currentDate = new Date().toLocaleDateString();

    if (currentEditingRow) {
        // Update existing
        const id = currentEditingRow.cells[0].textContent;
        const index = employeesData.findIndex(e => e.id === id);

        employeesData[index] = {
            id,
            fullName,
            position,
            email,
            phone,
            username,
            password,
            dateCreated: employeesData[index].dateCreated
        };

        localStorage.setItem('employeesData', JSON.stringify(employeesData));

        currentEditingRow.cells[1].textContent = fullName;
        currentEditingRow.cells[2].textContent = position;
        currentEditingRow.cells[3].textContent = email;
        currentEditingRow.cells[4].textContent = phone;
        currentEditingRow.cells[5].textContent = username;
        currentEditingRow.cells[6].querySelector('.password-mask').textContent = maskPassword(password);
        currentEditingRow.dataset.password = password;

        currentEditingRow = null;
    } else {
        // Add new
        const newEmployee = {
            id: getNextEmployeeId(),
            fullName,
            position,
            email,
            phone,
            username,
            password,
            dateCreated: currentDate
        };

        employeesData.push(newEmployee);
        localStorage.setItem('employeesData', JSON.stringify(employeesData));
        addEmployeeToTable(newEmployee);
        employeeCounter++;
    }

    closeEmployeeModal();
    document.getElementById('addEmployeeForm').reset();
    return false;
}

// ✅ Edit Employee
function editEmployee(button) {
    const row = button.closest('tr');
    currentEditingRow = row;

    const fullName = row.cells[1].textContent;
    const position = row.cells[2].textContent;
    const email = row.cells[3].textContent;
    const phone = row.cells[4].textContent;
    const username = row.cells[5].textContent;
    const storedPassword = row.dataset.password || '';

    document.getElementById('employeeName').value = fullName;
    document.getElementById('position').value = position;
    document.getElementById('email').value = email;
    document.getElementById('phone').value = phone;
    document.getElementById('username').value = username;
    document.getElementById('password').value = storedPassword;

    openEmployeeModal(true);
}

// ✅ Delete Employee
function deleteEmployee(button) {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    const row = button.closest('tr');
    const id = row.cells[0].textContent;

    employeesData = employeesData.filter(e => e.id !== id);
    localStorage.setItem('employeesData', JSON.stringify(employeesData));
    row.remove();
}

// ✅ Toggle show/hide password in modal
function togglePasswordInputVisibility() {
    const pw = document.getElementById('password');
    const toggleBtn = document.getElementById('togglePassword');
    if (!pw || !toggleBtn) return;

    if (pw.type === 'password') {
        pw.type = 'text';
        toggleBtn.textContent = '🙈 Hide';
        toggleBtn.classList.add('active');
    } else {
        pw.type = 'password';
        toggleBtn.textContent = '👁 Show';
        toggleBtn.classList.remove('active');
    }
}

// ✅ Toggle password visibility in table
function toggleRowPassword(button) {
    const row = button.closest('tr');
    if (!row) return;

    const storedPassword = row.dataset.password || '';
    const maskSpan = row.querySelector('.password-mask');

    if (!maskSpan) return;

    const isShowing = button.textContent.trim().toLowerCase() === 'hide';

    if (isShowing) {
        maskSpan.textContent = maskPassword(storedPassword);
        button.textContent = 'Show';
    } else {
        maskSpan.textContent = storedPassword;
        button.textContent = 'Hide';
    }
}

// ✅ Mask password visually
function maskPassword(password) {
    return '•'.repeat(Math.max(6, password.length));
}

// ✅ Initialize when tab loads
function initializeEmployees() {
    console.log("✅ Employees initialized");

    const addButton = document.querySelector('.add-button');
    if (addButton) addButton.onclick = () => openEmployeeModal(false);

    window.addEventListener('click', e => {
        const modal = document.getElementById('employeeModal');
        if (e.target === modal) closeEmployeeModal();
    });

    loadEmployeesData();
}

// ✅ Expose globally
window.openEmployeeModal = openEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.addEmployee = addEmployee;
window.editEmployee = editEmployee;
window.deleteEmployee = deleteEmployee;
window.initializeEmployees = initializeEmployees;
