/**
 * KOKO Grocery ERP - Sales & POS Billing View Controller
 * Builds the interactive cash register workspace. Handles barcode triggers,
 * channel pricing, tax computation, loyalty point redemptions, credit validation, and receipt prints.
 */

window.renderPOS = function(container) {
  let cart = [];
  let selectedCustomerId = "GUEST";
  let activeCategory = "ALL";
  let activePaymentMethod = "cash";
  let discountType = "percent"; // 'percent' or 'flat'
  let discountValue = 0;
  let pointsToRedeem = 0;

  // Initialize view
  renderPOSInterface();

  function renderPOSInterface() {
    const curChannel = window.getCurrentChannel();
    const customers = db.getCustomers();

    container.innerHTML = `
      <div class="pos-layout animate-fade-in">
        
        <!-- Left Side: Catalog Discovery -->
        <div class="pos-main-panel">
          
          <!-- POS search input (Barcode focused) -->
          <div class="filters-bar glass-panel" style="padding: 12px; margin-bottom: 0;">
            <div class="search-input-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" id="pos-barcode-input" class="form-control scan-focus" placeholder="Scan Barcode (Keyboard Input) or Search SKU / Name..." autofocus>
            </div>
            <div>
              <span id="scan-indicator" class="badge badge-success" style="padding: 6px 10px;">Scanner Focused</span>
            </div>
          </div>

          <!-- Category Navigation -->
          <div class="pos-categories" id="pos-cat-tabs">
            <!-- Tabs loaded via js -->
          </div>

          <!-- Products Grid -->
          <div class="pos-products-grid" id="pos-products-list">
            <!-- Product cards loaded via js -->
          </div>

        </div>

        <!-- Right Side: Invoice Receipt Cart -->
        <div class="pos-sidebar-panel glass-panel">
          <div class="pos-cart">
            
            <!-- Customer Selector -->
            <div style="border-bottom:1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
              <label style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">CUSTOMER ACCOUNT</label>
              <div style="display:flex; gap:8px; margin-top:4px;">
                <select id="pos-cust-select" style="flex-grow:1; padding: 6px;">
                  <option value="GUEST">Walk-in Guest</option>
                  ${customers.map(c => `<option value="${c.id}">${c.name} (${c.id.substring(5)})</option>`).join('')}
                </select>
              </div>
              <div id="pos-cust-info" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px; display:none;">
                <!-- loyalty points / credit balance display -->
              </div>
            </div>

            <!-- Cart Items list -->
            <div class="pos-cart-items" id="pos-cart-list">
              <!-- Rendered via JS -->
            </div>

            <!-- Discount & Loyalty Redemptions -->
            <div style="background-color:var(--bg-tertiary); padding:10px; border-radius:var(--border-radius-md); margin-bottom:12px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Apply Discount</label>
                <div style="display:flex; gap:4px;">
                  <button class="btn btn-secondary btn-sm" id="btn-disc-percent" style="padding:2px 8px; font-size:0.75rem;">%</button>
                  <button class="btn btn-secondary btn-sm" id="btn-disc-flat" style="padding:2px 8px; font-size:0.75rem;">₹</button>
                </div>
              </div>
              <input type="number" id="pos-discount-value" class="form-control" style="padding: 6px;" min="0" value="0">
              
              <!-- Points Redeem trigger -->
              <div id="pos-points-block" style="display:none; flex-direction:column; gap:4px; border-top: 1px solid var(--border-color); padding-top:6px;">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                  <span>Redeem Points (Max <span id="max-points-text">0</span>):</span>
                  <span>1 pt = ₹1</span>
                </div>
                <input type="number" id="pos-points-redeem" class="form-control" style="padding:6px;" min="0" value="0">
              </div>
            </div>

            <!-- Invoice Totals Summary -->
            <div class="pos-totals">
              <div class="pos-totals-row">
                <span>Subtotal:</span>
                <span id="pos-subtotal" style="font-family:var(--font-mono);">₹0</span>
              </div>
              <div class="pos-totals-row">
                <span>Discount:</span>
                <span id="pos-discount" style="color:var(--danger); font-family:var(--font-mono);">-₹0</span>
              </div>
              <div class="pos-totals-row">
                <span>GST Tax (18% standard):</span>
                <span id="pos-tax-10" style="font-family:var(--font-mono);">₹0</span>
              </div>
              <div class="pos-totals-row">
                <span>GST Tax (5% reduced):</span>
                <span id="pos-tax-8" style="font-family:var(--font-mono);">₹0</span>
              </div>
              <div class="pos-totals-row grand-total">
                <span>Total INR:</span>
                <span id="pos-grand-total" style="color:var(--primary); font-family:var(--font-mono);">₹0</span>
              </div>
            </div>

            <!-- Payment Methods -->
            <div class="payment-grid">
              <button class="payment-btn active" id="pay-cash" data-method="cash">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 18px; height:18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Cash INR
              </button>
              <button class="payment-btn" id="pay-credit" data-method="credit">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 18px; height:18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Store Credit
              </button>
              <button class="payment-btn" id="pay-square" data-method="square">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 18px; height:18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Square Terminal
              </button>
            </div>

            <!-- Checkout Action Button -->
            <button class="btn btn-primary" id="btn-pos-checkout" style="margin-top: 12px; padding: 14px; font-size:1rem; width:100%; box-shadow:var(--shadow-glow);">
              PROCESS SALES INVOICE (₹)
            </button>

          </div>
        </div>

      </div>
    `;

    // Bind Search Input & Scan Hook
    const searchInput = document.getElementById("pos-barcode-input");
    searchInput.addEventListener("input", performSearch);
    
    // Barcode keyboard interceptor (fast keyboard inputs)
    bindBarcodeScannerKeylogs(searchInput);

    // Render Categories & Products
    renderCategoryTabs();
    renderProductCards();

    // Bind Customer Changes
    const custSelect = document.getElementById("pos-cust-select");
    custSelect.addEventListener("change", (e) => {
      selectedCustomerId = e.target.value;
      updateCustomerLedgerPanel();
      recalcTotals();
    });
    updateCustomerLedgerPanel();

    // Discount values change bindings
    const discVal = document.getElementById("pos-discount-value");
    discVal.addEventListener("input", (e) => {
      discountValue = Math.max(0, parseFloat(e.target.value) || 0);
      recalcTotals();
    });

    const btnDiscPercent = document.getElementById("btn-disc-percent");
    const btnDiscFlat = document.getElementById("btn-disc-flat");
    
    btnDiscPercent.addEventListener("click", () => {
      discountType = "percent";
      btnDiscPercent.classList.add("btn-primary");
      btnDiscPercent.classList.remove("btn-secondary");
      btnDiscFlat.classList.add("btn-secondary");
      btnDiscFlat.classList.remove("btn-primary");
      recalcTotals();
    });
    btnDiscFlat.addEventListener("click", () => {
      discountType = "flat";
      btnDiscFlat.classList.add("btn-primary");
      btnDiscFlat.classList.remove("btn-secondary");
      btnDiscPercent.classList.add("btn-secondary");
      btnDiscPercent.classList.remove("btn-primary");
      recalcTotals();
    });
    btnDiscPercent.classList.add("btn-primary"); // default

    // Loyalty points redeemer value changes
    const pointsRedeemInput = document.getElementById("pos-points-redeem");
    pointsRedeemInput.addEventListener("input", (e) => {
      pointsToRedeem = Math.max(0, parseInt(e.target.value, 10) || 0);
      recalcTotals();
    });

    // Payment buttons trigger
    const payCash = document.getElementById("pay-cash");
    const payCredit = document.getElementById("pay-credit");
    const paySquare = document.getElementById("pay-square");

    const setPayment = (btn, method) => {
      [payCash, payCredit, paySquare].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activePaymentMethod = method;
    };

    payCash.addEventListener("click", () => setPayment(payCash, "cash"));
    payCredit.addEventListener("click", () => setPayment(payCredit, "credit"));
    paySquare.addEventListener("click", () => setPayment(paySquare, "square"));

    // Checkout trigger
    document.getElementById("btn-pos-checkout").addEventListener("click", handleCheckout);
  }

  // Barcode Listener Simulation: keyboard strokes are timed.
  // Commercial barcode scanners act as keyboard emulation, firing keys in 10-50ms sequences ending with "Enter".
  function bindBarcodeScannerKeylogs(inputEl) {
    let lastKeyTime = Date.now();
    let barcodeBuffer = "";

    inputEl.addEventListener("keydown", (e) => {
      const currentTime = Date.now();
      
      // If keystrokes are typing faster than 60ms, buffer them as scanned keys
      if (currentTime - lastKeyTime < 60) {
        if (e.key !== "Enter") {
          barcodeBuffer += e.key;
        }
      } else {
        // Reset buffer if delay is long (normal typing)
        barcodeBuffer = "";
      }
      
      lastKeyTime = currentTime;

      // When scanner finishes scan, it fires "Enter" key
      if (e.key === "Enter") {
        const val = inputEl.value.trim();
        
        // Check if scanned barcode exists in catalog
        const prods = db.getProducts();
        const match = prods.find(p => p.barcode === val || p.sku === val);
        
        if (match) {
          e.preventDefault();
          addToCart(match);
          playScanSound();
          inputEl.value = ""; // clear scan field
          barcodeBuffer = "";
          showToast(`Scanned: ${match.name}`, "success");
        }
      }
    });
  }

  function playScanSound() {
    try {
      // Create a simulated scanner audio beep using AudioContext (Vanilla JS, no assets needed!)
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.value = 1400; // high frequency scanner beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08); // 80ms duration
    } catch(e) {
      // AudioContext might be blocked until user gesture, skip silently
    }
  }

  // Dynamic selector display of loyalty point limits / credits outstanding
  function updateCustomerLedgerPanel() {
    const info = document.getElementById("pos-cust-info");
    const pointsBlock = document.getElementById("pos-points-block");
    const maxPointsText = document.getElementById("max-points-text");
    
    if (selectedCustomerId === "GUEST") {
      info.style.display = "none";
      pointsBlock.style.display = "none";
      pointsToRedeem = 0;
      return;
    }

    const customers = db.getCustomers();
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (customer) {
      info.style.display = "block";
      
      // Calculate and display B2B credit lines & loyalty accounts balances
      const balance = customer.creditBalance || 0;
      const limit = customer.creditLimit || 0;
      const creditLineHtml = limit > 0 ? 
        `<div style="margin-top:2px;">Credit line: <strong>${window.formatINR(balance)}</strong> / ${window.formatINR(limit)} limit</div>` :
        `<span style="color:var(--text-muted);">No credit lines configured (B2C)</span>`;

      info.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
          <span>Loyalty balance: <strong>${customer.loyaltyPoints} points</strong></span>
        </div>
        ${creditLineHtml}
      `;

      // Show redemption blocker
      if (customer.loyaltyPoints > 0) {
        pointsBlock.style.display = "flex";
        maxPointsText.textContent = customer.loyaltyPoints;
      } else {
        pointsBlock.style.display = "none";
        pointsToRedeem = 0;
      }
    }
  }

  // Categories render
  function renderCategoryTabs() {
    const tabs = document.getElementById("pos-cat-tabs");
    const categories = ["ALL", "Rice & Grain", "Spices & Condiments", "Processed Food", "Beverages", "Household"];
    
    tabs.innerHTML = categories.map(cat => `
      <button class="pos-category-tab ${activeCategory === cat ? 'active' : ''}" data-cat="${cat}">
        ${cat}
      </button>
    `).join('');

    tabs.querySelectorAll(".pos-category-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        activeCategory = tab.getAttribute("data-cat");
        renderCategoryTabs();
        renderProductCards();
      });
    });
  }

  // Products grid cards
  function renderProductCards(searchQuery = "") {
    const list = document.getElementById("pos-products-list");
    const products = db.getProducts();
    const store = window.getCurrentStore(); // active sales channel

    const filtered = products.filter(p => {
      // Filter out bulk mock list items to keep grid super fast to display
      if (p.sku.startsWith("MOCK") && searchQuery === "") return false;

      const matchesCat = activeCategory === "ALL" || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery) || 
                            p.sku.toLowerCase().includes(searchQuery) ||
                            (p.barcode && p.barcode.includes(searchQuery));
      return matchesCat && matchesSearch;
    });

    list.innerHTML = "";
    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">No products found in category.</div>`;
      return;
    }

    filtered.slice(0, 40).forEach(p => { // slice 40 items for speed, scroll to load more
      // Dynamic price selector check
      const currentPrice = p.prices[store] || p.prices.store1 || 0;
      const stockQty = p.stock[store] || 0;
      const isOut = stockQty <= 0;

      const card = document.createElement("div");
      card.className = `pos-product-card glass-panel ${isOut ? 'out-of-stock' : ''}`;
      card.innerHTML = `
        <div>
          <div class="pos-product-name">${p.name}</div>
          <div class="pos-product-sku">${p.sku}</div>
        </div>
        <div>
          <div class="pos-product-price">${window.formatINR(currentPrice)}</div>
          <div class="pos-product-stock">
            <span>Stock:</span>
            <span style="${isOut ? 'color:var(--danger); font-weight:700;' : ''}">${isOut ? 'OUT' : stockQty}</span>
          </div>
        </div>
      `;

      if (!isOut) {
        card.addEventListener("click", () => {
          addToCart(p);
        });
      }

      list.appendChild(card);
    });
  }

  function performSearch(e) {
    const q = e.target.value.toLowerCase().trim();
    renderProductCards(q);
  }

  // Add Item to cart
  function addToCart(product) {
    const store = window.getCurrentStore();
    const currentPrice = product.prices[store] || product.prices.store1 || 0;
    const stockQty = product.stock[store] || 0;

    // Check if item is already in cart
    const existing = cart.find(item => item.sku === product.sku);
    if (existing) {
      if (existing.quantity >= stockQty) {
        showToast(`Stock limit reached (${stockQty} max) for SKU ${product.sku}`, "warning");
        return;
      }
      existing.quantity++;
    } else {
      cart.push({
        sku: product.sku,
        name: product.name,
        quantity: 1,
        price: currentPrice,
        taxRate: product.taxRate || 5 // India GST default 5%
      });
    }

    recalcTotals();
    renderCartList();
  }

  function updateQty(sku, delta) {
    const item = cart.find(i => i.sku === sku);
    if (!item) return;

    const prod = db.getProducts().find(p => p.sku === sku);
    const store = window.getCurrentStore();
    const stockQty = prod ? (prod.stock[store] || 0) : 9999;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      cart = cart.filter(i => i.sku !== sku);
    } else {
      if (newQty > stockQty) {
        showToast(`Maximum store stock reached for SKU ${sku}`, "warning");
        return;
      }
      item.quantity = newQty;
    }
    recalcTotals();
    renderCartList();
  }

  function renderCartList() {
    const list = document.getElementById("pos-cart-list");
    list.innerHTML = "";

    if (cart.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:20px;">Cart is empty.</div>`;
      return;
    }

    cart.forEach(item => {
      list.innerHTML += `
        <div class="pos-cart-item">
          <div class="pos-item-info">
            <div class="pos-item-title" title="${item.name}">${item.name}</div>
            <div class="pos-item-meta">${window.formatINR(item.price)} | Tax ${item.taxRate}%</div>
          </div>
          <div class="pos-item-controls">
            <button class="pos-qty-btn" onclick="updateQtyPOS('${item.sku}', -1)">-</button>
            <span class="pos-item-qty">${item.quantity}</span>
            <button class="pos-qty-btn" onclick="updateQtyPOS('${item.sku}', 1)">+</button>
          </div>
          <div class="pos-item-price">${window.formatINR(item.price * item.quantity)}</div>
        </div>
      `;
    });
  }

  // Expose local click update method to global since cart template renders it inline
  window.updateQtyPOS = function(sku, delta) {
    updateQty(sku, delta);
  };

  // RE-CALCULATE CART TOTALS (strict JPY integers)
  let invoiceSubtotal = 0;
  let computedDiscount = 0;
  let taxStandardAmount = 0;
  let taxReducedAmount = 0;
  let invoiceGrandTotal = 0;
  let loyaltyPointsEarned = 0;

  function recalcTotals() {
    invoiceSubtotal = 0;
    taxStandardAmount = 0;
    taxReducedAmount = 0;

    cart.forEach(item => {
      const lineCost = item.price * item.quantity;
      invoiceSubtotal += lineCost;

      // Extract tax component per line
      const taxRate = item.taxRate / 100;
      const lineTax = Math.floor(lineCost * taxRate); // Round down to integer Rupee
      
      if (item.taxRate === 18) {
        taxStandardAmount += lineTax;
      } else {
        taxReducedAmount += lineTax;
      }
    });

    // 1. Calculate discount INR
    if (discountType === "percent") {
      computedDiscount = Math.floor(invoiceSubtotal * (discountValue / 100));
    } else {
      computedDiscount = Math.floor(discountValue);
    }
    computedDiscount = Math.min(computedDiscount, invoiceSubtotal);

    // Subtract discount proportionally from taxes (or just flat subtotal subtraction)
    const netBeforePoints = invoiceSubtotal - computedDiscount + taxStandardAmount + taxReducedAmount;
    
    // 2. Loyalty points deduction check
    let pointsApplied = 0;
    if (selectedCustomerId !== "GUEST") {
      const customers = db.getCustomers();
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        const maxRedeem = Math.min(customer.loyaltyPoints, netBeforePoints);
        if (pointsToRedeem > maxRedeem) {
          pointsToRedeem = maxRedeem;
          document.getElementById("pos-points-redeem").value = maxRedeem;
        }
        pointsApplied = pointsToRedeem;
      }
    }

    invoiceGrandTotal = Math.max(0, netBeforePoints - pointsApplied);
    
    // Loyalty accrued: 1 pt per 100 INR spent (after discounts/points)
    loyaltyPointsEarned = Math.floor(invoiceGrandTotal / 100);

    // Update UI elements
    document.getElementById("pos-subtotal").textContent = window.formatINR(invoiceSubtotal);
    document.getElementById("pos-discount").textContent = `-${window.formatINR(computedDiscount)}`;
    document.getElementById("pos-tax-10").textContent = window.formatINR(taxStandardAmount);
    document.getElementById("pos-tax-8").textContent = window.formatINR(taxReducedAmount);
    document.getElementById("pos-grand-total").textContent = window.formatINR(invoiceGrandTotal);
  }

  // CHECKOUT INVOICE FLOW
  function handleCheckout() {
    if (cart.length === 0) {
      showToast("Billing cart is empty. Please scan/select products.", "warning");
      return;
    }

    // 1. Validate Store Credit payment rules
    if (activePaymentMethod === "credit") {
      if (selectedCustomerId === "GUEST") {
        showToast("Error: Store Credit payment method is restricted to registered Customer Accounts only.", "danger");
        return;
      }

      const customers = db.getCustomers();
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        if ((customer.creditLimit || 0) === 0) {
          showToast(`Error: Customer does not have credit facilities.`, "danger");
          return;
        }
        if ((customer.creditBalance || 0) + invoiceGrandTotal > customer.creditLimit) {
          showToast(`CREDIT BLOCKED: Transaction exceeds customer credit limit (Outstanding ${window.formatINR(customer.creditBalance)} + Invoice ${window.formatINR(invoiceGrandTotal)} > Limit ${window.formatINR(customer.creditLimit)}).`, "danger");
          return;
        }
      }
    }

    // 2. If Square checkout, trigger terminal card reader UI
    if (activePaymentMethod === "square") {
      document.getElementById("square-screen-amount").textContent = window.formatINR(invoiceGrandTotal);
      document.getElementById("square-screen-status").textContent = "WAITING FOR CARD...";
      openModal("square-modal");

      // Bind Square Terminal click simulations
      document.getElementById("btn-square-simulate-tap").onclick = () => {
        closeModal("square-modal");
        completeSalesOrder();
      };
      
      document.getElementById("btn-square-simulate-decline").onclick = () => {
        closeModal("square-modal");
        showToast("Payment declined by Square reader.", "danger");
      };
      return;
    }

    // Cash and Credit pay settles instantly
    completeSalesOrder();
  }

  function completeSalesOrder() {
    const saleId = "INV-2026-" + String(db.getSales().length + 1).padStart(4, "0");
    const activeChannel = window.getCurrentChannel();
    
    // Construct Sale record
    const newSale = {
      id: saleId,
      date: new Date().toISOString(),
      customerId: selectedCustomerId,
      channel: activeChannel,
      items: cart.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        taxRate: item.taxRate,
        taxAmount: Math.floor(item.price * item.quantity * (item.taxRate / 100)),
        total: item.price * item.quantity
      })),
      subtotal: invoiceSubtotal,
      discount: computedDiscount,
      tax: taxStandardAmount + taxReducedAmount,
      total: invoiceGrandTotal,
      paymentMethod: activePaymentMethod,
      pointsEarned: loyaltyPointsEarned,
      pointsRedeemed: pointsToRedeem
    };

    // Save to database
    db.addSale(newSale);
    showToast(`Invoice ${saleId} checked out successfully!`, "success");

    // Open receipt modal automatically
    generateReceiptView(newSale);

    // Reset checkout states
    cart = [];
    discountValue = 0;
    pointsToRedeem = 0;
    
    // Refresh POS Panel view
    renderPOSInterface();
    updateAlertsBadge();
  }

  // RENDER PRINT THERMAL INVOICE
  function generateReceiptView(sale) {
    const customers = db.getCustomers();
    const customer = customers.find(c => c.id === sale.customerId);
    const channelName = document.getElementById("global-channel-select").options[document.getElementById("global-channel-select").selectedIndex].text;

    const receiptDiv = document.getElementById("receipt-content-area");
    receiptDiv.innerHTML = `
      <div class="receipt-paper animate-fade-in" style="background-color: var(--bg-secondary); border-radius: var(--border-radius-md); padding: 16px; border: 1px solid var(--border-color); color: var(--text-primary);">
        <div class="receipt-header" style="text-align: center; display: flex; flex-direction: column; align-items: center;">
          <img src="assets/logo.png" style="width: 55px; height: 55px; object-fit: contain; margin-bottom: 6px;" alt="Koko Stamp">
          <div class="receipt-store" style="font-family: var(--font-title); font-weight: 800; font-size: 1.25rem; color: var(--primary);">KOKO GROCERY</div>
          <div style="font-size:0.8rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600;">KOKO GROUPS - ${window.getCurrentCountry() === 'IN' ? 'MUMBAI BRANCH' : 'TOKYO BRANCH'}</div>
          <div class="receipt-meta" style="font-size:0.8rem; color: var(--text-secondary); width: 100%; text-align: left; background: var(--bg-tertiary); padding: 8px; border-radius: var(--border-radius-sm); margin-bottom: 12px; border: 1px solid var(--border-color);">
            Invoice: ${sale.id}<br/>
            Date: ${window.formatIndianDateTime(sale.date)}<br/>
            Channel: ${channelName}<br/>
            Operator: ${window.getCurrentRole().toUpperCase()}
          </div>
        </div>
        <div class="receipt-divider" style="border-top: 1px dashed var(--border-color); margin: 8px 0;"></div>
        <div class="receipt-items">
          ${sale.items.map(item => `
            <div class="receipt-item-row" style="display:flex; justify-content:space-between; font-size:0.9rem; font-weight:600;">
              <div>${item.sku} (x${item.quantity})</div>
              <div>${window.formatINR(item.total)}</div>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:6px;">
              ${window.formatINR(item.unitPrice)} / ea (Tax ${item.taxRate}%)
            </div>
          `).join('')}
        </div>
        <div class="receipt-divider" style="border-top: 1px dashed var(--border-color); margin: 8px 0;"></div>
        <div class="receipt-totals" style="display:flex; flex-direction:column; gap:4px; font-size:0.85rem;">
          <div class="receipt-totals-row" style="display:flex; justify-content:space-between;">
            <span>Subtotal:</span>
            <span>${window.formatINR(sale.subtotal)}</span>
          </div>
          <div class="receipt-totals-row" style="display:flex; justify-content:space-between; color:var(--danger);">
            <span>Discount:</span>
            <span>-${window.formatINR(sale.discount)}</span>
          </div>
          <div class="receipt-totals-row" style="display:flex; justify-content:space-between;">
            <span>Tax (${window.getCurrentCountry() === 'IN' ? 'GST' : 'Consumption Tax'}):</span>
            <span>${window.formatINR(sale.tax)}</span>
          </div>
          ${sale.pointsRedeemed > 0 ? `
            <div class="receipt-totals-row" style="color:blue;">
              <span>Points Redeemed:</span>
              <span>-${window.formatINR(sale.pointsRedeemed)}</span>
            </div>
          ` : ''}
          <div class="receipt-totals-row bold">
            <span>GRAND TOTAL:</span>
            <span>${window.formatINR(sale.total)}</span>
          </div>
        </div>
        <div class="receipt-divider"></div>
        <div style="font-size:0.75rem; line-height:1.3; margin-bottom: 8px;">
          Payment: ${sale.paymentMethod.toUpperCase()}<br/>
          Customer: ${customer ? customer.name : 'Walk-in Guest'}<br/>
          ${customer ? `Loyalty Points Earned: +${sale.pointsEarned} pts<br/>New Balance: ${customer.loyaltyPoints} pts` : ''}
        </div>
        
        <!-- WhatsApp API acknowledgement integration -->
        <div class="receipt-divider"></div>
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
          <a class="btn btn-success btn-sm" id="btn-wa-ack" style="text-decoration:none; color:white; font-size:0.75rem;">
            Send WhatsApp Invoice Ack
          </a>
        </div>

        <div class="receipt-footer">
          Thank you for shopping at Koko Grocery!<br/>
          Designed by Antigravity
        </div>
      </div>
    `;

    // Configure WhatsApp URL redirect
    const phone = customer ? customer.phone.replace(/[^0-9+]/g, "") : "+919000000000";
    const textMsg = encodeURIComponent(
      `*KOKO GROCERY ERP INVOICE ACK*\n\n` +
      `Invoice ID: *${sale.id}*\n` +
      `Date: ${window.formatIndianDateTime(sale.date)}\n` +
      `Grand Total: *${window.formatINR(sale.total)}*\n\n` +
      `Thank you for your purchase! ${customer ? `Your new loyalty points balance is *${customer.loyaltyPoints} pts*.` : ''}`
    );
    
    const waBtn = document.getElementById("btn-wa-ack");
    waBtn.href = `https://wa.me/${phone}?text=${textMsg}`;
    waBtn.target = "_blank";
    
    waBtn.addEventListener("click", () => {
      showToast("WhatsApp acknowledgment opened in new window.", "success");
    });

    // Bind Print Button
    document.getElementById("btn-print-receipt").onclick = () => {
      showToast("Simulating printer spooling... Receipt printed successfully.", "success");
      closeModal("receipt-modal");
    };

    openModal("receipt-modal");
  }
};
