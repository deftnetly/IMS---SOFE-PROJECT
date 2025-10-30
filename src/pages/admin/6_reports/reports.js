// ===============================
// reports.js – Advanced Reports (with Employee Performance)
// ===============================

let reportsData = [];

// ✅ Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Reports initialized");
    loadReports();
    displayReports(reportsData);
});

// ✅ Generate Report Button
window.generateReport = function () {
    const reportType = document.getElementById("reportType").value;
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    if (!startDate || !endDate) {
        alert("Please select a start and end date.");
        return;
    }

    const transactions = JSON.parse(localStorage.getItem("transactionsData")) || [];

    const filteredTransactions = transactions.filter(t => {
        const date = new Date(t.datetime);
        return date >= new Date(startDate) && date <= new Date(endDate);
    });

    if (filteredTransactions.length === 0) {
        alert("No transactions found for this date range.");
        return;
    }

    const currentDate = new Date().toLocaleDateString();
    const reportId = "R" + String(Date.now()).slice(-5);
    const generatedBy = "Admin"; // update this to real username if needed

    let totalSales = 0;
    let totalTransactions = filteredTransactions.length;
    let details = [];

    if (reportType === "sales") {
        totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);

        details.push({
            label: "Total Sales",
            value: `₱${totalSales.toLocaleString()}`
        });
        details.push({
            label: "Total Transactions",
            value: totalTransactions
        });
    }

    // 🧮 Employee Performance Report
    else if (reportType === "employee") {
        const employeeStats = {};

        filteredTransactions.forEach(t => {
            if (!employeeStats[t.employeeName]) {
                employeeStats[t.employeeName] = {
                    totalSales: 0,
                    transactions: 0
                };
            }
            employeeStats[t.employeeName].totalSales += t.total;
            employeeStats[t.employeeName].transactions += 1;
        });

        const sortedEmployees = Object.entries(employeeStats)
            .map(([name, stats]) => ({
                name,
                totalSales: stats.totalSales,
                transactions: stats.transactions
            }))
            .sort((a, b) => b.totalSales - a.totalSales);

        details = sortedEmployees; // store ranking

        totalSales = sortedEmployees.reduce((sum, e) => sum + e.totalSales, 0);
    }

    // 📦 Inventory Report Placeholder
    else if (reportType === "inventory") {
        totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
        details.push({
            label: "Total Inventory Movement",
            value: filteredTransactions.length
        });
    }

    const newReport = {
        id: reportId,
        type: reportType,
        startDate,
        endDate,
        dateGenerated: currentDate,
        totalSales,
        totalTransactions,
        generatedBy,
        details
    };

    reportsData.push(newReport);
    localStorage.setItem("reportsData", JSON.stringify(reportsData));

    addReportToTable(newReport);
    alert("✅ Report generated successfully!");
};

// ✅ Load saved reports
function loadReports() {
    const saved = localStorage.getItem("reportsData");
    reportsData = saved ? JSON.parse(saved) : [];
}

// ✅ Display all reports
function displayReports(list) {
    const tbody = document.querySelector("#reportTable tbody");
    tbody.innerHTML = "";

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No reports found</td></tr>`;
        return;
    }

    list.forEach(r => addReportToTable(r));
}

// ✅ Add report row to table
function addReportToTable(report) {
    const tbody = document.querySelector("#reportTable tbody");
    const row = tbody.insertRow();

    const typeLabel =
        report.type === "employee"
            ? "Employee Performance"
            : report.type === "sales"
            ? "Sales Summary"
            : "Inventory Summary";

    row.innerHTML = `
        <td>${report.id}</td>
        <td>${typeLabel}</td>
        <td>${report.dateGenerated}</td>
        <td>₱${report.totalSales.toLocaleString()}</td>
        <td>${report.totalTransactions || "-"}</td>
        <td>${report.generatedBy}</td>
        <td>
            <button class="view-button" onclick="viewReport('${report.id}')">View</button>
            <button class="delete-button" onclick="deleteReport('${report.id}')">Delete</button>
        </td>
    `;
}

// ✅ View report details
window.viewReport = function (id) {
    const report = reportsData.find(r => r.id === id);
    if (!report) return;

    document.getElementById("modalReportId").textContent = report.id;
    document.getElementById("modalReportType").textContent = report.type;
    document.getElementById("modalDateGenerated").textContent = report.dateGenerated;
    document.getElementById("modalTotalSales").textContent = `₱${report.totalSales.toLocaleString()}`;
    document.getElementById("modalGeneratedBy").textContent = report.generatedBy;

    const detailsContainer = document.getElementById("reportDetails");
    detailsContainer.innerHTML = "";

    if (report.type === "employee") {
        const table = document.createElement("table");
        table.classList.add("inner-table");
        table.innerHTML = `
            <thead>
                <tr><th>Employee</th><th>Transactions</th><th>Total Sales</th></tr>
            </thead>
            <tbody>
                ${report.details
                    .map(
                        e => `
                    <tr>
                        <td>${e.name}</td>
                        <td>${e.transactions}</td>
                        <td>₱${e.totalSales.toLocaleString()}</td>
                    </tr>`
                    )
                    .join("")}
            </tbody>
        `;
        detailsContainer.appendChild(table);
    } else {
        report.details.forEach(d => {
            const div = document.createElement("div");
            div.textContent = `${d.label}: ${d.value}`;
            detailsContainer.appendChild(div);
        });
    }

    document.getElementById("reportModal").style.display = "block";
};

// ✅ Close modal
window.closeReportModal = function () {
    document.getElementById("reportModal").style.display = "none";
};

// ✅ Delete report
window.deleteReport = function (id) {
    if (!confirm("Are you sure you want to delete this report?")) return;

    reportsData = reportsData.filter(r => r.id !== id);
    localStorage.setItem("reportsData", JSON.stringify(reportsData));
    displayReports(reportsData);
};
