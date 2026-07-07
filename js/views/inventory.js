/**
 * KOKO Grocery ERP - Inventory View Controller
 * Manages product database, pagination, multi-store stock level views, and adjustments.
 */

window.renderInventory = function(container) {
  let currentPage = 1;
  const itemsPerPage = 15;
  let filteredProducts = [];
  
  // State for Edit mode
  let editingSku = null;

  // Retrieve current products
  const products = db.getProducts();

  // Create layout template
  container.innerHTML = `
    <div class="animate-fade-in" style="display:flex; flex-direction:column; gap:20px; height:100%;">
      
      <!-- Top Actions Bar -->
      <div class="page-header">
        <div>
          <h3 style="font-family:var(--font-title); font-size:1.4rem;">SKU Master Catalogue</h3>
          <p style="font-size:0.8rem; color:var(--text-muted);">Total SKU Count: ${products.length} registered products</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btn-add-product-trigger">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add New SKU
          </button>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="filters-bar glass-panel">
        <div class="search-input-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" id="inv-search-input" class="form-control" placeholder="Search by SKU, Name or Barcode...">
        </div>
        
        <div>
          <select id="inv-filter-category" style="width: 180px;">
            <option value="ALL">All Categories</option>
            <option value="Rice & Grain">Rice & Grain</option>
            <option value="Spices & Condiments">Spices & Condiments</option>
            <option value="Processed Food">Processed Food</option>
            <option value="Beverages">Beverages</option>
            <option value="Household">Household</option>
          </select>
        </div>

        <div>
          <select id="inv-filter-stock" style="width: 160px;">
            <option value="ALL">All Stock Levels</option>
            <option value="LOW">Low Stock Alert</option>
            <option value="OUT">Out of Stock</option>
          </select>
        </div>
      </div>

      <!-- Inventory Grid Table -->
      <div class="glass-panel" style="flex-grow:1; overflow:hidden; display:flex; flex-direction:column;">
        <div class="table-container" style="flex-grow:1; overflow-y:auto;">
          <table class="data-table" id="inventory-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Description</th>
                <th>Category</th>
                <th>Barcode</th>
                <th>Expiry</th>
                <th style="text-align: center;">Main WH</th>
                <th style="text-align: center;">Store 1 (MUM)</th>
                <th style="text-align: center;">Store 2 (DEL)</th>
                <th style="text-align: center;">Store 3 (BLR)</th>
                <th style="text-align: right;">Base Price</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody id="inventory-table-body">
              <!-- Rendered via JavaScript -->
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        <div class="pagination">
          <div style="font-size: 0.85rem; color: var(--text-secondary);" id="pagination-info">
            Showing 1 to 15 of 400 entries
          </div>
          <div class="pagination-buttons">
            <button class="btn btn-secondary btn-sm" id="btn-page-prev">Prev</button>
            <button class="btn btn-secondary btn-sm" id="btn-page-next">Next</button>
          </div>
        </div>
      </div>

    </div>
  `;

  // Bind filters
  const searchInput = document.getElementById("inv-search-input");
  const categoryFilter = document.getElementById("inv-filter-category");
  const stockFilter = document.getElementById("inv-filter-stock");

  searchInput.addEventListener("input", applyFilters);
  categoryFilter.addEventListener("change", applyFilters);
  stockFilter.addEventListener("change", applyFilters);

  // Bind add button
  document.getElementById("btn-add-product-trigger").addEventListener("click", () => {
    if (!checkRoleAccess("manager")) return;
    editingSku = null;
    document.getElementById("product-modal-title").textContent = "Add New Product SKU";
    document.getElementById("product-form").reset();
    document.getElementById("p-sku").readOnly = false;
    openModal("product-modal");
  });

  // Save Product action
  document.getElementById("btn-save-product").onclick = (e) => {
    e.preventDefault();
    saveProductForm();
  };

  // Bind Pagination
  document.getElementById("btn-page-prev").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTableRows();
    }
  });

  document.getElementById("btn-page-next").addEventListener("click", () => {
    const maxPage = Math.ceil(filteredProducts.length / itemsPerPage);
    if (currentPage < maxPage) {
      currentPage++;
      renderTableRows();
    }
  });

  // Run filter on startup
  applyFilters();

  function applyFilters() {
    const q = searchInput.value.toLowerCase().trim();
    const cat = categoryFilter.value;
    const stockStatus = stockFilter.value;
    const prods = db.getProducts();

    filteredProducts = prods.filter(p => {
      // 1. Search filter
      const matchesSearch = p.sku.toLowerCase().includes(q) || 
                            p.name.toLowerCase().includes(q) || 
                            (p.barcode && p.barcode.includes(q));
      
      // 2. Category filter
      const matchesCat = (cat === "ALL" || p.category === cat);

      // 3. Stock Level filter
      const totalStock = Object.values(p.stock || {}).reduce((a, b) => a + b, 0);
      let matchesStock = true;
      if (stockStatus === "LOW") {
        matchesStock = (totalStock > 0 && totalStock <= p.reorderPoint);
      } else if (stockStatus === "OUT") {
        matchesStock = (totalStock === 0);
      }

      return matchesSearch && matchesCat && matchesStock;
    });

    currentPage = 1;
    renderTableRows();
  }

  function renderTableRows() {
    const tbody = document.getElementById("inventory-table-body");
    const info = document.getElementById("pagination-info");
    tbody.innerHTML = "";

    if (filteredProducts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="empty-state">No matching SKUs found in catalogue.</td></tr>`;
      info.textContent = "Showing 0 entries";
      return;
    }

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, filteredProducts.length);
    const pageItems = filteredProducts.slice(startIdx, endIdx);

    pageItems.forEach(p => {
      const totalStock = Object.values(p.stock || {}).reduce((a, b) => a + b, 0);
      
      // Highlight low stock values
      const whStock = p.stock.warehouse || 0;
      const s1Stock = p.stock.store1 || 0;
      const s2Stock = p.stock.store2 || 0;
      const s3Stock = p.stock.store3 || 0;

      // Select price based on current channel
      const curStore = window.getCurrentStore();
      const currentPrice = p.prices[curStore] || p.prices.store1 || 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family:var(--font-mono); font-weight:700;">${p.sku}</td>
        <td>
          <div style="font-weight:600; font-size:0.875rem;">${p.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Batch: ${p.batch || 'N/A'}</div>
        </td>
        <td><span class="badge badge-info">${p.category}</span></td>
        <td style="font-family:var(--font-mono); font-size:0.8rem;">${p.barcode || '-'}</td>
        <td style="font-size:0.8rem; white-space:nowrap;">
          ${p.expiryDate ? `<span style="${isNearExpiry(p.expiryDate) ? 'color:var(--danger); font-weight:600;' : ''}">${window.formatIndianDate(p.expiryDate)}</span>` : '-'}
        </td>
        <td style="text-align: center; font-weight:600;">${whStock}</td>
        <td style="text-align: center; font-weight:600; ${s1Stock <= p.reorderPoint ? 'color:var(--warning-hover);' : ''}">${s1Stock}</td>
        <td style="text-align: center; font-weight:600; ${s2Stock <= p.reorderPoint ? 'color:var(--warning-hover);' : ''}">${s2Stock}</td>
        <td style="text-align: center; font-weight:600; ${s3Stock <= p.reorderPoint ? 'color:var(--warning-hover);' : ''}">${s3Stock}</td>
        <td style="text-align: right; font-family:var(--font-mono); font-weight:700;">${window.formatINR(currentPrice)}</td>
        <td style="text-align: center;">
          <div style="display:flex; justify-content:center; gap:8px;">
            <button class="btn btn-secondary btn-sm btn-adjust" data-sku="${p.sku}" title="Adjust Stock">Stock</button>
            <button class="btn btn-secondary btn-sm btn-edit" data-sku="${p.sku}" title="Edit SKU">Edit</button>
            <button class="btn btn-danger btn-sm btn-delete" data-sku="${p.sku}" title="Delete SKU">×</button>
          </div>
        </td>
      `;

      // Bind row buttons
      tr.querySelector(".btn-adjust").addEventListener("click", () => openStockAdjustment(p));
      tr.querySelector(".btn-edit").addEventListener("click", () => openEditProduct(p));
      tr.querySelector(".btn-delete").addEventListener("click", () => deleteProduct(p.sku));

      tbody.appendChild(tr);
    });

    info.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${filteredProducts.length} entries`;

    // Manage Prev/Next states
    document.getElementById("btn-page-prev").disabled = (currentPage === 1);
    document.getElementById("btn-page-next").disabled = (currentPage === Math.ceil(filteredProducts.length / itemsPerPage));
  }

  function isNearExpiry(dateStr) {
    const exp = new Date(dateStr);
    const diffTime = exp - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }

  // Handle SKU Edit Click
  function openEditProduct(p) {
    if (!checkRoleAccess("manager")) return;
    editingSku = p.sku;
    
    document.getElementById("product-modal-title").textContent = `Edit Product SKU: ${p.sku}`;
    
    document.getElementById("p-sku").value = p.sku;
    document.getElementById("p-sku").readOnly = true;
    document.getElementById("p-barcode").value = p.barcode || "";
    document.getElementById("p-name").value = p.name;
    document.getElementById("p-category").value = p.category;
    document.getElementById("p-batch").value = p.batch || "";
    document.getElementById("p-expiry").value = p.expiryDate || "";
    document.getElementById("p-tax").value = p.taxRate || 8;
    
    // prices
    document.getElementById("p-price-store1").value = p.prices.store1 || 0;
    document.getElementById("p-price-store2").value = p.prices.store2 || 0;
    document.getElementById("p-price-store3").value = p.prices.store3 || 0;
    document.getElementById("p-price-online").value = p.prices.online || 0;
    document.getElementById("p-price-restaurant").value = p.prices.restaurant || 0;
    document.getElementById("p-price-hotel").value = p.prices.hotel || 0;
    document.getElementById("p-price-bulk").value = p.prices.bulk || 0;
    document.getElementById("p-price-import").value = p.prices.import || 0;

    // stocks
    document.getElementById("p-stock-wh").value = p.stock.warehouse || 0;
    document.getElementById("p-stock-store1").value = p.stock.store1 || 0;
    document.getElementById("p-stock-store2").value = p.stock.store2 || 0;
    document.getElementById("p-stock-store3").value = p.stock.store3 || 0;
    document.getElementById("p-reorder").value = p.reorderPoint || 10;

    openModal("product-modal");
  }

  // Handle Save Product Form
  function saveProductForm() {
    const sku = document.getElementById("p-sku").value.trim().toUpperCase();
    const barcode = document.getElementById("p-barcode").value.trim();
    const name = document.getElementById("p-name").value.trim();
    const category = document.getElementById("p-category").value;
    const batch = document.getElementById("p-batch").value.trim();
    const expiry = document.getElementById("p-expiry").value;
    const tax = parseInt(document.getElementById("p-tax").value, 10);

    if (!sku || !name || !barcode) {
      showToast("SKU, Barcode, and Product Name are mandatory fields.", "warning");
      return;
    }

    // Verify uniqueness for new sku
    if (!editingSku) {
      const all = db.getProducts();
      if (all.some(p => p.sku === sku)) {
        showToast("Error: SKU already exists in registry.", "danger");
        return;
      }
    }

    const updatedProduct = {
      sku,
      barcode,
      name,
      category,
      batch,
      expiryDate: expiry,
      taxRate: tax,
      prices: {
        store1: Math.max(0, parseInt(document.getElementById("p-price-store1").value, 10) || 0),
        store2: Math.max(0, parseInt(document.getElementById("p-price-store2").value, 10) || 0),
        store3: Math.max(0, parseInt(document.getElementById("p-price-store3").value, 10) || 0),
        online: Math.max(0, parseInt(document.getElementById("p-price-online").value, 10) || 0),
        restaurant: Math.max(0, parseInt(document.getElementById("p-price-restaurant").value, 10) || 0),
        hotel: Math.max(0, parseInt(document.getElementById("p-price-hotel").value, 10) || 0),
        bulk: Math.max(0, parseInt(document.getElementById("p-price-bulk").value, 10) || 0),
        import: Math.max(0, parseInt(document.getElementById("p-price-import").value, 10) || 0)
      },
      stock: {
        warehouse: Math.max(0, parseInt(document.getElementById("p-stock-wh").value, 10) || 0),
        store1: Math.max(0, parseInt(document.getElementById("p-stock-store1").value, 10) || 0),
        store2: Math.max(0, parseInt(document.getElementById("p-stock-store2").value, 10) || 0),
        store3: Math.max(0, parseInt(document.getElementById("p-stock-store3").value, 10) || 0)
      },
      reorderPoint: Math.max(0, parseInt(document.getElementById("p-reorder").value, 10) || 0)
    };

    db.saveProduct(updatedProduct);
    closeModal("product-modal");
    showToast(`SKU ${sku} successfully saved.`, "success");
    applyFilters();
    updateAlertsBadge();
  }

  // Handle Delete Product SKU
  function deleteProduct(sku) {
    if (!checkRoleAccess("admin")) return;
    if (confirm(`Are you absolutely sure you want to delete SKU ${sku} from registry?`)) {
      db.deleteProduct(sku);
      showToast(`SKU ${sku} deleted.`, "success");
      applyFilters();
      updateAlertsBadge();
    }
  }

  // Handle Stock Adjustments Modal
  function openStockAdjustment(p) {
    if (!checkRoleAccess("manager")) return;

    // Create a dynamic adjustment popup modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.innerHTML = `
      <div class="modal-container glass-panel-lg" style="max-width: 420px;">
        <div class="modal-header">
          <h3 class="modal-title">Inventory Stock Adjustment</h3>
          <button class="modal-close" id="btn-close-adj">&times;</button>
        </div>
        <div class="modal-body">
          <div style="font-size:0.9rem; margin-bottom:12px;">
            <strong>SKU:</strong> ${p.sku}<br/>
            <strong>Product:</strong> ${p.name}
          </div>
          
          <div class="form-group">
            <label for="adj-store">Target Location</label>
            <select id="adj-store">
              <option value="warehouse">Main Warehouse (WH)</option>
              <option value="store1">Mumbai Retail (Store 1)</option>
              <option value="store2">Delhi Retail (Store 2)</option>
              <option value="store3">Bengaluru Retail (Store 3)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="adj-mode">Adjustment Type</label>
            <select id="adj-mode">
              <option value="add">Add Stock (+)</option>
              <option value="subtract">Deduct Stock (-)</option>
              <option value="set">Over-write Absolute Qty</option>
            </select>
          </div>

          <div class="form-group">
            <label for="adj-qty">Quantity</label>
            <input type="number" id="adj-qty" class="form-control" min="1" value="10" required>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-adj">Cancel</button>
          <button class="btn btn-primary" id="btn-save-adj">Record Adjustment</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeActions = () => {
      document.body.removeChild(overlay);
    };

    document.getElementById("btn-close-adj").addEventListener("click", closeActions);
    document.getElementById("btn-cancel-adj").addEventListener("click", closeActions);

    document.getElementById("btn-save-adj").addEventListener("click", () => {
      const store = document.getElementById("adj-store").value;
      const mode = document.getElementById("adj-mode").value;
      const qty = parseInt(document.getElementById("adj-qty").value, 10);

      if (isNaN(qty) || qty <= 0) {
        showToast("Please specify a valid quantity greater than zero.", "warning");
        return;
      }

      const productsList = db.getProducts();
      const pr = productsList.find(item => item.sku === p.sku);
      if (pr) {
        const currentQty = pr.stock[store] || 0;
        let newQty = currentQty;

        if (mode === "add") {
          newQty = currentQty + qty;
        } else if (mode === "subtract") {
          newQty = Math.max(0, currentQty - qty);
        } else if (mode === "set") {
          newQty = qty;
        }

        pr.stock[store] = newQty;
        db.saveProduct(pr);
        
        // Log general expense adjustment if stock was manually written off
        if (mode === "subtract") {
          db.addExpense({
            id: `EXP-ADJ-${Date.now()}`,
            date: "2026-07-07",
            category: "Inventory Write-off",
            amount: qty * (pr.prices.import || 0),
            description: `Stock deduction write-off of ${qty} units of SKU ${p.sku} at store ${store}`
          });
        }

        showToast(`Stock levels adjusted for ${p.sku} at ${store} successfully.`, "success");
        closeActions();
        applyFilters();
        updateAlertsBadge();
      }
    });
  }
};
