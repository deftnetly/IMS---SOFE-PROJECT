const LOGIN_PHP_PATH = "login.php";
const PASSWORD_EYE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke-width="1.8"/>
  </svg>
`;
const PASSWORD_EYE_OFF_ICON = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 3l18 18" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M10.6 6.3A11.4 11.4 0 0 1 12 6c6.5 0 10 6 10 6a17.6 17.6 0 0 1-4.1 4.6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6.2 6.8C3.7 8.6 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

function safeRedirect(redirectPath) {
  console.log("safeRedirect() received:", redirectPath);

  if (redirectPath && redirectPath.startsWith("/")) {
    window.location.href = redirectPath;
    return;
  }

  try {
    const url = new URL(redirectPath);
    if (url.protocol && url.host) {
      window.location.href = redirectPath;
      return;
    }
  } catch (error) {}

  const candidates = [
    "/smart-inventory/src/pages/employee/Employee.html",
    "/src/pages/employee/Employee.html",
    "/Employee.html"
  ];

  (async () => {
    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, { method: "GET", credentials: "same-origin" });
        if (response.ok) {
          window.location.href = candidate;
          return;
        }
      } catch (error) {
        console.warn("Failed test:", candidate, error);
      }
    }

    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      alert("Unable to find Employee page after checking multiple paths.");
    }
  })();
}

async function checkLogin() {
  const userEl = document.getElementById("username");
  const passEl = document.getElementById("password");
  const submitBtn = document.querySelector("#loginForm button[type='submit']");

  const username = userEl ? userEl.value.trim() : "";
  const password = passEl ? passEl.value : "";

  if (!username || !password) {
    alert("Enter username and password");
    return;
  }

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
    let data;

    try {
      data = JSON.parse(raw);
    } catch (error) {
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
    alert("Login error - check network or server.");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("login.js loaded.");

  const form = document.getElementById("loginForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      checkLogin();
    });
  }

  const password = document.getElementById("password");
  const toggleBtn = document.getElementById("togglePassword");

  if (toggleBtn && password) {
    toggleBtn.innerHTML = PASSWORD_EYE_ICON;
    toggleBtn.setAttribute("aria-label", "Show password");

    toggleBtn.addEventListener("click", () => {
      const hidden = password.type === "password";
      password.type = hidden ? "text" : "password";
      toggleBtn.innerHTML = hidden ? PASSWORD_EYE_OFF_ICON : PASSWORD_EYE_ICON;
      toggleBtn.setAttribute("aria-label", hidden ? "Hide password" : "Show password");

      password.focus();
      const value = password.value;
      password.value = "";
      password.value = value;
    });
  }
});
