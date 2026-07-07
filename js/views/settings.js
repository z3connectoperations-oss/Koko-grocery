/**
 * KOKO Grocery ERP - System Settings View Controller
 * Manages tax parameters, notification message presets, and diagnostic options.
 */

window.renderSettings = function(container) {
  renderSettingsPage();

  function renderSettingsPage() {
    const settings = db.getSettings();
    const curRole = window.getCurrentRole();
    const country = window.getCurrentCountry();
    const isIndia = (country === "IN");
    const currencySym = isIndia ? "₹" : "¥";
    const store1Label = isIndia ? "Mumbai Retail (Store 1)" : "Tokyo Retail (Store 1)";
    const store2Label = isIndia ? "Delhi Retail (Store 2)" : "Kanagawa Retail (Store 2)";
    const store3Label = isIndia ? "Bengaluru Retail (Store 3)" : "Chiba Retail (Store 3)";

    container.innerHTML = `
      <div class="animate-fade-in" style="max-width: 600px; display:flex; flex-direction:column; gap:20px;">
        
        <!-- Headers -->
        <div class="page-header" style="margin-bottom:0;">
          <div>
            <h3 style="font-family:var(--font-title); font-size:1.4rem;">ERP Settings Panel</h3>
            <p style="font-size:0.8rem; color:var(--text-muted);">Adjust tax indices, message text templates, and manage system operations</p>
          </div>
        </div>

        <div class="glass-panel" style="padding: 24px;">
          <form id="settings-form">
            
            <h4 style="margin-bottom: 12px; font-family:var(--font-title); border-bottom:1px solid var(--border-color); padding-bottom:6px;">Tax Calculations</h4>
            <div class="form-row">
              <div class="form-group">
                <label for="set-tax-standard">${isIndia ? 'India Standard GST Rate' : 'Japan Standard Tax Rate'} (%)</label>
                <input type="number" id="set-tax-standard" class="form-control" value="${settings.taxStandard}" min="0" max="100">
              </div>
              <div class="form-group">
                <label for="set-tax-reduced">${isIndia ? 'India Reduced GST Rate' : 'Japan Reduced Tax Rate'} (%)</label>
                <input type="number" id="set-tax-reduced" class="form-control" value="${settings.taxReduced}" min="0" max="100">
              </div>
            </div>

            <h4 style="margin-top: 20px; margin-bottom: 12px; font-family:var(--font-title); border-bottom:1px solid var(--border-color); padding-bottom:6px;">Store Configuration</h4>
            <div class="form-row">
              <div class="form-group">
                <label for="set-active-store">Active Default Store Location</label>
                <select id="set-active-store">
                  <option value="store1" ${settings.activeStore === 'store1' ? 'selected' : ''}>${store1Label}</option>
                  <option value="store2" ${settings.activeStore === 'store2' ? 'selected' : ''}>${store2Label}</option>
                  <option value="store3" ${settings.activeStore === 'store3' ? 'selected' : ''}>${store3Label}</option>
                  <option value="warehouse" ${settings.activeStore === 'warehouse' ? 'selected' : ''}>Main Warehouse</option>
                </select>
              </div>
              <div class="form-group">
                <label for="set-loyalty-ratio">Loyalty Accrual Rate (${currencySym} spent per 1 pt)</label>
                <input type="number" id="set-loyalty-ratio" class="form-control" value="${settings.loyaltyRatio || 100}" min="10">
              </div>
            </div>

            <h4 style="margin-top: 20px; margin-bottom: 12px; font-family:var(--font-title); border-bottom:1px solid var(--border-color); padding-bottom:6px;">WhatsApp Notification Presets</h4>
            <div class="form-group">
              <label for="set-wa-template">Invoice Notification Text Message Template</label>
              <textarea id="set-wa-template" rows="4" class="form-control" style="font-family:var(--font-mono); font-size:0.8rem;"></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; margin-top:20px;">
              <button class="btn btn-primary" id="btn-save-settings">Save Configurations</button>
            </div>

          </form>
        </div>

        <!-- Administrative Actions -->
        <div class="glass-panel" style="padding: 24px; border: 1px solid rgba(239, 68, 68, 0.2); background-color: rgba(239, 68, 68, 0.02);">
          <h4 style="margin-bottom: 8px; color: var(--danger-hover); font-family:var(--font-title);">Danger Zone</h4>
          <p style="font-size:0.8rem; color: var(--text-muted); margin-bottom: 16px;">This clearing action wipes out all localized logs, shipments, credit profiles, and product pricing schemas, reloading default seeds.</p>
          <button class="btn btn-danger" id="btn-clear-db" style="width:100%;">
            FACTORY RESET DATABASE
          </button>
        </div>

      </div>
    `;

    // Fill WhatsApp template
    const defaultTemplate = 
      `*KOKO GROCERY ERP INVOICE ACK*\n\n` +
      `Invoice ID: {invoice_id}\n` +
      `Date: {date}\n` +
      `Grand Total: {total_inr}\n\n` +
      `Thank you for your purchase! {points_info}`;
    
    document.getElementById("set-wa-template").value = localStorage.getItem("koko_erp_wa_template") || defaultTemplate;

    // Save configurations click
    document.getElementById("btn-save-settings").addEventListener("click", (e) => {
      e.preventDefault();
      if (!checkRoleAccess("manager")) return;

      const std = parseInt(document.getElementById("set-tax-standard").value, 10);
      const red = parseInt(document.getElementById("set-tax-reduced").value, 10);
      const store = document.getElementById("set-active-store").value;
      const ratio = parseInt(document.getElementById("set-loyalty-ratio").value, 10);
      const waTemp = document.getElementById("set-wa-template").value.trim();

      if (isNaN(std) || isNaN(red) || isNaN(ratio)) {
        showToast("Please provide valid number parameters.", "warning");
        return;
      }

      db.saveSettings({
        taxStandard: std,
        taxReduced: red,
        activeStore: store,
        loyaltyRatio: ratio
      });

      localStorage.setItem("koko_erp_wa_template", waTemp);
      showToast("ERP system settings saved.", "success");
      
      // Update global context variable
      if (window.router) {
        // Sync active UI channels selector
        document.getElementById("global-channel-select").value = store;
        window.router.navigate(window.router.currentView);
      }
    });

    // Wipes DB
    document.getElementById("btn-clear-db").addEventListener("click", () => {
      if (!checkRoleAccess("admin")) return;

      if (confirm("Are you absolutely sure you want to perform a factory reset?\nAll manual edits will be deleted.")) {
        localStorage.clear();
        showToast("Database cleared! Reloading application...", "success");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    });
  }
};
