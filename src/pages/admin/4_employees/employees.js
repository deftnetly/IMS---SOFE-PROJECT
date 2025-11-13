let employeeCounter = 1;
let currentEditingRow = null;
let employeesData = [];

function getNextEmployeeId() {
    return `E${String(employeeCounter).padStart(3, '0')}`;
}

function loadEmployeesData() {
    const saved = localStorage.getItem("employeesData");
    const tableBody = document.getElementById("employeesTbody");
    if (!tableBody) return;

    tableBody.innerHTML = "";
    employeesData = saved ? JSON.parse(saved) : [];

    if (employeesData.length > 0) {
        employeeCounter = parseInt(employeesData[employeesData.length - 1].id.substring(1)) + 1;
    } else {
        employeeCounter = 1;
    }

    employeesData.forEach(emp => addEmployeeToTable(emp));
}

function addEmployeeToTable(employee) {
    const tableBody = document.getElementById("employeesTbody");
    if (!tableBody) return;

    const row = tableBody.insertRow();
    row.innerHTML = `
        <td>${employee.id}</td>
        <td>${employee.fullName}</td>
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

function openEmployeeModal(isEditing = false) {
    const modal = document.getElementById('employeeModal');
    const submitBtn = modal.querySelector('.submit-button');

    modal.style.display = "block";
    document.getElementById("addEmployeeForm").reset();

    submitBtn.textContent = isEditing ? "Update Employee" : "Add Employee";
}

function closeEmployeeModal() {
    document.getElementById("employeeModal").style.display = "none";
    currentEditingRow = null;
}

function validatePassword(password) {
    return /[A-Z]/.test(password) && password.length >= 8;
}

function addEmployee(event) {
    event.preventDefault();

    const fullName = document.getElementById('employeeName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!fullName || !email || !phone || !username || !password) {
        alert("Please fill all fields.");
        return false;
    }

    if (!validatePassword(password)) {
        alert("Password must contain uppercase & be 8 characters.");
        return false;
    }

    const dateCreated = new Date().toLocaleDateString();

    if (currentEditingRow) {
        const id = currentEditingRow.cells[0].textContent;
        const index = employeesData.findIndex(e => e.id === id);

        employeesData[index] = {
            id,
            fullName,
            email,
            phone,
            username,
            password,
            dateCreated: employeesData[index].dateCreated
        };

        localStorage.setItem("employeesData", JSON.stringify(employeesData));
        loadEmployeesData();
        currentEditingRow = null;

    } else {
        const newEmployee = {
            id: getNextEmployeeId(),
            fullName,
            email,
            phone,
            username,
            password,
            dateCreated
        };

        employeesData.push(newEmployee);
        localStorage.setItem("employeesData", JSON.stringify(employeesData));
        addEmployeeToTable(newEmployee);

        employeeCounter++;
    }

    closeEmployeeModal();
    return false;
}

function editEmployee(button) {
    const row = button.closest("tr");
    currentEditingRow = row;

    document.getElementById("employeeName").value = row.cells[1].textContent;
    document.getElementById("email").value = row.cells[2].textContent;
    document.getElementById("phone").value = row.cells[3].textContent;
    document.getElementById("username").value = row.cells[4].textContent;
    document.getElementById("password").value = row.dataset.password;

    openEmployeeModal(true);
}

function deleteEmployee(button) {
    const row = button.closest("tr");
    const id = row.cells[0].textContent;

    if (!confirm("Delete this employee?")) return;

    employeesData = employeesData.filter(e => e.id !== id);
    localStorage.setItem("employeesData", JSON.stringify(employeesData));

    row.remove();
}

function togglePasswordInputVisibility() {
    const pw = document.getElementById('password');
    const toggle = document.getElementById('togglePassword');

    if (pw.type === "password") {
        pw.type = "text";
        toggle.textContent = "🙈 Hide";
    } else {
        pw.type = "password";
        toggle.textContent = "👁 Show";
    }
}

function toggleRowPassword(button) {
    const row = button.closest("tr");
    const password = row.dataset.password;
    const maskSpan = row.querySelector(".password-mask");

    if (button.textContent === "Show") {
        button.textContent = "Hide";
        maskSpan.textContent = password;
    } else {
        button.textContent = "Show";
        maskSpan.textContent = maskPassword(password);
    }
}

function maskPassword(pw) {
    return "•".repeat(Math.max(6, pw.length));
}

function initializeEmployees() {
    loadEmployeesData();

    const addBtn = document.querySelector(".add-button");
    if (addBtn) addBtn.onclick = () => openEmployeeModal(false);
}

document.addEventListener("sectionLoaded", e => {
    if (e.detail.section === "employees") initializeEmployees();
});
