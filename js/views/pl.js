/**
 * KOKO Grocery ERP - Profit & Loss Ledger View Controller
 * Details comparative divisional P&Ls, product level margins, and operating expenses.
 */

window.renderPL = function(container) {
  let activePLTab = "divisional"; // 'divisional', 'products', 'expenses'

  renderLayout();

  function renderLayout() {
    container.innerHTML = `
      <div class="animate-fade-in" style="display:flex; flex-direction:column; gap:20px;">
        
        <!-- Headers -->
        <div class="page-header">
          <div>
            <h3 style="font-family:var(--font-title); font-size:1.4rem;">Financial P&L Ledger</h3>
            <p style="font-size:0.8rem; color:var(--text-muted);">Divisional profit reviews, product-level yields, and operating cash outflows</p>
          </div>
          <div class="page-header-actions">
            <button class="btn btn-primary" id="btn-add-expense-trigger">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Log Expense Outflow
            </button>
          </div>
        </div>

        <!-- Tabs switcher -->
        <div style="display:flex; gap:12px; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
          <button class="btn ${activePLTab === 'divisional' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="tab-pl-div">Divisional P&L Statement</button>
          <button class="btn ${activePLTab === 'products' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="tab-pl-prod">Margins per SKU</button>
          <button class="btn ${activePLTab === 'expenses' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="tab-pl-exp">Operating Expenses</button>
        </div>

        <!-- Tab Content Viewport -->
        <div id="pl-tab-viewport"></div>

      </div>
    `;

    // Bind tab clicks
    document.getElementById("tab-pl-div").addEventListener("click", () => {
      activePLTab = "divisional";
      renderLayout();
    });
    document.getElementById("tab-pl-prod").addEventListener("click", () => {
      activePLTab = "products";
      renderLayout();
    });
    document.getElementById("tab-pl-exp").addEventListener("click", () => {
      activePLTab = "expenses";
      renderLayout();
    });

    // Log Expense trigger
    document.getElementById("btn-add-expense-trigger").addEventListener("click", () => {
      if (!checkRoleAccess("manager")) return;
      openAddExpenseDialog();
    });

    // Render active tab details
    if (activePLTab === "divisional") {
      renderDivisionalPL();
    } else if (activePLTab === "products") {
      renderProductPL();
    } else {
      renderExpensesLedger();
    }
  }

  // --- TAB 1: DIVISIONAL P&L COMPARISONS ---
  function renderDivisionalPL() {
    const sales = db.getSales();
    const products = db.getProducts();
    const expenses = db.getExpenses();
    const shipments = db.getShipments();
    const target = document.getElementById("pl-tab-viewport");

    // 1. RETAIL OPERATIONS P&L
    // Revenues are from store1, store2, store3, and online
    let retailRevenue = 0;
    let retailCOGS = 0;
    
    sales.forEach(sale => {
      if (["store1", "store2", "store3", "online"].includes(sale.channel)) {
        retailRevenue += sale.total;
        
        // Calculate cost at Landed rate
        sale.items.forEach(item => {
          const p = products.find(prod => prod.sku === item.sku);
          const landedCost = p ? (p.prices.import || 0) : 0;
          retailCOGS += landedCost * item.quantity;
        });
      }
    });

    // Retail Expenses (Rent, Utilities, etc.)
    const retailExpensesTotal = expenses
      .filter(e => ["Rent", "Utilities", "General", "Staff", "Inventory Write-off"].includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);

    const retailGrossProfit = retailRevenue - retailCOGS;
    const retailNetProfit = retailGrossProfit - retailExpensesTotal;

    // 2. KOKO IMPORT DIVISION P&L
    // Revenue is from B2B sales transfers (restaurant, hotel, bulk) and internal store replenishments
    // For simplicity: B2B sales counts as Import Division direct B2B revenue
    let importRevenue = 0;
    let importBaseCost = 0;

    sales.forEach(sale => {
      if (["restaurant", "hotel", "bulk"].includes(sale.channel)) {
        importRevenue += sale.total;
        
        sale.items.forEach(item => {
          const p = products.find(prod => prod.sku === item.sku);
          const importBase = p ? (p.prices.import || 0) * 0.7 : 0; // base supply cost in India (approx 70% of landed)
          importBaseCost += importBase * item.quantity;
        });
      }
    });

    // Add shipped cargo base costs and shipping logistics overheads
    // Landed shipment cost total acts as import division outflows
    let importLogisticsExpenses = expenses
      .filter(e => e.category === "Logistics Overhead")
      .reduce((sum, e) => sum + e.amount, 0);

    const importNetProfit = importRevenue - importBaseCost - importLogisticsExpenses;

    target.innerHTML = `
      <div class="grid-cols-2">
        
        <!-- Retail Operations Ledger Card -->
        <div class="glass-panel panel-card" style="min-height:auto;">
          <div class="panel-header" style="background-color:rgba(99,102,241,0.05);">
            <h4 class="panel-title" style="color:var(--primary);">B2C Retail Operations (Mumbai / Online)</h4>
          </div>
          <div class="panel-body">
            <table class="data-table" style="font-size:0.9rem;">
              <tbody>
                <tr>
                  <td>Sales Revenue (B2C Channels)</td>
                  <td style="text-align:right; font-family:var(--font-mono); font-weight:600; color:var(--success);">${window.formatINR(retailRevenue)}</td>
                </tr>
                <tr>
                  <td>Cost of Goods Sold (at Landed Cost)</td>
                  <td style="text-align:right; font-family:var(--font-mono); color:var(--danger);">-${window.formatINR(retailCOGS)}</td>
                </tr>
                <tr style="font-weight:700; border-top:1px solid var(--border-color);">
                  <td>Gross Retail Margin</td>
                  <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(retailGrossProfit)}</td>
                </tr>
                <tr>
                  <td>Operating Expenses (Rent / Utilities)</td>
                  <td style="text-align:right; font-family:var(--font-mono); color:var(--danger);">-${window.formatINR(retailExpensesTotal)}</td>
                </tr>
                <tr style="font-weight:800; border-top: 2px solid var(--border-color); font-size:1rem; background-color:var(--bg-tertiary);">
                  <td>NET OPERATING PROFIT</td>
                  <td style="text-align:right; font-family:var(--font-mono); color:${retailNetProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">
                    ${window.formatINR(retailNetProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Import Logistics Division Ledger Card -->
        <div class="glass-panel panel-card" style="min-height:auto;">
          <div class="panel-header" style="background-color:rgba(16,185,129,0.05);">
            <h4 class="panel-title" style="color:var(--success);">KOKO IMPORT DIVISION (Domestic & Import Cargo)</h4>
          </div>
          <div class="panel-body">
            <table class="data-table" style="font-size:0.9rem;">
              <tbody>
                <tr>
                  <td>Import Channel Revenues (B2B Accounts)</td>
                  <td style="text-align:right; font-family:var(--font-mono); font-weight:600; color:var(--success);">${window.formatINR(importRevenue)}</td>
                </tr>
                <tr>
                  <td>Indian Sourcing Base Costs (FOB)</td>
                  <td style="text-align:right; font-family:var(--font-mono); color:var(--danger);">-${window.formatINR(importBaseCost)}</td>
                </tr>
                <tr>
                  <td>Freight Logistics & Clearance Duties</td>
                  <td style="text-align:right; font-family:var(--font-mono); color:var(--danger);">-${window.formatINR(importLogisticsExpenses)}</td>
                </tr>
                <tr style="font-weight:800; border-top: 2px solid var(--border-color); font-size:1rem; background-color:var(--bg-tertiary);">
                  <td>IMPORT DIVISION NET P&L</td>
                  <td style="text-align:right; font-family:var(--font-mono); color:${importNetProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">
                    ${window.formatINR(importNetProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }

  // --- TAB 2: MARGINS PER PRODUCT SKU ---
  function renderProductPL() {
    const sales = db.getSales();
    const products = db.getProducts();
    const target = document.getElementById("pl-tab-viewport");

    // Gather SKU specific sales
    const skuStats = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!skuStats[item.sku]) {
          skuStats[item.sku] = { sku: item.sku, qty: 0, revenue: 0, cost: 0 };
        }
        
        // Find product import landed cost
        const p = products.find(prod => prod.sku === item.sku);
        const landedCost = p ? (p.prices.import || 0) : 0;

        skuStats[item.sku].qty += item.quantity;
        skuStats[item.sku].revenue += item.total;
        skuStats[item.sku].cost += landedCost * item.quantity;
      });
    });

    const list = Object.values(skuStats).map(entry => {
      const p = products.find(prod => prod.sku === entry.sku);
      const profit = entry.revenue - entry.cost;
      const margin = entry.revenue > 0 ? ((profit / entry.revenue) * 100).toFixed(1) : "0.0";
      return {
        sku: entry.sku,
        name: p ? p.name : entry.sku,
        qty: entry.qty,
        revenue: entry.revenue,
        cost: entry.cost,
        profit,
        margin
      };
    }).sort((a, b) => b.profit - a.profit);

    if (list.length === 0) {
      target.innerHTML = `<div class="glass-panel empty-state">No product sale details recorded yet.</div>`;
      return;
    }

    let rows = "";
    list.forEach(item => {
      rows += `
        <tr>
          <td style="font-family:var(--font-mono); font-weight:700;">${item.sku}</td>
          <td style="font-weight:600;">${item.name}</td>
          <td style="text-align:center;">${item.qty} units</td>
          <td style="text-align:right; font-family:var(--font-mono);">${window.formatINR(item.revenue)}</td>
          <td style="text-align:right; font-family:var(--font-mono); color:var(--danger);">-${window.formatINR(item.cost)}</td>
          <td style="text-align:right; font-family:var(--font-mono); font-weight:700; color:var(--success);">${window.formatINR(item.profit)}</td>
          <td style="text-align:center; font-weight:700;">
            <span class="badge ${item.profit >= 0 ? 'badge-success' : 'badge-danger'}">${item.margin}%</span>
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
                <th>SKU Code</th>
                <th>Description</th>
                <th style="text-align:center;">Volume Sold</th>
                <th style="text-align:right;">Gross Sales (₹)</th>
                <th style="text-align:right;">Landed COGS (₹)</th>
                <th style="text-align:right;">Net Profit (₹)</th>
                <th style="text-align:center;">Yield %</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- TAB 3: OPERATING EXPENSES LEDGER ---
  function renderExpensesLedger() {
    const list = db.getExpenses().sort((a,b) => new Date(b.date) - new Date(a.date));
    const target = document.getElementById("pl-tab-viewport");

    let rows = "";
    list.forEach(e => {
      rows += `
        <tr>
          <td style="font-family:var(--font-mono); font-size:0.8rem;">${e.id}</td>
          <td>${window.formatIndianDate(e.date)}</td>
          <td><span class="badge badge-warning">${e.category}</span></td>
          <td>${e.description}</td>
          <td style="text-align:right; font-family:var(--font-mono); font-weight:700; color:var(--danger);">${window.formatINR(e.amount)}</td>
        </tr>
      `;
    });

    target.innerHTML = `
      <div class="glass-panel">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Reference ID</th>
                <th>Expense Date</th>
                <th>Category</th>
                <th>Particular Description</th>
                <th style="text-align:right;">Outflow Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${list.length === 0 ? `
                <tr><td colspan="5" class="empty-state">No cash expenses logged.</td></tr>
              ` : rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Form Dialogue to record operational expenses
  function openAddExpenseDialog() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.innerHTML = `
      <div class="modal-container glass-panel-lg" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title">Record Operating Cash Outflow</h3>
          <button class="modal-close" id="btn-close-exp-add">&times;</button>
        </div>
        <div class="modal-body">
          <form id="exp-add-form">
            <div class="form-group">
              <label for="exp-add-cat">Expense Category</label>
              <select id="exp-add-cat">
                <option value="Rent">Rent</option>
                <option value="Utilities">Utilities</option>
                <option value="Staff">Staff/Salary</option>
                <option value="General">General/Administration</option>
                <option value="Packaging">Repackaging Material</option>
              </select>
            </div>
            <div class="form-group">
              <label for="exp-add-amount">Amount (₹ INR)</label>
              <input type="number" id="exp-add-amount" class="form-control" placeholder="₹" min="1" required>
            </div>
            <div class="form-group">
              <label for="exp-add-date">Expense Date</label>
              <input type="date" id="exp-add-date" class="form-control" value="2026-07-07" required>
            </div>
            <div class="form-group">
              <label for="exp-add-desc">Description Notes</label>
              <input type="text" id="exp-add-desc" class="form-control" placeholder="e.g. Office electricity bill" required>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-exp-add">Cancel</button>
          <button class="btn btn-primary" id="btn-save-exp-add">Save Expense</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeActions = () => document.body.removeChild(overlay);
    document.getElementById("btn-close-exp-add").addEventListener("click", closeActions);
    document.getElementById("btn-cancel-exp-add").addEventListener("click", closeActions);

    document.getElementById("btn-save-exp-add").addEventListener("click", () => {
      const cat = document.getElementById("exp-add-cat").value;
      const amount = parseInt(document.getElementById("exp-add-amount").value, 10);
      const date = document.getElementById("exp-add-date").value;
      const desc = document.getElementById("exp-add-desc").value.trim();

      if (isNaN(amount) || amount <= 0 || !date || !desc) {
        showToast("Please provide valid particulars and amount inputs.", "warning");
        return;
      }

      db.addExpense({
        id: `EXP-OPER-${Date.now()}`,
        date,
        category: cat,
        amount,
        description: desc
      });

      showToast("Expense logged successfully.", "success");
      closeActions();
      renderLayout();
    });
  }
};
