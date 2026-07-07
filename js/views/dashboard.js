/**
 * KOKO Grocery ERP - Dashboard View Controller
 * Computes, aggregates, and renders financial and inventory stats with time-series charts.
 */

window.renderDashboard = function(container) {
  const sales = db.getSales();
  const products = db.getProducts();
  const expenses = db.getExpenses();
  
  // Define Today and Month context based on metadata (2026-07-07)
  const todayStr = "2026-07-07";
  const currentMonthStr = "2026-07"; // July 2026
  
  // 1. Calculate Financials JPY (integers)
  let todaySales = 0;
  let todayCost = 0;
  let monthlySales = 0;
  let monthlyCost = 0;

  sales.forEach(sale => {
    const saleDate = sale.date.substring(0, 10);
    const saleMonth = sale.date.substring(0, 7);
    
    // Calculate cost of goods sold (COGS) for this invoice
    let invoiceCost = 0;
    sale.items.forEach(item => {
      const prod = products.find(p => p.sku === item.sku);
      const unitCost = prod ? (prod.prices.import || 0) : 0;
      invoiceCost += unitCost * item.quantity;
    });

    if (saleDate === todayStr) {
      todaySales += sale.total;
      todayCost += invoiceCost;
    }
    if (saleMonth === currentMonthStr) {
      monthlySales += sale.total;
      monthlyCost += invoiceCost;
    }
  });

  // Daily Expenses
  const todayExpenses = expenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  // Monthly Expenses
  const monthlyExpenses = expenses
    .filter(e => e.date.substring(0, 7) === currentMonthStr)
    .reduce((sum, e) => sum + e.amount, 0);

  // Profit calculations
  const todayProfit = Math.max(0, todaySales - todayCost - todayExpenses);
  const monthlyProfit = Math.max(0, monthlySales - monthlyCost - monthlyExpenses);

  // 2. Calculate Stock Stats
  let totalStockVal = 0;
  let lowStockCount = 0;
  let outStockCount = 0;

  products.forEach(p => {
    const totalQty = Object.values(p.stock || {}).reduce((a, b) => a + b, 0);
    const importCost = p.prices.import || 0;
    totalStockVal += totalQty * importCost;

    if (totalQty === 0) {
      outStockCount++;
    } else if (totalQty <= p.reorderPoint) {
      lowStockCount++;
    }
  });

  // 3. Rank Top Selling Products
  const itemSalesCounts = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (!itemSalesCounts[item.sku]) {
        itemSalesCounts[item.sku] = { sku: item.sku, qty: 0, revenue: 0 };
      }
      itemSalesCounts[item.sku].qty += item.quantity;
      itemSalesCounts[item.sku].revenue += item.total;
    });
  });

  const rankedItems = Object.values(itemSalesCounts)
    .map(entry => {
      const p = products.find(prod => prod.sku === entry.sku);
      return {
        sku: entry.sku,
        name: p ? p.name : entry.sku,
        qty: entry.qty,
        revenue: entry.revenue
      };
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  // 4. Generate 7-Day Chart Data (July 1st to July 7th)
  const chartDays = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05", "2026-07-06", "2026-07-07"];
  const chartData = chartDays.map(day => {
    let dayTotal = 0;
    sales.forEach(sale => {
      if (sale.date.substring(0, 10) === day) {
        dayTotal += sale.total;
      }
    });
    return {
      label: day.substring(8, 10) + " Jul",
      value: dayTotal
    };
  });

  // Build View Layout
  container.innerHTML = `
    <div class="dashboard-grid animate-fade-in">
      
      <!-- Top Widgets Row -->
      <div class="grid-cols-4">
        <!-- Today Sales -->
        <div class="stat-card glass-panel">
          <div class="stat-header">
            <span>TODAY'S SALES</span>
            <div class="stat-icon" style="background-color: var(--primary-glow); color: var(--primary);">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 18px; height: 18px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="stat-value">${window.formatINR(todaySales)}</div>
          <div class="stat-footer">
            <span class="stat-trend-up">↑ 12.5%</span> vs last Monday
          </div>
        </div>

        <!-- Today Profit -->
        <div class="stat-card glass-panel">
          <div class="stat-header">
            <span>TODAY'S PROFIT</span>
            <div class="stat-icon" style="background-color: var(--success-light); color: var(--success-hover);">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 18px; height: 18px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="stat-value" style="color: var(--success);">${window.formatINR(todayProfit)}</div>
          <div class="stat-footer">
            <span class="stat-trend-up">↑ 4.2%</span> vs target margin
          </div>
        </div>

        <!-- Monthly Sales -->
        <div class="stat-card glass-panel">
          <div class="stat-header">
            <span>MONTHLY SALES (JUL)</span>
            <div class="stat-icon" style="background-color: var(--info-light); color: var(--info-hover);">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 18px; height: 18px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div class="stat-value">${window.formatINR(monthlySales)}</div>
          <div class="stat-footer">
            <span>Progress: 32% of Month Goal</span>
          </div>
        </div>

        <!-- Monthly Profit -->
        <div class="stat-card glass-panel">
          <div class="stat-header">
            <span>MONTHLY PROFIT</span>
            <div class="stat-icon" style="background-color: var(--success-light); color: var(--success-hover);">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 18px; height: 18px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div class="stat-value" style="color: var(--success);">${window.formatINR(monthlyProfit)}</div>
          <div class="stat-footer">
            <span>Net margin target check</span>
          </div>
        </div>
      </div>

      <!-- Secondary Stock Valuation Row -->
      <div class="grid-cols-3">
        <!-- Stock Value -->
        <div class="stat-card glass-panel" style="min-height: 90px; padding: 16px;">
          <div class="stat-header" style="font-size:0.75rem;">TOTAL STOCK VALUE (AT LANDED COST)</div>
          <div class="stat-value" style="font-size:1.5rem; margin-top:4px;">${window.formatINR(totalStockVal)}</div>
        </div>
        <!-- Low stock -->
        <div class="stat-card glass-panel" style="min-height: 90px; padding: 16px; border-left: 4px solid var(--warning);">
          <div class="stat-header" style="font-size:0.75rem;">LOW STOCK ITEMS</div>
          <div class="stat-value" style="font-size:1.5rem; margin-top:4px; color:var(--warning-hover);">${lowStockCount} SKUs</div>
        </div>
        <!-- Out of stock -->
        <div class="stat-card glass-panel" style="min-height: 90px; padding: 16px; border-left: 4px solid var(--danger);">
          <div class="stat-header" style="font-size:0.75rem;">OUT OF STOCK ITEMS</div>
          <div class="stat-value" style="font-size:1.5rem; margin-top:4px; color:var(--danger-hover);">${outStockCount} SKUs</div>
        </div>
      </div>

      <!-- Charts & Split widgets -->
      <div class="glass-panel panel-card">
        <div class="panel-header">
          <h3 class="panel-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 20px; height: 20px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Sales Value Trend (Last 7 Days)
          </h3>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Channel: ${window.getCurrentStore().toUpperCase()}</span>
        </div>
        <div class="panel-body">
          <div class="chart-container" id="sales-line-chart-anchor"></div>
        </div>
      </div>

      <div class="dashboard-split">
        <!-- Top 10 Selling Products -->
        <div class="glass-panel panel-card">
          <div class="panel-header">
            <h3 class="panel-title">Top 10 Selling Products</h3>
          </div>
          <div class="panel-body" style="padding: 10px 20px;">
            ${rankedItems.length === 0 ? `
              <div class="empty-state">No transaction logs available.</div>
            ` : rankedItems.map((item, idx) => `
              <div class="list-item-dense">
                <div class="list-item-left">
                  <div class="list-item-avatar">${idx + 1}</div>
                  <div class="list-item-info">
                    <span class="list-item-title">${item.name}</span>
                    <span class="list-item-subtitle">SKU: ${item.sku}</span>
                  </div>
                </div>
                <div class="list-item-right">
                  <div class="list-item-value">${item.qty} units</div>
                  <div class="list-item-subtitle">${window.formatINR(item.revenue)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- System Inventory Warnings -->
        <div class="glass-panel panel-card">
          <div class="panel-header">
            <h3 class="panel-title">Critical Inventory Alerts</h3>
          </div>
          <div class="panel-body">
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${getSystemAlerts().length === 0 ? `
                <div class="empty-state">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color:var(--success);">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>All inventory levels normal. No immediate warnings.</span>
                </div>
              ` : getSystemAlerts().slice(0, 7).map(alert => {
                const alertClass = alert.type === "out" ? "alert-row-danger" : "alert-row-warning";
                return `
                  <div class="alert-row ${alertClass}" style="margin-bottom:0px;">
                    <div class="alert-msg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:16px; height:16px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>${alert.message}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  // Draw chart in next tick
  setTimeout(() => {
    KokoChart.renderLineChart("sales-line-chart-anchor", chartData);
  }, 50);
};
