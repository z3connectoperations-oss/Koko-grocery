/**
 * KOKO Grocery ERP - Reports & Analytics View Controller
 * Formulates tax audits, sales ledgers, stock forecasts, and exports CSV matrices.
 */

window.renderReports = function(container) {
  let activeReport = "tax"; // 'tax', 'sales', 'inventory', 'purchase', 'customers'

  renderLayout();

  function renderLayout() {
    const country = window.getCurrentCountry();
    const isIndia = (country === "IN");
    container.innerHTML = `
      <div class="animate-fade-in" style="display:flex; flex-direction:column; gap:20px;">
        
        <!-- Headers -->
        <div class="page-header" style="display:flex; align-items:center; gap:16px;">
          <img src="assets/logo.png" style="width: 50px; height: 50px; object-fit: contain; filter: drop-shadow(0 0 4px rgba(212,175,55,0.3));" alt="Logo">
          <div>
            <h3 style="font-family:var(--font-title); font-size:1.4rem;">Reports & Analytics</h3>
            <p style="font-size:0.8rem; color:var(--text-muted);">Generate financial audit logs, tax reports, inventory levels, and download CSV sheets</p>
          </div>
          <div class="page-header-actions" style="margin-left: auto;">
            <button class="btn btn-secondary" id="btn-print-report">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Document
            </button>
            <button class="btn btn-primary" id="btn-csv-export">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV Spreadsheet
            </button>
          </div>
        </div>

        <!-- Filter report selector -->
        <div class="filters-bar glass-panel" style="padding:12px;">
          <div class="form-group" style="margin-bottom:0; flex-direction:row; align-items:center; gap:12px;">
            <label style="white-space:nowrap; margin-bottom:0;">Select Report Category:</label>
            <select id="report-type-select" style="width: 320px; padding: 6px;">
              <option value="tax">${isIndia ? 'India GST Tax Audit (18% vs 5%)' : 'Japan Consumption Tax Audit (10% vs 8%)'}</option>
              <option value="sales">Sales Invoice Ledger</option>
              <option value="inventory">Inventory Stock Valuation</option>
              <option value="purchase">Supplier Procurements & Debt</option>
              <option value="customers">Customer Accounts & Loyalty Points</option>
            </select>
          </div>
        </div>

        <!-- Report Sheet Display -->
        <div id="report-viewport" class="glass-panel" style="padding: 20px;"></div>

      </div>
    `;

    // Dropdown binds
    const select = document.getElementById("report-type-select");
    select.value = activeReport;
    select.addEventListener("change", (e) => {
      activeReport = e.target.value;
      loadActiveReport();
    });

    // CSV Download
    document.getElementById("btn-csv-export").addEventListener("click", triggerCSVExport);
    
    // Print triggers
    document.getElementById("btn-print-report").addEventListener("click", () => {
      window.print();
    });

    loadActiveReport();
  }

  function loadActiveReport() {
    const vp = document.getElementById("report-viewport");

    if (activeReport === "tax") {
      generateTaxReport(vp);
    } else if (activeReport === "sales") {
      generateSalesReport(vp);
    } else if (activeReport === "inventory") {
      generateInventoryReport(vp);
    } else if (activeReport === "purchase") {
      generatePurchaseReport(vp);
    } else if (activeReport === "customers") {
      generateCustomerReport(vp);
    }
  }

  // --- REPORT GENERATORS (HTML and statistics compiles) ---

  // 1. Dynamic Tax Audit Report
  function generateTaxReport(target) {
    const sales = db.getSales();
    const country = window.getCurrentCountry();
    const isIndia = (country === "IN");
    const stdTax = isIndia ? 18 : 10;
    const redTax = isIndia ? 5 : 8;
    
    let netStd = 0;
    let taxStd = 0;
    let totalStd = 0;

    let netRed = 0;
    let taxRed = 0;
    let totalRed = 0;

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const itemTotal = item.total || 0;
        const itemTax = item.taxAmount || 0;
        const itemNet = itemTotal - itemTax;

        if (item.taxRate === stdTax) {
          netStd += itemNet;
          taxStd += itemTax;
          totalStd += itemTotal;
        } else {
          netRed += itemNet;
          taxRed += itemTax;
          totalRed += itemTotal;
        }
      });
    });

    target.innerHTML = `
      <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
        <img src="assets/logo.png" style="width: 44px; height: 44px; object-fit: contain;" alt="Logo">
        <div>
          <h4 style="font-family:var(--font-title); font-size:1.1rem; margin-bottom:4px;">${isIndia ? 'India GST Summary Statement' : 'Japan Consumption Tax Summary Statement'}</h4>
          <p style="font-size:0.8rem; color:var(--text-muted);">Audited report matching sales transactions across channels</p>
        </div>
      </div>

      <table class="data-table" id="report-active-table">
        <thead>
          <tr>
            <th>Tax Class Bracket</th>
            <th style="text-align:right;">Net Taxable Base (${isIndia ? '₹' : '¥'})</th>
            <th style="text-align:right;">Tax Collected (${isIndia ? '₹' : '¥'})</th>
            <th style="text-align:right;">Gross Sales Revenue (${isIndia ? '₹' : '¥'})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Standard Rate (${stdTax}%)</strong> - ${isIndia ? 'Household / General Goods' : 'Standard General Goods'}</td>
            <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(netStd)}</td>
            <td style="text-align:right; font-family:var(--font-mono); color:var(--primary);">${window.formatINR(taxStd)}</td>
            <td style="text-align:right; font-family:var(--font-mono); font-weight:600;">${window.formatINR(totalStd)}</td>
          </tr>
          <tr>
            <td><strong>Reduced Rate (${redTax}%)</strong> - ${isIndia ? 'Grocery Food / Basic Staples' : 'Reduced Food & Beverages'}</td>
            <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(netRed)}</td>
            <td style="text-align:right; font-family:var(--font-mono); color:var(--primary);">${window.formatINR(taxRed)}</td>
            <td style="text-align:right; font-family:var(--font-mono); font-weight:600;">${window.formatINR(totalRed)}</td>
          </tr>
          <tr style="background-color: var(--bg-tertiary); font-weight: 700;">
            <td>Total Combined</td>
            <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(netStd + netRed)}</td>
            <td style="text-align:right; font-family:var(--font-mono); color:var(--primary);">${window.formatINR(taxStd + taxRed)}</td>
            <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(totalStd + totalRed)}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  // 2. Sales Invoices
  function generateSalesReport(target) {
    const sales = db.getSales().sort((a,b) => new Date(b.date) - new Date(a.date));

    let rows = "";
    sales.forEach(s => {
      rows += `
        <tr>
          <td style="font-family:var(--font-mono); font-weight:700;">${s.id}</td>
          <td>${window.formatIndianDateTime(s.date)}</td>
          <td><span class="badge badge-info">${s.channel.toUpperCase()}</span></td>
          <td style="text-align:center;">${s.items.reduce((sum, i) => sum + i.quantity, 0)} items</td>
          <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(s.tax)}</td>
          <td style="text-align:right; font-family:var(--font-mono); font-weight:700; color:var(--success);">${window.formatINR(s.total)}</td>
        </tr>
      `;
    });

    target.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h4 style="font-family:var(--font-title); font-size:1.1rem; margin-bottom:4px;">Sales Invoice Audit Ledger</h4>
        <p style="font-size:0.8rem; color:var(--text-muted);">List of invoices billed</p>
      </div>

      <table class="data-table" id="report-active-table">
        <thead>
          <tr>
            <th>Invoice ID</th>
            <th>Date & Time</th>
            <th>Billing Channel</th>
            <th style="text-align:center;">Item Count</th>
            <th style="text-align:right;">Consumption Tax</th>
            <th style="text-align:right;">Grand Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${sales.length === 0 ? `<tr><td colspan="6" class="empty-state">No sales transactions logged.</td></tr>` : rows}
        </tbody>
      </table>
    `;
  }

  // 3. Inventory remaining
  function generateInventoryReport(target) {
    const products = db.getProducts().filter(p => !p.sku.startsWith("MOCK"));

    let rows = "";
    products.forEach(p => {
      const stockVal = Object.values(p.stock).reduce((sum, s) => sum + s, 0);
      const landedCost = p.prices.import || 0;
      
      rows += `
        <tr>
          <td style="font-family:var(--font-mono); font-weight:700;">${p.sku}</td>
          <td style="font-weight:600;">${p.name}</td>
          <td>${p.category}</td>
          <td style="text-align:center;">${stockVal} bags</td>
          <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(landedCost)}</td>
          <td style="text-align:right; font-family:var(--font-mono); font-weight:700;">${window.formatINR(stockVal * landedCost)}</td>
        </tr>
      `;
    });

    target.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h4 style="font-family:var(--font-title); font-size:1.1rem; margin-bottom:4px;">Stock Valuation Report</h4>
        <p style="font-size:0.8rem; color:var(--text-muted);">Current quantities in stock evaluated at landed import cost</p>
      </div>

      <table class="data-table" id="report-active-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Product Description</th>
            <th>Category</th>
            <th style="text-align:center;">Warehouse Balance</th>
            <th style="text-align:right;">Landed Unit Cost</th>
            <th style="text-align:right;">Stock Valuation (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // 4. Procurement
  function generatePurchaseReport(target) {
    const poList = db.getPurchaseOrders();
    const suppliers = db.getSuppliers();

    let rows = "";
    poList.forEach(po => {
      const sup = suppliers.find(s => s.id === po.supplierId) || {};
      rows += `
        <tr>
          <td style="font-family:var(--font-mono);">${po.id}</td>
          <td>${window.formatIndianDate(po.date)}</td>
          <td>${sup.name || po.supplierId}</td>
          <td><span class="badge ${po.status === 'Received' ? 'badge-success' : 'badge-warning'}">${po.status}</span></td>
          <td style="text-align:right; font-family:var(--font-mono); font-weight:700;">${window.formatINR(po.total)}</td>
        </tr>
      `;
    });

    target.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h4 style="font-family:var(--font-title); font-size:1.1rem; margin-bottom:4px;">Supplier Procurements Log</h4>
        <p style="font-size:0.8rem; color:var(--text-muted);">History of procurement orders issued to supply chains</p>
      </div>

      <table class="data-table" id="report-active-table">
        <thead>
          <tr>
            <th>Purchase Order ID</th>
            <th>Creation Date</th>
            <th>Supplier Name</th>
            <th>GRN Status</th>
            <th style="text-align:right;">Purchase Value (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${poList.length === 0 ? `<tr><td colspan="5" class="empty-state">No Purchase Orders logged.</td></tr>` : rows}
        </tbody>
      </table>
    `;
  }

  // 5. Customer Ledger
  function generateCustomerReport(target) {
    const list = db.getCustomers();

    let rows = "";
    list.forEach(c => {
      rows += `
        <tr>
          <td style="font-family:var(--font-mono);">${c.id}</td>
          <td style="font-weight:600;">${c.name}</td>
          <td>${c.phone}</td>
          <td style="text-align:center; font-weight:700; color:var(--primary);">${c.loyaltyPoints.toLocaleString()} pts</td>
          <td style="text-align:right; font-family:var(--font-mono); ${c.creditBalance > 0 ? 'color:var(--danger); font-weight:700;' : ''}">
            ${window.formatINR(c.creditBalance || 0)}
          </td>
        </tr>
      `;
    });

    target.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h4 style="font-family:var(--font-title); font-size:1.1rem; margin-bottom:4px;">Customer Database Ledger</h4>
        <p style="font-size:0.8rem; color:var(--text-muted);">Profiles, loyalty point balances, and credit accounts totals</p>
      </div>

      <table class="data-table" id="report-active-table">
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Client Name</th>
            <th>Phone</th>
            <th style="text-align:center;">Loyalty Points</th>
            <th style="text-align:right;">Outstanding Balances (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${list.length === 0 ? `<tr><td colspan="5" class="empty-state">No customer accounts database.</td></tr>` : rows}
        </tbody>
      </table>
    `;
  }

  // --- CLIENT-SIDE CSV EXPORT ENGINE ---
  // Parses active HTML table, converts cells to CSV syntax strings, and triggers browser file save
  function triggerCSVExport() {
    const table = document.getElementById("report-active-table");
    if (!table) {
      showToast("No active report data found to export.", "warning");
      return;
    }

    let csvContent = "";
    const rows = table.querySelectorAll("tr");

    rows.forEach(tr => {
      const cells = tr.querySelectorAll("th, td");
      const rowData = [];
      cells.forEach(cell => {
        // Clean text (remove yen markers, commas, extra whitespaces)
        let text = cell.textContent.trim()
          .replace(/₹/g, "")
          .replace(/,/g, "")
          .replace(/"/g, '""');
        
        // Wrap cell value in quotes if it contains commas/spaces
        if (text.includes(" ") || text.includes(",")) {
          text = `"${text}"`;
        }
        rowData.push(text);
      });
      csvContent += rowData.join(",") + "\r\n";
    });

    // Create file trigger download
    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `KokoERP_Report_${activeReport}_${Date.now()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Report exported as CSV. Check downloads folder.`, "success");
    } catch(e) {
      showToast("Error generating CSV file download.", "danger");
    }
  }
};
