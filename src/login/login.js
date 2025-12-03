// ========================================
// FINAL LOGIN.JS (with safeRedirect)
// ========================================

// Path to login.php
const LOGIN_PHP_PATH = "login.php";

// ----------------------------------------
// Safe redirect handler
// ----------------------------------------
function safeRedirect(redirectPath) {
  console.log("safeRedirect() received:", redirectPath);

  // 1) Absolute path (starts with /)
  if (redirectPath && redirectPath.startsWith("/")) {
    console.log("Using ABSOLUTE redirect:", redirectPath);
    window.location.href = redirectPath;
    return;
  }

  // 2) Full external URL
  try {
    const u = new URL(redirectPath);
    if (u.protocol && u.host) {
      console.log("Using FULL URL redirect:", redirectPath);
      window.location.href = redirectPath;
      return;
    }
  } catch (e) {}

  // 3) Fallback candidate absolute paths
  const candidates = [
    "/smart-inventory/src/pages/employee/Employee.html",  // correct for your setup
    "/src/pages/employee/Employee.html",
    "/Employee.html"
  ];

  console.log("Trying fallback redirect paths...");

  (async () => {
    for (const c of candidates) {
      try {
        console.log("Testing path:", c);
        const r = await fetch(c, { method: "GET", credentials: "same-origin" });

        if (r.ok) {
          console.log("Redirect path FOUND:", c);
          window.location.href = c;
          return;
        }
      } catch (err) {
        console.warn("Failed test:", c, err);
      }
    }

    // If all fail, just try redirectPath directly
    if (redirectPath) {
      console.warn("Using raw redirect:", redirectPath);
      window.location.href = redirectPath;
    } else {
      alert("Unable to find Employee page after checking multiple paths.");
    }
  })();
}

// ----------------------------------------
// MAIN LOGIN FUNCTION
// ----------------------------------------
async function checkLogin() {
  const userEl = document.getElementById("username");
  const passEl = document.getElementById("password");
  const submitBtn = document.querySelector('#loginForm button[type="submit"]');

  const username = userEl ? userEl.value.trim() : "";
  const password = passEl ? passEl.value : "";

  if (!username || !password) {
    alert("Enter username and password");
    return;
  }

  // disable submit to avoid double requests
  if (submitBtn) submitBtn.disabled = true;

  try {
    const fd = new FormData();
    fd.append("username", username);
    fd.append("password", password);

    const res = await fetch(LOGIN_PHP_PATH, {
      method: "POST",
      body: fd,
      credentials: "same-origin"
    });

    const raw = await res.text();
    console.log("RAW LOGIN RESPONSE:", raw);

    let data;
    try { data = JSON.parse(raw); } catch (e) {
      alert("Server returned invalid JSON. Check console for details.");
      console.error("Invalid JSON from server:", raw);
      return;
    }

    if (!data.success) {
      alert(data.message || "Login failed.");
      return;
    }

    safeRedirect(data.redirect);

  } catch (err) {
    console.error("Login network/server error:", err);
    alert("Login error — check network or server.");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}


// ----------------------------------------
// DOM READY
// ----------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("login.js loaded.");

  // Bind form submit
  const form = document.getElementById("loginForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      checkLogin();
    });
  }

  // Eye icon toggle
  const password = document.getElementById("password");
  const toggleBtn = document.getElementById("togglePassword");

  if (toggleBtn && password) {
    toggleBtn.addEventListener("click", () => {
      const hidden = password.type === "password";
      password.type = hidden ? "text" : "password";
      toggleBtn.textContent = hidden ? "🙈" : "👁";

      // Keep cursor at end
      password.focus();
      const v = password.value;
      password.value = "";
      password.value = v;
    });
  }
});
