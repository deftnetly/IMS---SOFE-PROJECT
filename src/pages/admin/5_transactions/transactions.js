// ===============================
// transactions.js – Persistent Version
// ===============================

let transactionsData = [];

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ transactions.js loaded");

  const tbody = document.querySelector(".data-table tbody");
  const employeeFilter = document.getElementById("employeeFilter");
  const dateFilter = document.getElementById("dateFilter");

  // ✅ Load from localStorage
  loadTransactions();

  // ✅ Populate employee dropdown
  populateEmployeeFilter();

  // ✅ Display transactions
  displayTransactions(transactionsData);

  // 🔹 FILTERS
  window.applyFilters = () => {
    const dateValue = dateFilter.value;
    const employeeValue = employeeFilter.value;

    let filtered = [...transactionsData];
    if (dateValue) filtered = filtered.filter((t) => t.datetime.startsWith(dateValue));
    if (employeeValue) filtered = filtered.filter((t) => t.employeeId === employeeValue);

    displayTransactions(filtered);
  };

  // 🔹 VIEW TRANSACTION DETAILS
  window.viewTransaction = (id) => {
    const t = transactionsData.find((x) => x.id === id);
    if (!t) return alert("Transaction not found.");

    document.getElementById("modalTransactionId").textContent = t.id;
    document.getElementById("modalDateTime").textContent = t.datetime;
    document.getElementById("modalEmployee").textContent = t.employeeName;

    const modalItemsList = document.getElementById("modalItemsList");
    modalItemsList.innerHTML = "";

    t.items.forEach((item) => {
      const subtotal = item.quantity * item.price;
      const row = modalItemsList.insertRow();
      row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>₱${item.price.toLocaleString()}</td>
        <td>₱${subtotal.toLocaleString()}</td>
      `;
    });

    document.getElementById("modalTotal").textContent = `₱${t.total.toLocaleString()}`;
    document.getElementById("transactionModal").style.display = "block";
  };

  // 🔹 CLOSE MODAL
  window.closeTransactionModal = () => {
    document.getElementById("transactionModal").style.display = "none";
  };

  // 🔹 DELETE TRANSACTION
  window.deleteTransaction = (id) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    transactionsData = transactionsData.filter((t) => t.id !== id);
    localStorage.setItem("transactionsData", JSON.stringify(transactionsData));
    displayTransactions(transactionsData);
    alert("Transaction deleted successfully.");
  };

  // ===============================
  // FUNCTIONS
  // ===============================

  function loadTransactions() {
    const saved = localStorage.getItem("transactionsData");
    transactionsData = saved ? JSON.parse(saved) : [];

    // Fallback: no transactions yet
    if (transactionsData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No transactions found</td></tr>`;
    }
  }

  function displayTransactions(list) {
    tbody.innerHTML = "";

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No transactions found</td></tr>`;
      return;
    }

    list.forEach((t) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${t.id}</td>
        <td>${t.datetime}</td>
        <td>${t.employeeName}</td>
        <td>${t.items.length} items</td>
        <td>₱${t.total.toLocaleString()}</td>
        <td>
          <button class="view-button" onclick="viewTransaction('${t.id}')">View</button>
          <button class="delete-button" onclick="deleteTransaction('${t.id}')">Delete</button>
        </td>
      `;
    });
  }

  function populateEmployeeFilter() {
    const employees = JSON.parse(localStorage.getItem("employeesData")) || [];
    employees.forEach((emp) => {
      const option = document.createElement("option");
      option.value = emp.id;
      option.textContent = emp.fullName;
      employeeFilter.appendChild(option);
    });
  }
});
