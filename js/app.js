/**
 * KOKO Grocery ERP - Main Application Orchestrator
 * Integrates router, theme toggle, time widgets, toast alerts, role checks, and global system configurations.
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize System Time Clock
  setInterval(updateSystemClock, 1000);
  updateSystemClock();

  // 2. Initialize Theme Toggler
  initThemeEngine();

  // 3. Initialize Notification Alerts Scanner
  initAlertsEngine();

  // 4. Initialize Role & Channel Selectors
  initGlobalContextSelectors();

  // 5. Initialize SPA Client Router & Views Registration
  initRouterEngine();

  // 6. Hamburger Menu Trigger for Mobile-First Sidebar collapsing
  const hamburgerBtn = document.getElementById("btn-hamburger");
  const sidebar = document.getElementById("sidebar");
  if (hamburgerBtn && sidebar) {
    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("open");
    });
    // Close sidebar on document click (touch/click outside)
    document.addEventListener("click", (e) => {
      if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== hamburgerBtn) {
        sidebar.classList.remove("open");
      }
    });
  }

  // 7. Initialize Country selector context
  initCountrySelector();
  updateDOMCountryLabels();

  // 8. Secure Mock Login Handlers
  initLoginHandler();
});

function initCountrySelector() {
  const select = document.getElementById("global-country-select");
  if (select) {
    select.value = window.getCurrentCountry();
    select.addEventListener("change", (e) => {
      window.setCurrentCountry(e.target.value);
    });
  }
}

function initLoginHandler() {
  const loginScreen = document.getElementById("login-screen");
  const loginBtn = document.getElementById("btn-login");
  if (loginBtn && loginScreen) {
    loginBtn.addEventListener("click", () => {
      loginScreen.classList.remove("active");
      showToast("Access Granted: Welcome to Koko ERP Terminal", "success");
    });
  }
}

// Clock Logic
function updateSystemClock() {
  const clockEl = document.getElementById("clock-display");
  if (clockEl) {
    const now = new Date();
    clockEl.textContent = window.formatIndianDate(now) + " | " + window.formatIndianTime(now);
  }
}

// Dark/Light Theme Switcher
function initThemeEngine() {
  const btn = document.getElementById("btn-theme-toggle");
  const html = document.documentElement;
  
  // Load saved theme
  const savedTheme = localStorage.getItem("koko_erp_theme") || "dark";
  html.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  btn.addEventListener("click", () => {
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("koko_erp_theme", newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme} mode`, "info");
  });
}

function updateThemeIcon(theme) {
  const icon = document.getElementById("btn-theme-toggle");
  if (theme === "dark") {
    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 20px; height: 20px;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
    `;
  } else {
    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 20px; height: 20px;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    `;
  }
}

// Global Context variables
let currentStore = "store1";
let currentRole = "admin";

function initGlobalContextSelectors() {
  const channelSelect = document.getElementById("global-channel-select");
  const roleSelect = document.getElementById("global-role-select");
  const settings = db.getSettings();

  // Set default store from DB
  if (settings.activeStore) {
    currentStore = settings.activeStore;
    channelSelect.value = currentStore;
  }

  // Monitor channel select changes
  channelSelect.addEventListener("change", (e) => {
    currentStore = e.target.value;
    
    // Save to settings
    const currentSettings = db.getSettings();
    currentSettings.activeStore = currentStore;
    db.saveSettings(currentSettings);
    
    showToast(`Active channel changed to: ${channelSelect.options[channelSelect.selectedIndex].text}`, "info");

    // Force reload active view if it supports responsive context (e.g. POS or Dashboard)
    if (window.router && ["dashboard", "pos", "inventory"].includes(window.router.currentView)) {
      window.router.navigate(window.router.currentView);
    }
  });

  // Monitor role selector changes
  roleSelect.addEventListener("change", (e) => {
    currentRole = e.target.value;
    showToast(`Signed in as Role: ${currentRole.toUpperCase()}`, "success");
    
    // Refresh active view to disable inputs if restricted
    if (window.router) {
      window.router.navigate(window.router.currentView);
    }
  });
}

// Alerts Engine: scan low stock & expiry warnings
function initAlertsEngine() {
  const bell = document.getElementById("btn-notifications");
  
  // Calculate active alerts count
  updateAlertsBadge();

  bell.addEventListener("click", () => {
    const alerts = getSystemAlerts();
    if (alerts.length === 0) {
      showToast("No active system alerts.", "success");
      return;
    }

    // Build lists of active notifications
    let content = `<div style="display:flex; flex-direction:column; gap:8px;">`;
    alerts.forEach(a => {
      const alertClass = a.type === "out" ? "alert-row-danger" : "alert-row-warning";
      content += `
        <div class="alert-row ${alertClass}">
          <div class="alert-msg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>${a.message}</span>
          </div>
        </div>
      `;
    });
    content += `</div>`;

    // Render alert log in virtual popup
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.innerHTML = `
      <div class="modal-container glass-panel-lg" style="max-width:450px;">
        <div class="modal-header">
          <h3 class="modal-title">Active Notifications</h3>
          <button class="modal-close" id="btn-close-alerts">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("btn-close-alerts").addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
  });
}

function getSystemAlerts() {
  const products = db.getProducts();
  const alerts = [];

  products.forEach(p => {
    // 1. Check out of stock (overall stock sum is 0)
    const totalStock = Object.values(p.stock || {}).reduce((a, b) => a + b, 0);
    if (totalStock === 0) {
      alerts.push({
        type: "out",
        message: `OUT OF STOCK: SKU ${p.sku} (${p.name}) has zero inventory.`
      });
    } 
    // 2. Check low stock
    else if (totalStock <= p.reorderPoint) {
      alerts.push({
        type: "low",
        message: `LOW STOCK: SKU ${p.sku} (${p.name}) total is ${totalStock} bags.`
      });
    }

    // 3. Expiry warnings (within 30 days)
    if (p.expiryDate) {
      const exp = new Date(p.expiryDate);
      const diffTime = exp - new Date();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 30) {
        alerts.push({
          type: "exp",
          message: `EXPIRY WARNING: SKU ${p.sku} (${p.name}) expires in ${diffDays} days.`
        });
      }
    }
  });

  return alerts;
}

function updateAlertsBadge() {
  const countEl = document.getElementById("alerts-count");
  if (countEl) {
    const alerts = getSystemAlerts();
    countEl.textContent = alerts.length;
    if (alerts.length > 0) {
      countEl.style.display = "flex";
    } else {
      countEl.style.display = "none";
    }
  }
}

// Router Initializer
function initRouterEngine() {
  const appRouter = new Router();

  // Register views controllers functions (exposed from views directory files)
  appRouter.register("dashboard", window.renderDashboard);
  appRouter.register("inventory", window.renderInventory);
  appRouter.register("pos", window.renderPOS);
  appRouter.register("purchase", window.renderPurchase);
  appRouter.register("logistics", window.renderLogistics);
  appRouter.register("pl", window.renderPL);
  appRouter.register("reports", window.renderReports);
  appRouter.register("customers", window.renderCustomers);
  appRouter.register("employees", window.renderEmployees);
  appRouter.register("settings", window.renderSettings);

  window.router = appRouter;
}

// ROBUST TOAST MESSAGES
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <div class="toast-progress"></div>
  `;
  
  container.appendChild(toast);

  // Auto remove after 3s
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards";
    setTimeout(() => {
      if (container.contains(toast)) container.removeChild(toast);
    }, 300);
  }, 3000);
}

// Modal open/close handlers
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add("active");
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove("active");
}

// Role restricted warnings
function checkRoleAccess(requiredRole) {
  if (currentRole === "admin") return true;
  if (currentRole === "manager" && requiredRole !== "admin") return true;
  
  showToast(`Access Denied: Action requires ${requiredRole.toUpperCase()} privilege level.`, "danger");
  return false;
}

// Country Configuration Settings
const countryConfigs = {
  IN: {
    locale: 'en-IN',
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    timeZone: 'Asia/Kolkata',
    taxStandard: 18,
    taxReduced: 5,
    stores: {
      store1: "Mumbai Retail (Store 1)",
      store2: "Delhi Retail (Store 2)",
      store3: "Bengaluru Retail (Store 3)"
    }
  },
  JP: {
    locale: 'ja-JP',
    currency: 'JPY',
    currencySymbol: '¥',
    dateFormat: 'YYYY/MM/DD',
    timeZone: 'Asia/Tokyo',
    taxStandard: 10,
    taxReduced: 8,
    stores: {
      store1: "Tokyo Retail (Store 1)",
      store2: "Kanagawa Retail (Store 2)",
      store3: "Chiba Retail (Store 3)"
    }
  }
};

window.getCurrentCountry = function() {
  return localStorage.getItem("koko_erp_country") || "IN";
};

window.setCurrentCountry = function(countryCode) {
  localStorage.setItem("koko_erp_country", countryCode);
  
  // Update standard settings database taxes in sync
  const settings = db.getSettings();
  const config = countryConfigs[countryCode];
  settings.taxStandard = config.taxStandard;
  settings.taxReduced = config.taxReduced;
  db.saveSettings(settings);

  // Update labels inside the DOM
  updateDOMCountryLabels();

  // Redraw active view
  if (window.router) {
    window.router.navigate(window.router.currentView);
  }
  showToast(`Switched context to ${countryCode === 'IN' ? 'India 🇮🇳' : 'Japan 🇯🇵'} successfully`, "success");
};

function updateDOMCountryLabels() {
  const country = window.getCurrentCountry();
  const config = countryConfigs[country];
  
  const channelSelect = document.getElementById("global-channel-select");
  if (channelSelect) {
    const store1Opt = channelSelect.querySelector('option[value="store1"]');
    const store2Opt = channelSelect.querySelector('option[value="store2"]');
    const store3Opt = channelSelect.querySelector('option[value="store3"]');
    if (store1Opt) store1Opt.textContent = config.stores.store1;
    if (store2Opt) store2Opt.textContent = config.stores.store2;
    if (store3Opt) store3Opt.textContent = config.stores.store3;
  }
  
  const modalCurrencyLabels = document.querySelectorAll('.modal-overlay label, .modal-overlay h4');
  modalCurrencyLabels.forEach(el => {
    if (country === 'JP') {
      el.innerHTML = el.innerHTML
        .replace(/₹ INR/g, '¥ JPY')
        .replace(/₹/g, '¥')
        .replace(/India GST Rate/g, 'Japan Tax Rate')
        .replace(/Mumbai Retail/g, 'Tokyo Retail')
        .replace(/Delhi Retail/g, 'Kanagawa Retail')
        .replace(/Bengaluru Retail/g, 'Chiba Retail')
        .replace(/Store 1 Mumbai/g, 'Store 1 Tokyo')
        .replace(/Store 2 Delhi/g, 'Store 2 Kanagawa')
        .replace(/Store 3 Bengaluru/g, 'Store 3 Chiba');
    } else {
      el.innerHTML = el.innerHTML
        .replace(/¥ JPY/g, '₹ INR')
        .replace(/¥/g, '₹')
        .replace(/Japan Tax Rate/g, 'India GST Rate')
        .replace(/Tokyo Retail/g, 'Mumbai Retail')
        .replace(/Kanagawa Retail/g, 'Delhi Retail')
        .replace(/Chiba Retail/g, 'Bengaluru Retail')
        .replace(/Store 1 Tokyo/g, 'Store 1 Mumbai')
        .replace(/Store 2 Kanagawa/g, 'Store 2 Delhi')
        .replace(/Store 3 Chiba/g, 'Store 3 Bengaluru');
    }
  });

  const pTaxSelect = document.getElementById("p-tax");
  if (pTaxSelect) {
    if (country === 'JP') {
      pTaxSelect.innerHTML = `
        <option value="8">8% (Reduced food/bev)</option>
        <option value="10">10% (Standard Tax)</option>
      `;
    } else {
      pTaxSelect.innerHTML = `
        <option value="5">5% (Reduced food/bev)</option>
        <option value="18">18% (Standard GST)</option>
      `;
    }
  }
}

// Global formatting helpers mapping dynamically
window.formatINR = function(value) {
  const country = window.getCurrentCountry();
  const config = countryConfigs[country];
  if (value === undefined || value === null || isNaN(value)) {
    value = 0;
  }
  const fractionDigits = config.currency === 'JPY' ? 0 : 2;
  return config.currencySymbol + new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
};

window.formatIndianDate = function(dateInput) {
  if (!dateInput) return "";
  const country = window.getCurrentCountry();
  const config = countryConfigs[country];
  let date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    if (typeof dateInput === 'string') {
      if (dateInput.includes('T')) {
        date = new Date(dateInput);
      } else if (dateInput.includes('-') && dateInput.length === 10) {
        const parts = dateInput.split('-');
        if (config.dateFormat === 'DD/MM/YYYY') {
          return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
        } else {
          return `${parts[0]}/${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}`;
        }
      } else {
        date = new Date(dateInput);
      }
    } else {
      date = new Date(dateInput);
    }
  }
  if (isNaN(date.getTime())) return String(dateInput);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  if (config.dateFormat === 'DD/MM/YYYY') {
    return `${dd}/${mm}/${yyyy}`;
  } else {
    return `${yyyy}/${mm}/${dd}`;
  }
};

window.formatIndianTime = function(dateInput) {
  if (!dateInput) return "";
  let date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    if (typeof dateInput === 'string' && dateInput.includes(':') && !dateInput.includes('T')) {
      const parts = dateInput.split(':');
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].substring(0, 2);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = String(hours).padStart(2, '0');
      return `${hoursStr}:${minutes} ${ampm}`;
    }
    date = new Date(dateInput);
  }
  if (isNaN(date.getTime())) return String(dateInput);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${hoursStr}:${minutes} ${ampm}`;
};

window.formatIndianDateTime = function(dateInput) {
  if (!dateInput) return "";
  let date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
  }
  if (isNaN(date.getTime())) return String(dateInput);
  
  const formattedDate = window.formatIndianDate(date);
  const formattedTime = window.formatIndianTime(date);
  return `${formattedDate} ${formattedTime}`;
};

// Exports to Global Namespace
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.checkRoleAccess = checkRoleAccess;
window.updateAlertsBadge = updateAlertsBadge;
window.getSystemAlerts = getSystemAlerts;
window.getCurrentStore = () => currentStore;
window.getCurrentChannel = () => currentStore;
window.getCurrentRole = () => currentRole;
