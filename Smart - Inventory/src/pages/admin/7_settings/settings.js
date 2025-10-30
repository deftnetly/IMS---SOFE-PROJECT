document.addEventListener("DOMContentLoaded", () => {
    const darkModeToggle = document.getElementById("darkModeToggle");

    // Always target the real Admin body
    const rootBody = window.top.document.body;

    // Get saved theme from localStorage
    const savedTheme = localStorage.getItem("theme");

    // Apply saved theme immediately
    if (savedTheme === "dark") {
        rootBody.classList.add("dark-mode");
        darkModeToggle.checked = true;
    } else {
        rootBody.classList.remove("dark-mode");
        darkModeToggle.checked = false;
    }

    // Handle toggle
    darkModeToggle.addEventListener("change", () => {
        if (darkModeToggle.checked) {
            rootBody.classList.add("dark-mode");
            localStorage.setItem("theme", "dark");
        } else {
            rootBody.classList.remove("dark-mode");
            localStorage.setItem("theme", "light");
        }
    });

    // === Store details below ===
    const storeName = localStorage.getItem("storeName");
    const currency = localStorage.getItem("currency");
    const logo = localStorage.getItem("storeLogo");

    if (storeName) document.getElementById("storeName").value = storeName;
    if (currency) document.getElementById("currency").value = currency;

    if (logo) {
        const preview = document.createElement("img");
        preview.src = logo;
        preview.alt = "Store Logo";
        preview.style.maxWidth = "100px";
        preview.style.marginTop = "10px";
        document.getElementById("logo").insertAdjacentElement("afterend", preview);
    }
});

function saveStoreSettings(event) {
    event.preventDefault();

    const storeName = document.getElementById("storeName").value.trim();
    const currency = document.getElementById("currency").value.trim();
    const logoInput = document.getElementById("logo");

    if (!storeName || !currency) {
        alert("Please fill in all required fields.");
        return false;
    }

    localStorage.setItem("storeName", storeName);
    localStorage.setItem("currency", currency);

    if (logoInput.files && logoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            localStorage.setItem("storeLogo", e.target.result);
            alert("Store details saved!");
            location.reload();
        };
        reader.readAsDataURL(logoInput.files[0]);
    } else {
        alert("Store details saved!");
    }

    return false;
}
