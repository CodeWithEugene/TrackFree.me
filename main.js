// Mobile menu toggle
document.getElementById('mobile-menu-button').addEventListener('click', function() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
});

// Close mobile menu when a link is clicked
const mobileMenuLinks = document.querySelectorAll('#mobile-menu a');
mobileMenuLinks.forEach(link => {
    link.addEventListener('click', function() {
        document.getElementById('mobile-menu').classList.add('hidden');
    });
});

// Scroll animation logic
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            observer.unobserve(entry.target); // Stop observing once animated
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in-up, .fade-in').forEach(element => {
    observer.observe(element);
});

// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();


// Load app data from external JSON file
let appData = [];

fetch('apps.json')
  .then(response => response.json())
  .then(data => {
    appData = data.apps;

    function searchApp(query) {
        const resultBox = document.getElementById("app-results");
        const appName = document.getElementById("app-name");
        const riskScore = document.getElementById("risk-score");
        const dataCollected = document.getElementById("data-collected");
        const optOut = document.getElementById("opt-out-delete");

        // Show loading while searching
        appName.textContent = "Loading...";
        riskScore.textContent = "";
        dataCollected.innerHTML = "";
        optOut.textContent = "";
        resultBox.classList.remove("hidden");

        setTimeout(() => {
            // Case-insensitive, exact match
            const foundApp = appData.find(app => app.name.toLowerCase() === query);

            if (foundApp) {
                // Determine color indicator
                let indicator = "";
                const score = foundApp.risk_score.toLowerCase();
                if (score.includes("low")) {
                    indicator = "🟢";
                } else if (score.includes("medium")) {
                    indicator = "🟡";
                } else if (score.includes("high")) {
                    indicator = "🔴";
                }

                appName.textContent = foundApp.name;
                riskScore.innerHTML = `<strong>Privacy Risk:</strong> ${foundApp.risk_score} ${indicator}`;
                dataCollected.innerHTML = foundApp.data_collected.map(item => `<li>${item}</li>`).join('');
                optOut.textContent = foundApp.opt_out_or_delete;
            } else {
                appName.textContent = "App not found";
                riskScore.textContent = "";
                dataCollected.innerHTML = "";
                optOut.textContent = "";
            }
        }, 500); // Simulate loading delay
    }

    const searchInput = document.getElementById("app-search");
    const searchButton = searchInput?.parentElement.querySelector("button");

    // Only search on button click
    searchButton?.addEventListener("click", function (e) {
        e.preventDefault();
        const query = searchInput.value.trim().toLowerCase();
        if (query.length > 0) {
            searchApp(query);
        } else {
            document.getElementById("app-results").classList.add("hidden");
        }
    });

    // Optional: Pressing Enter triggers search
    searchInput?.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            searchButton.click();
        }
    });
  })
  .catch(error => {
    console.error("Error loading app data:", error);
  });
