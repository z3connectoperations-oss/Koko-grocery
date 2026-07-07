/**
 * KOKO Grocery ERP - KOKO Imports Logistics & Landed Cost View Controller
 * Tracks global cargo shipments, computes landed overheads, and maps warehouse updates.
 */

window.renderLogistics = function(container) {
  renderLogisticsDashboard();

  function renderLogisticsDashboard() {
    const shipments = db.getShipments();
    const products = db.getProducts().filter(p => !p.sku.startsWith("MOCK")); // only real SKUs

    let shipmentsRows = "";
    shipments.forEach(s => {
      const isDelivered = s.status === "Delivered";
      const statusBadge = isDelivered ? "badge-success" : "badge-warning";
      
      shipmentsRows += `
        <tr>
          <td style="font-family:var(--font-mono); font-weight:700;">${s.id}</td>
          <td style="font-weight:600;">${s.name}</td>
          <td>${s.origin}</td>
          <td style="text-align:center;"><span class="badge ${statusBadge}">${s.status}</span></td>
          <td style="text-align:right; font-family:var(--font-mono);">${s.items.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()} bags</td>
          <td style="text-align:right; font-family:var(--font-mono); font-weight:600;">${window.formatINR(s.landedCostPerUnit || 0)}</td>
          <td style="text-align:right; font-family:var(--font-mono); font-weight:700; color:var(--primary);">${window.formatINR(s.landedCostTotal)}</td>
          <td style="text-align:center;">
            <div style="display:flex; justify-content:center; gap:8px;">
              <button class="btn btn-secondary btn-sm btn-sh-view" data-id="${s.id}">Spreadsheet</button>
              ${!isDelivered ? `<button class="btn btn-success btn-sm btn-sh-receive" data-id="${s.id}">Receive in WH</button>` : ''}
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
            <h3 style="font-family:var(--font-title); font-size:1.4rem;">Import Logistics Tracker</h3>
            <p style="font-size:0.8rem; color:var(--text-muted);">Domestic & Import logistics pipeline, customs duty clearings, and landed cost recalculations</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" id="btn-create-shipment-trigger">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Log Import Cargo
            </button>
          </div>
        </div>

        <!-- Shipments Table Grid -->
        <div class="glass-panel">
          <div class="panel-header">
            <h4 class="panel-title">Active and Historical Cargo Shipments</h4>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Shipment ID</th>
                  <th>Cargo Description</th>
                  <th>Origin Port</th>
                  <th style="text-align:center;">Logistics Status</th>
                  <th style="text-align:right;">Cargo Volume</th>
                  <th style="text-align:right;">Unit Landed Cost (₹)</th>
                  <th style="text-align:right;">Total Landed Cost (₹)</th>
                  <th style="text-align:center;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${shipments.length === 0 ? `
                  <tr><td colspan="8" class="empty-state">No cargo shipments recorded.</td></tr>
                ` : shipmentsRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Informative Landed Cost Formula Card -->
        <div style="background-color: var(--primary-light); color: var(--primary); padding: 16px; border-radius: var(--border-radius-md); font-size:0.85rem; border: 1px solid rgba(79, 70, 229, 0.2);">
          <strong>Landed Cost Formula:</strong> Landed Cost = Base Product Invoice Cost (Quantity × Unit Cost) + Customs Duty Clearance Fees + ocean freight/logistics charges + repackaging overheads.
          The Unit Landed Cost is then calculated as: <code>Total Landed Cost / Quantity</code>, which sets the baseline for the division's Profit & Loss calculations.
        </div>

      </div>
    `;

    // Bind create trigger
    document.getElementById("btn-create-shipment-trigger").addEventListener("click", () => {
      if (!checkRoleAccess("manager")) return;
      openCreateShipmentDialog();
    });

    // Bind action buttons
    container.querySelectorAll(".btn-sh-view").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        openShipmentSpreadsheet(id);
      });
    });

    container.querySelectorAll(".btn-sh-receive").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (!checkRoleAccess("manager")) return;
        const id = e.target.getAttribute("data-id");
        receiveImportShipmentInWH(id);
      });
    });
  }

  // Confirm Cargo Customs Clearance and Warehouse ingestion
  function receiveImportShipmentInWH(shipmentId) {
    const list = db.getShipments();
    const s = list.find(item => item.id === shipmentId);
    if (s && s.status !== "Delivered") {
      if (confirm(`Authorize customs clearance for ${s.name}?\nThis adds cargo stock directly to main warehouse and updates product import cost baseline.`)) {
        s.status = "Delivered";
        db.saveShipment(s);
        showToast(`Cargo shipment ${shipmentId} received into Main Warehouse inventory.`, "success");
        renderLogisticsDashboard();
        updateAlertsBadge();
      }
    }
  }

  // Create Shipment Dialog
  function openCreateShipmentDialog() {
    const modal = document.getElementById("shipment-modal");
    document.getElementById("shipment-modal-title").textContent = "Log Logistics & Landed Cost Cargo";
    document.getElementById("shipment-form").reset();

    // Auto generate shipment ID
    const shipments = db.getShipments();
    const nextId = "SH-" + String(shipments.length + 1).padStart(3, "0");
    document.getElementById("sh-id").value = nextId;

    // Load products select dropdown
    const skuSelect = document.getElementById("sh-sku-select");
    skuSelect.innerHTML = "";
    const products = db.getProducts().filter(p => !p.sku.startsWith("MOCK"));
    products.forEach(p => {
      skuSelect.innerHTML += `<option value="${p.sku}">${p.sku} - ${p.name}</option>`;
    });

    // Reset Spreadsheet displays
    document.getElementById("sh-calc-subtotal").textContent = "₹0";
    document.getElementById("sh-calc-overhead").textContent = "₹0";
    document.getElementById("sh-calc-landedtotal").textContent = "₹0";
    document.getElementById("sh-calc-landedunit").textContent = "₹0";

    // Bind real-time recalculations
    const recomputeSpreadsheet = () => {
      const qty = Math.max(0, parseInt(document.getElementById("sh-qty").value, 10) || 0);
      const unitCost = Math.max(0, parseInt(document.getElementById("sh-unitcost").value, 10) || 0);
      const clearance = Math.max(0, parseInt(document.getElementById("sh-clearance").value, 10) || 0);
      const logistics = Math.max(0, parseInt(document.getElementById("sh-logistics").value, 10) || 0);
      const packaging = Math.max(0, parseInt(document.getElementById("sh-packaging").value, 10) || 0);

      const baseSubtotal = qty * unitCost;
      const overhead = clearance + logistics + packaging;
      const totalLanded = baseSubtotal + overhead;
      const landedPerUnit = qty > 0 ? Math.round(totalLanded / qty) : 0;

      document.getElementById("sh-calc-subtotal").textContent = window.formatINR(baseSubtotal);
      document.getElementById("sh-calc-overhead").textContent = window.formatINR(overhead);
      document.getElementById("sh-calc-landedtotal").textContent = window.formatINR(totalLanded);
      document.getElementById("sh-calc-landedunit").textContent = window.formatINR(landedPerUnit);
    };

    const inputs = ["sh-qty", "sh-unitcost", "sh-clearance", "sh-logistics", "sh-packaging"];
    inputs.forEach(id => {
      document.getElementById(id).addEventListener("input", recomputeSpreadsheet);
    });

    // Save Button
    document.getElementById("btn-save-shipment").onclick = (e) => {
      e.preventDefault();
      saveNewShipment(nextId);
    };

    openModal("shipment-modal");
  }

  function saveNewShipment(nextId) {
    const name = document.getElementById("sh-name").value.trim();
    const origin = document.getElementById("sh-origin").value.trim();
    const sku = document.getElementById("sh-sku-select").value;
    const qty = parseInt(document.getElementById("sh-qty").value, 10);
    const unitCost = parseInt(document.getElementById("sh-unitcost").value, 10);
    const clearance = parseInt(document.getElementById("sh-clearance").value, 10);
    const logistics = parseInt(document.getElementById("sh-logistics").value, 10);
    const packaging = parseInt(document.getElementById("sh-packaging").value, 10);

    if (!name || !origin || isNaN(qty) || qty <= 0 || isNaN(unitCost) || unitCost <= 0) {
      showToast("Please provide valid product details and cargo descriptions.", "warning");
      return;
    }

    const baseSubtotal = qty * unitCost;
    const overhead = clearance + logistics + packaging;
    const totalLanded = baseSubtotal + overhead;
    const landedPerUnit = Math.round(totalLanded / qty);

    const newShipment = {
      id: nextId,
      name,
      origin,
      status: "In Transit", // starts in transit, Received changes to Delivered
      items: [{ sku, quantity: qty, unitCost }],
      clearanceCost: clearance,
      logisticsCost: logistics,
      packagingCost: packaging,
      landedCostTotal: totalLanded,
      landedCostPerUnit: landedPerUnit
    };

    db.saveShipment(newShipment);
    
    // Add overheads to general expenses ledger automatically
    if (overhead > 0) {
      db.addExpense({
        id: `EXP-LOG-${Date.now()}`,
        date: "2026-07-07",
        category: "Logistics Overhead",
        amount: overhead,
        description: `Customs/freight fees for Import Shipment ${nextId}`
      });
    }

    closeModal("shipment-modal");
    showToast(`Cargo Cargo ${nextId} logged in shipping ledger (In Transit).`, "success");
    renderLogisticsDashboard();
  }

  // Open read-only view spreadsheet of past shipments
  function openShipmentSpreadsheet(id) {
    const list = db.getShipments();
    const s = list.find(item => item.id === id);
    if (!s) return;

    const products = db.getProducts();
    const item = s.items[0] || {};
    const pName = (products.find(p => p.sku === item.sku) || {}).name || item.sku;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.innerHTML = `
      <div class="modal-container glass-panel-lg" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">Shipment Log: ${s.id}</h3>
          <button class="modal-close" id="btn-close-log-view">&times;</button>
        </div>
        <div class="modal-body" style="font-size:0.875rem;">
          <div style="margin-bottom:12px; display:flex; flex-direction:column; gap:4px;">
            <div><strong>Cargo:</strong> ${s.name}</div>
            <div><strong>Origin Port:</strong> ${s.origin}</div>
            <div><strong>Shipping Status:</strong> <span class="badge ${s.status === 'Delivered' ? 'badge-success' : 'badge-warning'}">${s.status}</span></div>
          </div>
          
          <table class="data-table" style="font-size:0.8rem; margin-top:8px;">
            <thead>
              <tr style="background-color:var(--bg-primary);">
                <th>Expense Head</th>
                <th style="text-align:right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Product Base Invoice (x${item.quantity || 0})</td>
                <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR((item.quantity || 0) * (item.unitCost || 0))}</td>
              </tr>
              <tr>
                <td>India Customs Clearance Duty</td>
                <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(s.clearanceCost)}</td>
              </tr>
              <tr>
                <td>Ocean Freight & Logistics Logistics</td>
                <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(s.logisticsCost)}</td>
              </tr>
              <tr>
                <td>Repackaging/Processing Overheads</td>
                <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(s.packagingCost)}</td>
              </tr>
              <tr style="font-weight:700; border-top: 2px solid var(--border-color);">
                <td>TOTAL LANDED CARGO COST</td>
                <td style="text-align:right; font-family:var(--font-mono); color:var(--primary);">${window.formatINR(s.landedCostTotal)}</td>
              </tr>
              <tr style="font-weight:700; color:var(--success);">
                <td>Landed Cost per Bag (Unit)</td>
                <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(s.landedCostPerUnit || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById("btn-close-log-view").addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
  }
};
