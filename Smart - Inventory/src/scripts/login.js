function checkLogin() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;

  if (user === "admin" && pass === "admin123") {
    window.location.href = "../pages/admin/Admin.html";
    return false;
  } else if (user === "employee" && pass === "emp123") {
    window.location.href = "../pages/employee/Employee.html";
    return false;
  } else {
    alert("Invalid username or password!");
    return false;
  }
}