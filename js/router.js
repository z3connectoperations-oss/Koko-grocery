/**
 * KOKO Grocery ERP - Client-Side Router
 * Dynamically switches views without reloading the page, managing view states and title headings.
 */

class Router {
  constructor() {
    this.routes = {};
    this.currentView = null;
    this.viewport = document.getElementById("main-viewport");
    this.titleEl = document.getElementById("view-title");
    
    this.initEvents();
  }

  // Register a route view handler
  register(viewName, renderFunc) {
    this.routes[viewName] = renderFunc;
  }

  // Navigate to a registered view
  navigate(viewName) {
    if (!this.routes[viewName]) {
      console.warn(`View route '${viewName}' is not registered. Defaulting to dashboard.`);
      viewName = "dashboard";
    }

    // Automatically close mobile sidebar on navigation
    const sidebar = document.getElementById("sidebar");
    if (sidebar && sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
    }

    // Toggle active sidebar states
    document.querySelectorAll(".menu-item").forEach(el => {
      if (el.getAttribute("data-view") === viewName) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });

    // Update Top Breadcrumb
    const displayTitles = {
      dashboard: "Executive Dashboard",
      inventory: "Inventory & SKU Management",
      pos: "POS Sales billing Terminal",
      purchase: "Purchase Management & Suppliers",
      logistics: "Koko Import Landed Cost Tracker",
      pl: "Profit & Loss Ledger",
      reports: "Reports & GST/Tax Audit",
      customers: "Customer Loyalty Ledger",
      employees: "Employee Accounts & Attendance",
      settings: "ERP System Settings"
    };
    this.titleEl.textContent = displayTitles[viewName] || "ERP System";

    // Call view renderer
    this.currentView = viewName;
    this.viewport.innerHTML = ""; // Clear active viewport
    
    // Trigger loader state briefly for rich aesthetics
    const loader = this.createLoader();
    this.viewport.appendChild(loader);

    setTimeout(() => {
      if (this.viewport.contains(loader)) {
        this.viewport.removeChild(loader);
      }
      // Render view content
      this.routes[viewName](this.viewport);
    }, 150);
  }

  createLoader() {
    const el = document.createElement("div");
    el.className = "glass-panel";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.padding = "40px";
    el.style.height = "100%";
    el.style.minHeight = "300px";
    
    el.innerHTML = `
      <img src="assets/logo.png" style="width: 55px; height: 55px; object-fit: contain; margin-bottom: 12px; animation: pulse 2s infinite;" alt="Koko Logo">
      <div style="border: 4px solid var(--border-color); border-top: 4px solid var(--primary); border-radius: 50%; width: 32px; height: 32px; animation: spin 1s linear infinite; margin-bottom:12px;"></div>
      <div style="font-weight: 600; color: var(--text-secondary); font-size: 0.9rem;">Loading ERP resources...</div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 0.6; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0.6; transform: scale(0.95); } }
      </style>
    `;
    return el;
  }

  initEvents() {
    // Bind sidebar clicks
    document.querySelectorAll(".menu-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const view = item.getAttribute("data-view");
        this.navigate(view);
      });
    });

    // Auto load first view
    window.addEventListener("DOMContentLoaded", () => {
      this.navigate("dashboard");
    });
  }
}

// Global router reference
window.router = null;
