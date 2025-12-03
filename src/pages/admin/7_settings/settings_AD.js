function initializeSettings() {
    const darkModeButton = document.getElementById("darkModeButton");

    // Stop if button isn't there yet
    if (!darkModeButton) {
        console.warn("Dark Mode button not found yet, retrying...");
        setTimeout(initializeSettings, 100); // retry after 100ms
        return;
    }

    const rootBody = document.body;

    // === DARK MODE ===
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
        rootBody.classList.add("dark-mode");
        darkModeButton.textContent = "Disable Dark Mode";
    } else {
        rootBody.classList.remove("dark-mode");
        darkModeButton.textContent = "Enable Dark Mode";
    }

    darkModeButton.addEventListener("click", () => {
        const isDark = rootBody.classList.toggle("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        darkModeButton.textContent = isDark ? "Disable Dark Mode" : "Enable Dark Mode";
    });

    // === STORE DETAILS ===
    loadStoreDetails();
}

function loadStoreDetails() {
    const storeName = localStorage.getItem("storeName");
    const currency = localStorage.getItem("currency");
    const logo = localStorage.getItem("storeLogo");

    if (storeName) document.getElementById("storeName").value = storeName;
    if (currency) document.getElementById("currency").value = currency;

    const logoInput = document.getElementById("logo");
    const existingPreview = document.getElementById("logoPreview");

    // Remove old preview if any
    if (existingPreview) existingPreview.remove();

    if (logo) {
        const preview = document.createElement("img");
        preview.id = "logoPreview";
        preview.src = logo;
        preview.alt = "Store Logo";
        preview.style.maxWidth = "100px";
        preview.style.marginTop = "10px";
        logoInput.insertAdjacentElement("afterend", preview);
    }
}

function saveStoreSettings(event) {
    event.preventDefault();

    const storeName = document.getElementById("storeName").value.trim();
    const currency = document.getElementById("currency").value.trim();
    const logoInput = document.getElementById("logo");

    if (!storeName || !currency) {
        alert("Please fill in all required fields.");
        return false;
    }

    // Save to localStorage
    localStorage.setItem("storeName", storeName);
    localStorage.setItem("currency", currency);

    // Save logo if uploaded
    if (logoInput.files && logoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            localStorage.setItem("storeLogo", e.target.result);
            alert("Store details saved!");
            loadStoreDetails(); // Reload preview without page refresh
        };
        reader.readAsDataURL(logoInput.files[0]);
    } else {
        alert("Store details saved!");
    }

    return false;
}
