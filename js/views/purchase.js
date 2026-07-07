/**
 * KOKO Grocery ERP - Purchase & Supplier Management View Controller
 * Coordinates Supplier profiles, Purchase Orders (PO), and Goods Receipt notes (GRN).
 */

window.renderPurchase = function(container) {
  let activeTab = "pos"; // 'pos' or 'suppliers'
  
  renderLayout();

  function renderLayout() {
    container.innerHTML = `
      <div class="animate-fade-in" style="display:flex; flex-direction:column; gap:20px;">
        
        <!-- View Headers -->
        <div class="page-header">
          <div>
            <h3 style="font-family:var(--font-title); font-size:1.4rem;">Procurement & Supplier Operations</h3>
            <p style="font-size:0.8rem; color:var(--text-muted);">Manage suppliers, write purchase orders, and record goods arrival</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" id="btn-create-po-trigger">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              New Purchase Order
            </button>
            <button class="btn btn-secondary" id="btn-add-supplier-trigger">
              + Register Supplier
            </button>
          </div>
        </div>

        <!-- Tab switches -->
        <div style="display:flex; gap:12px; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
          <button class="btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="tab-po">Purchase Orders Ledger</button>
          <button class="btn ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="tab-suppliers">Supplier Directory</button>
        </div>

        <!-- Render Content -->
        <div id="purchase-tab-content"></div>

      </div>
    `;

    // Bind tab controls
    document.getElementById("tab-po").addEventListener("click", () => {
      activeTab = "pos";
      renderLayout();
    });
    document.getElementById("tab-suppliers").addEventListener("click", () => {
      activeTab = "suppliers";
      renderLayout();
    });

    // Bind Add Supplier button
    document.getElementById("btn-add-supplier-trigger").addEventListener("click", () => {
      if (!checkRoleAccess("manager")) return;
      openAddSupplierDialog();
    });

    // Bind Create PO button
    document.getElementById("btn-create-po-trigger").addEventListener("click", () => {
      if (!checkRoleAccess("manager")) return;
      openCreatePODialog();
    });

    // Render active tab view
    if (activeTab === "pos") {
      renderPOTab();
    } else {
      renderSuppliersTab();
    }
  }

  // --- TAB 1: PURCHASE ORDERS ---
  function renderPOTab() {
    const poList = db.getPurchaseOrders();
    const suppliers = db.getSuppliers();
    const target = document.getElementById("purchase-tab-content");

    if (poList.length === 0) {
      target.innerHTML = `<div class="glass-panel empty-state">No Purchase Orders logged in system history.</div>`;
      return;
    }

    let rows = "";
    poList.forEach(po => {
      const supplierName = (suppliers.find(s => s.id === po.supplierId) || {}).name || "Unknown Vendor";
      const statusBadge = po.status === "Received" ? "badge-success" : "badge-warning";
      
      rows += `
        <tr>
          <td style="font-family:var(--font-mono); font-weight:700;">${po.id}</td>
          <td>${supplierName}</td>
          <td>${po.date}</td>
          <td style="font-family:var(--font-mono); font-weight:700; text-align:right;">${window.formatINR(po.total)}</td>
          <td style="text-align:center;"><span class="badge ${statusBadge}">${po.status}</span></td>
          <td style="text-align:center;">
            <div style="display:flex; gap:8px; justify-content:center;">
              <button class="btn btn-secondary btn-sm btn-view-po" data-id="${po.id}">View Lines</button>
              ${po.status === "Ordered" ? `<button class="btn btn-success btn-sm btn-grn" data-id="${po.id}">Approve GRN</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    target.innerHTML = `
      <div class="glass-panel">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Supplier Vendor</th>
                <th>Order Date</th>
                <th style="text-align:right;">Total Order Cost</th>
                <th style="text-align:center;">Status</th>
                <th style="text-align:center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Bind action events
    target.querySelectorAll(".btn-view-po").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        viewPODetails(id);
      });
    });

    target.querySelectorAll(".btn-grn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (!checkRoleAccess("manager")) return;
        const id = e.target.getAttribute("data-id");
        approveGoodsReceipt(id);
      });
    });
  }

  // --- TAB 2: SUPPLIERS ---
  function renderSuppliersTab() {
    const list = db.getSuppliers();
    const target = document.getElementById("purchase-tab-content");

    if (list.length === 0) {
      target.innerHTML = `<div class="glass-panel empty-state">No suppliers registered in database.</div>`;
      return;
    }

    let rows = "";
    list.forEach(s => {
      rows += `
        <tr>
          <td style="font-family:var(--font-mono); font-weight:700;">${s.id}</td>
          <td style="font-weight:600;">${s.name}</td>
          <td>${s.phone || '-'}</td>
          <td style="font-family:var(--font-mono); font-weight:700; text-align:right; ${s.balance > 0 ? 'color:var(--danger);' : ''}">${window.formatINR(s.balance)}</td>
          <td style="text-align:center;">
            <div style="display:flex; justify-content:center; gap:8px;">
              <button class="btn btn-secondary btn-sm btn-supplier-edit" data-id="${s.id}">Edit Info</button>
              ${s.balance > 0 ? `<button class="btn btn-primary btn-sm btn-supplier-pay" data-id="${s.id}">Record Payment</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    target.innerHTML = `
      <div class="glass-panel">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Supplier ID</th>
                <th>Supplier Name</th>
                <th>Phone Number</th>
                <th style="text-align:right;">Outstanding Balances (₹)</th>
                <th style="text-align:center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Bind supplier events
    target.querySelectorAll(".btn-supplier-edit").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (!checkRoleAccess("manager")) return;
        const id = e.target.getAttribute("data-id");
        openEditSupplierDialog(id);
      });
    });

    target.querySelectorAll(".btn-supplier-pay").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (!checkRoleAccess("manager")) return;
        const id = e.target.getAttribute("data-id");
        openSupplierPaymentDialog(id);
      });
    });
  }

  // --- ACTIONS & MODAL LOGICS ---

  // GRN Action
  function approveGoodsReceipt(poId) {
    if (confirm(`Do you want to confirm Goods Received Note (GRN) for Order ${poId}?\nThis action adds items to inventory warehouse and increases supplier balance.`)) {
      const res = db.receivePurchaseOrder(poId);
      if (res) {
        showToast(`Goods Receipt confirmed for PO: ${poId}`, "success");
        renderLayout();
        updateAlertsBadge();
      }
    }
  }

  // View PO details
  function viewPODetails(poId) {
    const poList = db.getPurchaseOrders();
    const po = poList.find(p => p.id === poId);
    if (!po) return;

    const suppliers = db.getSuppliers();
    const supName = (suppliers.find(s => s.id === po.supplierId) || {}).name || "Unknown Vendor";
    const products = db.getProducts();

    let linesHtml = "";
    po.items.forEach(item => {
      const p = products.find(prod => prod.sku === item.sku);
      const name = p ? p.name : item.sku;
      linesHtml += `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding: 8px 0; font-size:0.85rem;">
          <div>
            <strong>${item.sku}</strong> - ${name}
          </div>
          <div style="font-family:var(--font-mono);">
            ${item.quantity} units @ ${window.formatINR(item.unitCost)} = <strong>${window.formatINR(item.quantity * item.unitCost)}</strong>
          </div>
        </div>
      `;
    });

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.innerHTML = `
      <div class="modal-container glass-panel-lg" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">Purchase Order Details: ${po.id}</h3>
          <button class="modal-close" id="btn-close-po-view">&times;</button>
        </div>
        <div class="modal-body">
          <div style="font-size:0.85rem; margin-bottom:12px; display:flex; flex-direction:column; gap:4px;">
            <div><strong>Supplier:</strong> ${supName}</div>
            <div><strong>Order Date:</strong> ${po.date}</div>
            <div><strong>Status:</strong> <span class="badge ${po.status === 'Received' ? 'badge-success' : 'badge-warning'}">${po.status}</span></div>
          </div>
          <hr style="border-color: var(--border-color); margin: 10px 0;">
          <h4 style="margin-bottom:8px;">Items Ordered:</h4>
          <div>${linesHtml}</div>
          <div style="display:flex; justify-content:space-between; margin-top: 16px; font-size: 1.1rem; font-weight:800;">
            <span>Total Value:</span>
            <span style="color:var(--primary); font-family:var(--font-mono);">${window.formatINR(po.total)}</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById("btn-close-po-view").addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
  }

  // Create PO Dialog
  function openCreatePODialog() {
    const modal = document.getElementById("po-modal");
    document.getElementById("po-modal-title").textContent = "Generate Purchase Order";
    document.getElementById("po-form").reset();
    
    // Auto-generate PO ID
    const poList = db.getPurchaseOrders();
    const nextId = "PO-" + String(poList.length + 1).padStart(4, "0");
    document.getElementById("po-id").value = nextId;

    // Load supplier selector
    const supSelect = document.getElementById("po-supplier");
    supSelect.innerHTML = "";
    const suppliers = db.getSuppliers();
    suppliers.forEach(s => {
      supSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    const linesContainer = document.getElementById("po-lines-container");
    linesContainer.innerHTML = "";

    // Add first line
    addPOLineItem();

    document.getElementById("btn-add-po-line").onclick = addPOLineItem;

    document.getElementById("btn-save-po").onclick = (e) => {
      e.preventDefault();
      saveNewPurchaseOrder();
    };

    openModal("po-modal");
  }

  function addPOLineItem() {
    const container = document.getElementById("po-lines-container");
    const count = container.children.length;
    const products = db.getProducts().filter(p => !p.sku.startsWith("MOCK")); // only seed/actual items for neat drops

    const line = document.createElement("div");
    line.className = "form-row po-line-row";
    line.style.alignItems = "flex-end";
    line.innerHTML = `
      <div class="form-group" style="flex-grow:3;">
        <label>Select SKU Product</label>
        <select class="po-line-sku">
          ${products.map(p => `<option value="${p.sku}">${p.sku} - ${p.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="flex-grow:1;">
        <label>Quantity</label>
        <input type="number" class="form-control po-line-qty" min="1" value="10" required>
      </div>
      <div class="form-group" style="flex-grow:1;">
        <label>Cost per unit (₹)</label>
        <input type="number" class="form-control" class="po-line-cost" min="1" value="100" required>
      </div>
      <div class="form-group">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()" style="margin-bottom:4px;">×</button>
      </div>
    `;
    container.appendChild(line);
  }

  function saveNewPurchaseOrder() {
    const poId = document.getElementById("po-id").value;
    const supId = document.getElementById("po-supplier").value;
    const date = "2026-07-07"; // metadata relative today

    const lineRows = document.querySelectorAll(".po-line-row");
    if (lineRows.length === 0) {
      showToast("Purchase Order must contain at least 1 item line.", "warning");
      return;
    }

    const items = [];
    let grandTotal = 0;

    for (let row of lineRows) {
      const sku = row.querySelector(".po-line-sku").value;
      const qty = parseInt(row.querySelector(".po-line-qty").value, 10);
      const cost = parseInt(row.querySelector(".po-line-cost").value, 10);

      if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost <= 0) {
        showToast("Please provide valid quantity and unit cost bounds.", "warning");
        return;
      }

      items.push({ sku, quantity: qty, unitCost: cost });
      grandTotal += qty * cost;
    }

    const newPO = {
      id: poId,
      supplierId: supId,
      date,
      status: "Ordered",
      items,
      total: grandTotal
    };

    db.savePurchaseOrder(newPO);
    closeModal("po-modal");
    showToast(`Purchase Order ${poId} issued to vendor.`, "success");
    renderLayout();
  }

  // Register Supplier Dialog
  function openAddSupplierDialog() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.innerHTML = `
      <div class="modal-container glass-panel-lg" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title">Register Supplier</h3>
          <button class="modal-close" id="btn-close-sup-add">&times;</button>
        </div>
        <div class="modal-body">
          <form id="sup-add-form">
            <div class="form-group">
              <label for="sup-add-id">Supplier ID (Unique)</label>
              <input type="text" id="sup-add-id" class="form-control" placeholder="e.g. SUP-004" required>
            </div>
            <div class="form-group">
              <label for="sup-add-name">Company Name</label>
              <input type="text" id="sup-add-name" class="form-control" placeholder="e.g. Yokohama Sea Foods" required>
            </div>
            <div class="form-group">
              <label for="sup-add-phone">Contact Phone</label>
              <input type="text" id="sup-add-phone" class="form-control" placeholder="e.g. +91 98765 43210">
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-sup-add">Cancel</button>
          <button class="btn btn-primary" id="btn-save-sup-add">Save Supplier</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeActions = () => document.body.removeChild(overlay);
    document.getElementById("btn-close-sup-add").addEventListener("click", closeActions);
    document.getElementById("btn-cancel-sup-add").addEventListener("click", closeActions);

    document.getElementById("btn-save-sup-add").addEventListener("click", () => {
      const id = document.getElementById("sup-add-id").value.trim().toUpperCase();
      const name = document.getElementById("sup-add-name").value.trim();
      const phone = document.getElementById("sup-add-phone").value.trim();

      if (!id || !name) {
        showToast("ID and Company Name are required.", "warning");
        return;
      }

      const all = db.getSuppliers();
      if (all.some(s => s.id === id)) {
        showToast("Supplier ID already exists.", "danger");
        return;
      }

      db.saveSupplier({ id, name, phone, balance: 0 });
      showToast(`Supplier ${name} registered successfully.`, "success");
      closeActions();
      renderLayout();
    });
  }

  // Edit Supplier Dialog
  function openEditSupplierDialog(id) {
    const list = db.getSuppliers();
    const sup = list.find(s => s.id === id);
    if (!sup) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.innerHTML = `
      <div class="modal-container glass-panel-lg" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title">Edit Supplier Info</h3>
          <button class="modal-close" id="btn-close-sup-edit">&times;</button>
        </div>
        <div class="modal-body">
          <form>
            <div class="form-group">
              <label>Supplier ID</label>
              <input type="text" class="form-control" value="${sup.id}" readonly>
            </div>
            <div class="form-group">
              <label for="sup-edit-name">Company Name</label>
              <input type="text" id="sup-edit-name" class="form-control" value="${sup.name}" required>
            </div>
            <div class="form-group">
              <label for="sup-edit-phone">Contact Phone</label>
              <input type="text" id="sup-edit-phone" class="form-control" value="${sup.phone || ''}">
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-sup-edit">Cancel</button>
          <button class="btn btn-primary" id="btn-save-sup-edit">Update Supplier</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeActions = () => document.body.removeChild(overlay);
    document.getElementById("btn-close-sup-edit").addEventListener("click", closeActions);
    document.getElementById("btn-cancel-sup-edit").addEventListener("click", closeActions);

    document.getElementById("btn-save-sup-edit").addEventListener("click", () => {
      const name = document.getElementById("sup-edit-name").value.trim();
      const phone = document.getElementById("sup-edit-phone").value.trim();

      if (!name) {
        showToast("Company Name is required.", "warning");
        return;
      }

      sup.name = name;
      sup.phone = phone;
      db.saveSupplier(sup);
      showToast(`Supplier ${name} updated.`, "success");
      closeActions();
      renderLayout();
    });
  }

  // Pay Supplier Outstanding Balance Dialog
  function openSupplierPaymentDialog(id) {
    const list = db.getSuppliers();
    const sup = list.find(s => s.id === id);
    if (!sup) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.innerHTML = `
      <div class="modal-container glass-panel-lg" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title">Supplier Outstanding Settlement</h3>
          <button class="modal-close" id="btn-close-pay">&times;</button>
        </div>
        <div class="modal-body">
          <div style="font-size:0.9rem; margin-bottom:12px;">
            <strong>Supplier:</strong> ${sup.name}<br/>
            <strong>Outstanding Debt:</strong> ${window.formatINR(sup.balance)}
          </div>
          <div class="form-group">
            <label for="pay-amount">Payment Amount (₹)</label>
            <input type="number" id="pay-amount" class="form-control" min="1" max="${sup.balance}" value="${sup.balance}" required>
          </div>
          <div class="form-group">
            <label for="pay-desc">Payment Reference</label>
            <input type="text" id="pay-desc" class="form-control" placeholder="e.g. Bank Transfer Ref: BT-99120" required>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-pay">Cancel</button>
          <button class="btn btn-primary" id="btn-save-pay">Record Payment</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeActions = () => document.body.removeChild(overlay);
    document.getElementById("btn-close-pay").addEventListener("click", closeActions);
    document.getElementById("btn-cancel-pay").addEventListener("click", closeActions);

    document.getElementById("btn-save-pay").addEventListener("click", () => {
      const amount = parseInt(document.getElementById("pay-amount").value, 10);
      const desc = document.getElementById("pay-desc").value.trim();

      if (isNaN(amount) || amount <= 0 || amount > sup.balance) {
        showToast("Please specify a valid payment amount between 1 and outstanding balance.", "warning");
        return;
      }
      if (!desc) {
        showToast("Payment reference is required.", "warning");
        return;
      }

      sup.balance = sup.balance - amount;
      db.saveSupplier(sup);

      // Record this cash outflow as a Procurement Expense
      db.addExpense({
        id: `EXP-SUP-${Date.now()}`,
        date: "2026-07-07",
        category: "Supplier Payment",
        amount: amount,
        description: `Cash payment of ${window.formatINR(amount)} to ${sup.name}. Ref: ${desc}`
      });

      showToast(`Recorded payment of ${window.formatINR(amount)} to ${sup.name}.`, "success");
      closeActions();
      renderLayout();
    });
  }
};
