/**
 * KOKO Grocery ERP - Customer & Loyalty Ledger View Controller
 * Tracks retail buyer profiles, credit facilities, points ledger, and invoice logs.
 */

window.renderCustomers = function(container) {
  renderCustomerRegistry();

  function renderCustomerRegistry() {
    const list = db.getCustomers();

    let rows = "";
    list.forEach(c => {
      rows += `
        <tr>
          <td style="font-family:var(--font-mono); font-weight:700;">${c.id}</td>
          <td style="font-weight:600;">${c.name}</td>
          <td>${c.phone}</td>
          <td style="text-align:center; font-weight:700; color:var(--primary);">${c.loyaltyPoints.toLocaleString()} pts</td>
          <td style="text-align:right; font-family:var(--font-mono); ${c.creditBalance > 0 ? 'color:var(--danger); font-weight:700;' : ''}">
            ${window.formatINR(c.creditBalance || 0)}
          </td>
          <td style="text-align:right; font-family:var(--font-mono);">
            ${c.creditLimit > 0 ? `${window.formatINR(c.creditLimit)}` : '<span style="color:var(--text-muted);">B2C Account</span>'}
          </td>
          <td style="text-align:center;">
            <div style="display:flex; justify-content:center; gap:8px;">
              <button class="btn btn-secondary btn-sm btn-cust-history" data-id="${c.id}">History</button>
              <button class="btn btn-secondary btn-sm btn-cust-credit" data-id="${c.id}">Adjust Credit</button>
              <button class="btn btn-danger btn-sm btn-cust-delete" data-id="${c.id}">×</button>
            </div>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="animate-fade-in" style="display:flex; flex-direction:column; gap:20px;">
        
        <!-- Headers -->
        <div class="page-header">
          <div>
            <h3 style="font-family:var(--font-title); font-size:1.4rem;">Customer Database & Loyalty Ledger</h3>
            <p style="font-size:0.8rem; color:var(--text-muted);">Manage buyer profile records, monitor B2B corporate credit limits, and review points</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" id="btn-add-customer-trigger">
              + Register Customer Account
            </button>
          </div>
        </div>

        <!-- Customer Table -->
        <div class="glass-panel">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Customer/Business Name</th>
                  <th>Contact Phone</th>
                  <th style="text-align:center;">Accumulated Points</th>
                  <th style="text-align:right;">Outstanding Balances (₹)</th>
                  <th style="text-align:right;">Credit Limit (₹)</th>
                  <th style="text-align:center;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${list.length === 0 ? `<tr><td colspan="7" class="empty-state">No customers registered.</td></tr>` : rows}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    // Bind Add Customer
    document.getElementById("btn-add-customer-trigger").addEventListener("click", () => {
      if (!checkRoleAccess("manager")) return;
      openAddCustomerDialog();
    });

    // Bind actions
    container.querySelectorAll(".btn-cust-history").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        openCustomerHistory(id);
      });
    });

    container.querySelectorAll(".btn-cust-credit").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (!checkRoleAccess("manager")) return;
        const id = e.target.getAttribute("data-id");
        openCreditAdjustmentDialog(id);
      });
    });

    container.querySelectorAll(".btn-cust-delete").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (!checkRoleAccess("admin")) return;
        const id = e.target.getAttribute("data-id");
        deleteCustomer(id);
      });
    });
  }

  // Add Customer Account
  function openAddCustomerDialog() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.innerHTML = `
      <div class="modal-container glass-panel-lg" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title">Register Customer Account</h3>
          <button class="modal-close" id="btn-close-cust-add">&times;</button>
        </div>
        <div class="modal-body">
          <form id="cust-add-form">
            <div class="form-group">
              <label for="cust-add-id">Customer ID (Unique)</label>
              <input type="text" id="cust-add-id" class="form-control" placeholder="e.g. CUST-005" required>
            </div>
            <div class="form-group">
              <label for="cust-add-name">Customer/Business Name</label>
              <input type="text" id="cust-add-name" class="form-control" placeholder="e.g. Kyoto Imperial Hotel" required>
            </div>
            <div class="form-group">
              <label for="cust-add-phone">Contact Phone</label>
              <input type="text" id="cust-add-phone" class="form-control" placeholder="e.g. +91 98765 43210" required>
            </div>
            <div class="form-group">
              <label for="cust-add-limit">Credit Limit (₹ INR - 0 for B2C)</label>
              <input type="number" id="cust-add-limit" class="form-control" value="0" min="0">
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-cust-add">Cancel</button>
          <button class="btn btn-primary" id="btn-save-cust-add">Save Customer</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeActions = () => document.body.removeChild(overlay);
    document.getElementById("btn-close-cust-add").addEventListener("click", closeActions);
    document.getElementById("btn-cancel-cust-add").addEventListener("click", closeActions);

    document.getElementById("btn-save-cust-add").addEventListener("click", () => {
      const id = document.getElementById("cust-add-id").value.trim().toUpperCase();
      const name = document.getElementById("cust-add-name").value.trim();
      const phone = document.getElementById("cust-add-phone").value.trim();
      const limit = parseInt(document.getElementById("cust-add-limit").value, 10) || 0;

      if (!id || !name || !phone) {
        showToast("Please supply all required fields.", "warning");
        return;
      }

      const all = db.getCustomers();
      if (all.some(c => c.id === id)) {
        showToast("Customer ID already exists in system database.", "danger");
        return;
      }

      db.saveCustomer({
        id,
        name,
        phone,
        loyaltyPoints: 0,
        creditLimit: limit,
        creditBalance: 0
      });

      showToast(`Customer account ${name} successfully configured.`, "success");
      closeActions();
      renderCustomerRegistry();
    });
  }

  // Adjust Credits Limits & balances
  function openCreditAdjustmentDialog(id) {
    const list = db.getCustomers();
    const c = list.find(cust => cust.id === id);
    if (!c) return;

    openModal("credit-modal");
    document.getElementById("cr-cust-id").value = c.id;
    document.getElementById("cr-cust-name").value = c.name;
    document.getElementById("cr-cust-balance").value = window.formatINR(c.creditBalance || 0);
    document.getElementById("cr-cust-limit").value = c.creditLimit || 0;
    
    // Clear adjustment amount fields
    document.getElementById("cr-adjust-amount").value = "";
    document.getElementById("cr-adjust-desc").value = "";

    // Save action
    document.getElementById("btn-save-credit").onclick = (e) => {
      e.preventDefault();
      
      const newLimit = parseInt(document.getElementById("cr-cust-limit").value, 10);
      const adjustAmount = parseInt(document.getElementById("cr-adjust-amount").value, 10) || 0;
      const adjustDesc = document.getElementById("cr-adjust-desc").value.trim();

      if (isNaN(newLimit) || newLimit < 0) {
        showToast("Credit limit must be a positive number.", "warning");
        return;
      }

      // Check if they paid/charged credit balance
      if (adjustAmount !== 0) {
        if (!adjustDesc) {
          showToast("Adjustment note is required to log credit settlements.", "warning");
          return;
        }

        // Adjust outstanding balance: subtracting paid amounts
        c.creditBalance = Math.max(0, (c.creditBalance || 0) - adjustAmount);

        // Record general operation logs depending on sign
        if (adjustAmount > 0) { // Customer paid off debt -> Cash Inflow (offsets general operational outflow)
          db.addExpense({
            id: `INC-CRD-${Date.now()}`,
            date: "2026-07-07",
            category: "Credit Payment Recv",
            amount: -adjustAmount, // negative expense = cash inflow
            description: `Received ${window.formatINR(adjustAmount)} credit payment from ${c.name}. Note: ${adjustDesc}`
          });
        }
      }

      c.creditLimit = newLimit;
      db.saveCustomer(c);

      showToast(`Credit parameters updated for customer ${c.name}.`, "success");
      closeModal("credit-modal");
      renderCustomerRegistry();
    };
  }

  // Customer History list modal
  function openCustomerHistory(customerId) {
    const allSales = db.getSales();
    const custSales = allSales.filter(s => s.customerId === customerId);
    const customers = db.getCustomers();
    const c = customers.find(item => item.id === customerId) || {};

    let historyRows = "";
    custSales.forEach(s => {
      historyRows += `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding: 8px 0; font-size:0.85rem;">
          <div>
            <strong>${s.id}</strong> - ${window.formatIndianDate(s.date)}<br/>
            <span style="font-size:0.75rem; color:var(--text-muted);">Payment: ${s.paymentMethod.toUpperCase()} | Channel: ${s.channel.toUpperCase()}</span>
          </div>
          <div style="font-family:var(--font-mono); font-weight:700; text-align:right;">
            ${window.formatINR(s.total)}<br/>
            <span style="font-size:0.75rem; color:var(--primary);">+${s.pointsEarned} pts</span>
          </div>
        </div>
      `;
    });

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.innerHTML = `
      <div class="modal-container glass-panel-lg" style="max-width: 450px;">
        <div class="modal-header">
          <h3 class="modal-title">Sales History: ${c.name || customerId}</h3>
          <button class="modal-close" id="btn-close-hist-view">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 400px; overflow-y:auto;">
          ${custSales.length === 0 ? `
            <div class="empty-state">No transaction history recorded for this customer account.</div>
          ` : historyRows}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById("btn-close-hist-view").addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
  }

  // Delete Customer Account
  function deleteCustomer(id) {
    if (confirm(`Do you want to delete customer account ${id}?\nThis action is irreversible.`)) {
      const list = db.getCustomers();
      const filtered = list.filter(item => item.id !== id);
      db.write("customers", filtered);
      showToast(`Customer account ${id} deleted.`, "success");
      renderCustomerRegistry();
    }
  }
};
