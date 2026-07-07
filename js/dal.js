/**
 * KOKO Grocery ERP - Centralized Data Access Layer (DAL)
 * Wraps LocalStorage and handles data normalization, integer arithmetic, and preloads seed data.
 */

const DB_PREFIX = "koko_erp_";

const db = {
  // Generic LocalStorage read
  read(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(DB_PREFIX + key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from LocalStorage:`, e);
      return defaultValue;
    }
  },

  // Generic LocalStorage write
  write(key, data) {
    try {
      localStorage.setItem(DB_PREFIX + key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Error writing ${key} to LocalStorage:`, e);
      return false;
    }
  },

  // Initialize DB with seed data if empty
  init() {
    if (!localStorage.getItem(DB_PREFIX + "initialized_inr")) {
      console.log("Initializing database with Indian enterprise seed data...");
      
      this.write("suppliers", this.seedSuppliers());
      this.write("customers", this.seedCustomers());
      this.write("employees", this.seedEmployees());
      this.write("expenses", this.seedExpenses());
      this.write("shipments", this.seedShipments());
      this.write("products", this.seedProducts());
      this.write("purchase_orders", this.seedPurchaseOrders());
      this.write("sales", this.seedSales());
      
      // Settings
      this.write("settings", {
        taxStandard: 18,
        taxReduced: 5,
        loyaltyRatio: 100, // 1 point per 100 INR spent
        activeStore: "store1"
      });

      localStorage.setItem(DB_PREFIX + "initialized_inr", "true");
      console.log("Database initialized successfully!");
    }
  },

  // Seed Suppliers
  seedSuppliers() {
    return [
      { id: "SUP-001", name: "India Grain Exporters Ltd", phone: "+91 98765 43210", balance: 0 },
      { id: "SUP-002", name: "Mumbai Agro Wholesale", phone: "+91 22 1234 5678", balance: 120000 },
      { id: "SUP-003", name: "Darjeeling Tea Estates", phone: "+91 354 234 5678", balance: 0 }
    ];
  },

  // Seed Customers
  seedCustomers() {
    return [
      { id: "CUST-001", name: "Taj Mahal Restaurant", phone: "+91 90 1111 2222", loyaltyPoints: 2450, creditLimit: 500000, creditBalance: 125000 },
      { id: "CUST-002", name: "Imperial Palace Hotel Mumbai", phone: "+91 22 4444 5555", loyaltyPoints: 8900, creditLimit: 2000000, creditBalance: 450000 },
      { id: "CUST-003", name: "Ramesh Kumar (B2C)", phone: "+91 91234 56789", loyaltyPoints: 340, creditLimit: 0, creditBalance: 0 },
      { id: "CUST-004", name: "Priya Patel (B2C)", phone: "+91 98123 45678", loyaltyPoints: 120, creditLimit: 0, creditBalance: 0 }
    ];
  },

  // Seed Employees
  seedEmployees() {
    return [
      { id: "EMP-001", name: "Hiroshi Sato", role: "admin", attendance: [
        { date: "2026-07-06", clockIn: "08:45", clockOut: "18:15" },
        { date: "2026-07-07", clockIn: "08:50", clockOut: "" }
      ]},
      { id: "EMP-002", name: "Mami Takahashi", role: "manager", attendance: [
        { date: "2026-07-06", clockIn: "09:00", clockOut: "18:00" },
        { date: "2026-07-07", clockIn: "08:55", clockOut: "" }
      ]},
      { id: "EMP-003", name: "Takeshi Kurosawa", role: "cashier", attendance: [
        { date: "2026-07-06", clockIn: "09:50", clockOut: "19:00" },
        { date: "2026-07-07", clockIn: "09:45", clockOut: "" }
      ]}
    ];
  },

  // Seed Expenses
  seedExpenses() {
    return [
      { id: "EXP-001", date: "2026-07-01", category: "Rent", amount: 350000, description: "Store 1 Mumbai Monthly Rent" },
      { id: "EXP-002", date: "2026-07-03", category: "Utilities", amount: 48000, description: "Electricity & Gas Store 1" },
      { id: "EXP-003", date: "2026-07-05", category: "Packaging", amount: 25000, description: "Cardboard boxes & retail bags" },
      { id: "EXP-004", date: "2026-07-06", category: "Logistics", amount: 150000, description: "Customs agent clearance fee - Rice Shipment" }
    ];
  },

  // Seed Shipments
  seedShipments() {
    return [
      {
        id: "SH-001",
        name: "Shipment 1: Rice Import",
        origin: "India",
        status: "Delivered",
        items: [
          { sku: "RC-BASMATI", quantity: 1000, unitCost: 150 }
        ],
        clearanceCost: 150000,
        logisticsCost: 120000,
        packagingCost: 30000,
        landedCostTotal: 450000, // Total = (1000 * 150) + 150k + 120k + 30k = 450,000 JPY
        landedCostPerUnit: 450   // 450,000 / 1000 = 450 JPY per bag landed cost
      }
    ];
  },

  // Seed Products: 30 main SKUs + 400 bulk mock products
  seedProducts() {
    const products = [
      // KOKO IMPORT (30 SKUs)
      {
        sku: "RC-BASMATI",
        name: "Premium Basmati Rice (10kg)",
        category: "Rice & Grain",
        barcode: "8901234567890",
        batch: "BT-2026-R1",
        expiryDate: "2028-06-30",
        taxRate: 5,
        prices: { store1: 1200, store2: 1250, store3: 1250, online: 1400, restaurant: 950, hotel: 900, bulk: 850, import: 450 },
        stock: { warehouse: 500, store1: 250, store2: 150, store3: 100 },
        reorderPoint: 50
      },
      {
        sku: "RC-JASMINE",
        name: "Jasmine Fragrant Rice (5kg)",
        category: "Rice & Grain",
        barcode: "8851234567891",
        batch: "BT-2026-J2",
        expiryDate: "2027-12-31",
        taxRate: 5,
        prices: { store1: 850, store2: 890, store3: 890, online: 990, restaurant: 700, hotel: 680, bulk: 620, import: 300 },
        stock: { warehouse: 300, store1: 150, store2: 80, store3: 70 },
        reorderPoint: 40
      },
      {
        sku: "TEA-DARJEELING",
        name: "Darjeeling Premium Black Tea (250g)",
        category: "Beverages",
        barcode: "4901234567892",
        batch: "MT-2026-A1",
        expiryDate: "2027-05-15",
        taxRate: 5,
        prices: { store1: 1500, store2: 1500, store3: 1500, online: 1650, restaurant: 1200, hotel: 1100, bulk: 990, import: 600 },
        stock: { warehouse: 100, store1: 45, store2: 30, store3: 25 },
        reorderPoint: 15
      },
      {
        sku: "SP-TUMERIC",
        name: "Organic Tumeric Powder (500g)",
        category: "Spices & Condiments",
        barcode: "8901234567905",
        batch: "SP-2026-T1",
        expiryDate: "2028-03-20",
        taxRate: 5,
        prices: { store1: 450, store2: 480, store3: 480, online: 550, restaurant: 380, hotel: 350, bulk: 300, import: 150 },
        stock: { warehouse: 200, store1: 80, store2: 60, store3: 60 },
        reorderPoint: 30
      },
      {
        sku: "SP-CARDAMOM",
        name: "Green Cardamom Pods (250g)",
        category: "Spices & Condiments",
        barcode: "8901234567912",
        batch: "SP-2026-C1",
        expiryDate: "2028-04-10",
        taxRate: 5,
        prices: { store1: 1200, store2: 1250, store3: 1250, online: 1350, restaurant: 980, hotel: 920, bulk: 850, import: 400 },
        stock: { warehouse: 150, store1: 60, store2: 40, store3: 50 },
        reorderPoint: 20
      },
      {
        sku: "COCO-WATER",
        name: "Premium Organic Coconut Water (1L)",
        category: "Beverages",
        barcode: "4901234567929",
        batch: "SK-2026-S1",
        expiryDate: "",
        taxRate: 18, // Standard GST
        prices: { store1: 1800, store2: 1800, store3: 1850, online: 1980, restaurant: 1450, hotel: 1380, bulk: 1250, import: 750 },
        stock: { warehouse: 80, store1: 24, store2: 18, store3: 18 },
        reorderPoint: 10
      },
      {
        sku: "ATTA-NOODLES",
        name: "Atta Instant Noodles (Pack of 5)",
        category: "Processed Food",
        barcode: "4901234567936",
        batch: "RM-2026-R3",
        expiryDate: "2027-02-18",
        taxRate: 5,
        prices: { store1: 520, store2: 550, store3: 550, online: 600, restaurant: 420, hotel: 400, bulk: 380, import: 220 },
        stock: { warehouse: 400, store1: 120, store2: 90, store3: 90 },
        reorderPoint: 40
      },
      {
        sku: "ORG-SOY",
        name: "Premium Organic Soy Sauce (1L)",
        category: "Spices & Condiments",
        barcode: "4901234567943",
        batch: "SS-2026-S1",
        expiryDate: "2027-10-05",
        taxRate: 5,
        prices: { store1: 450, store2: 450, store3: 450, online: 490, restaurant: 360, hotel: 340, bulk: 310, import: 180 },
        stock: { warehouse: 250, store1: 90, store2: 70, store3: 90 },
        reorderPoint: 25
      },
      {
        sku: "COCO-OIL",
        name: "Cold Pressed Coconut Oil (500ml)",
        category: "Processed Food",
        barcode: "8901234567950",
        batch: "CO-2026-O1",
        expiryDate: "2028-01-20",
        taxRate: 5,
        prices: { store1: 750, store2: 780, store3: 780, online: 880, restaurant: 620, hotel: 590, bulk: 540, import: 250 },
        stock: { warehouse: 180, store1: 75, store2: 45, store3: 30 },
        reorderPoint: 20
      },
      {
        sku: "TOOR-DAL",
        name: "Premium Toor Dal (1kg)",
        category: "Processed Food",
        barcode: "4901234567967",
        batch: "MS-2026-M1",
        expiryDate: "2027-08-14",
        taxRate: 5,
        prices: { store1: 380, store2: 380, store3: 390, online: 430, restaurant: 300, hotel: 280, bulk: 260, import: 140 },
        stock: { warehouse: 160, store1: 65, store2: 40, store3: 45 },
        reorderPoint: 15
      }
    ];

    // Add 20 more distinct products manually to get up to 30 core high-quality SKUs
    const categories = ["Rice & Grain", "Beverages", "Spices & Condiments", "Processed Food", "Household"];
    const baseNames = [
      { name: "Ginger Garlic Paste (200g)", cat: "Spices & Condiments", tax: 5, import: 80, retail: 200, b2b: 150 },
      { name: "Jasmine Green Tea (25 Bags)", cat: "Beverages", tax: 5, import: 150, retail: 450, b2b: 320 },
      { name: "Soba Noodles (300g)", cat: "Processed Food", tax: 5, import: 90, retail: 280, b2b: 200 },
      { name: "Apple Cider Vinegar (500ml)", cat: "Spices & Condiments", tax: 18, import: 180, retail: 480, b2b: 360 },
      { name: "Roti Wrappers (10pcs)", cat: "Processed Food", tax: 5, import: 60, retail: 180, b2b: 130 },
      { name: "Sriracha Hot Chili Sauce (455ml)", cat: "Spices & Condiments", tax: 5, import: 220, retail: 680, b2b: 480 },
      { name: "Premium Garam Masala (100g)", cat: "Processed Food", tax: 5, import: 120, retail: 380, b2b: 270 },
      { name: "Tandoori Spice Paste (200g)", cat: "Processed Food", tax: 5, import: 160, retail: 490, b2b: 350 },
      { name: "Sesame Oil (150g)", cat: "Spices & Condiments", tax: 5, import: 110, retail: 320, b2b: 240 },
      { name: "Shichimi Togarashi Spice (15g)", cat: "Spices & Condiments", tax: 5, import: 90, retail: 250, b2b: 180 },
      { name: "Dishwashing Liquid Citrus (500ml)", cat: "Household", tax: 18, import: 100, retail: 290, b2b: 210 },
      { name: "Kitchen Paper Towels (4 Rolls)", cat: "Household", tax: 18, import: 120, retail: 350, b2b: 260 },
      { name: "Masala Chai Tea Bags (25pcs)", cat: "Beverages", tax: 5, import: 40, retail: 120, b2b: 85 },
      { name: "Barista Almond Milk (1L)", cat: "Beverages", tax: 5, import: 170, retail: 520, b2b: 380 },
      { name: "Panko Bread Crumbs (200g)", cat: "Processed Food", tax: 5, import: 70, retail: 220, b2b: 155 },
      { name: "Premium Red Chili Powder (500g)", cat: "Spices & Condiments", tax: 5, import: 190, retail: 580, b2b: 420 },
      { name: "Basmati Brown Rice (5kg)", cat: "Rice & Grain", tax: 5, import: 280, retail: 890, b2b: 650 },
      { name: "Black Rice Forbidden Grain (1kg)", cat: "Rice & Grain", tax: 5, import: 220, retail: 690, b2b: 490 },
      { name: "Shitake Mushrooms Dried (100g)", cat: "Processed Food", tax: 5, import: 210, retail: 680, b2b: 480 },
      { name: "Paneer Fresh Organic (200g)", cat: "Processed Food", tax: 5, import: 40, retail: 130, b2b: 95 }
    ];

    baseNames.forEach((item, index) => {
      const idx = index + 11;
      const code = item.name.toUpperCase().replace(/[^A-Z]/g, "").substring(0, 8) + "-" + idx;
      products.push({
        sku: code,
        name: item.name,
        category: item.cat,
        barcode: "490000000" + String(100 + idx),
        batch: "BT-2026-X" + idx,
        expiryDate: "2027-11-20",
        taxRate: item.tax,
        prices: {
          store1: item.retail,
          store2: Math.round(item.retail * 1.05),
          store3: Math.round(item.retail * 1.05),
          online: Math.round(item.retail * 1.15),
          restaurant: Math.round(item.b2b * 0.95),
          hotel: Math.round(item.b2b * 0.90),
          bulk: Math.round(item.b2b * 0.85),
          import: item.import
        },
        stock: {
          warehouse: 100 + (idx * 5),
          store1: 20 + idx,
          store2: 15 + idx,
          store3: 10 + idx
        },
        reorderPoint: 10
      });
    });

    // NOW GENERATE 400 MOCK SKUS (to test pagination & search virtualization)
    for (let i = 1; i <= 400; i++) {
      const skuCode = `MOCK-SKU-${String(i).padStart(3, '0')}`;
      const cat = categories[i % categories.length];
      const importPrice = 50 + (i * 2) % 400;
      const retailPrice = importPrice * 3;
      products.push({
        sku: skuCode,
        name: `General Enterprise SKU #${String(i).padStart(3, '0')} - Bulk Item`,
        category: cat,
        barcode: `990000000${String(i).padStart(3, '0')}`,
        batch: `B-MOCK-${i}`,
        expiryDate: "2028-12-31",
        taxRate: i % 10 === 0 ? 18 : 5, // 5% mostly, some 18%
        prices: {
          store1: retailPrice,
          store2: Math.round(retailPrice * 1.02),
          store3: Math.round(retailPrice * 1.02),
          online: Math.round(retailPrice * 1.12),
          restaurant: Math.round(retailPrice * 0.85),
          hotel: Math.round(retailPrice * 0.80),
          bulk: Math.round(retailPrice * 0.75),
          import: importPrice
        },
        stock: {
          warehouse: 50 + (i % 200),
          store1: 5 + (i % 30),
          store2: 3 + (i % 25),
          store3: 2 + (i % 20)
        },
        reorderPoint: 5
      });
    }

    return products;
  },

  // Seed Purchase Orders
  seedPurchaseOrders() {
    return [
      {
        id: "PO-0001",
        supplierId: "SUP-001",
        date: "2026-07-05",
        status: "Received",
        items: [
          { sku: "RC-BASMATI", quantity: 1000, unitCost: 150 }
        ],
        total: 150000
      },
      {
        id: "PO-0002",
        supplierId: "SUP-002",
        date: "2026-07-06",
        status: "Ordered",
        items: [
          { sku: "COCO-WATER", quantity: 50, unitCost: 750 },
          { sku: "TOOR-DAL", quantity: 100, unitCost: 140 }
        ],
        total: 51500
      }
    ];
  },

  // Seed Sales History
  seedSales() {
    return [
      {
        id: "INV-2026-0001",
        date: "2026-07-06T14:35:00Z",
        customerId: "CUST-003",
        channel: "store1",
        items: [
          { sku: "RC-BASMATI", quantity: 2, unitPrice: 1200, taxRate: 5, taxAmount: 114, total: 2400 },
          { sku: "COCO-WATER", quantity: 1, unitPrice: 1800, taxRate: 18, taxAmount: 275, total: 1800 }
        ],
        subtotal: 3811,
        discount: 0,
        tax: 389,
        total: 4200,
        paymentMethod: "cash",
        pointsEarned: 42,
        pointsRedeemed: 0
      },
      {
        id: "INV-2026-0002",
        date: "2026-07-06T18:10:00Z",
        customerId: "CUST-001",
        channel: "restaurant",
        items: [
          { sku: "RC-BASMATI", quantity: 100, unitPrice: 950, taxRate: 5, taxAmount: 4524, total: 95000 },
          { sku: "SP-TUMERIC", quantity: 20, unitPrice: 380, taxRate: 5, taxAmount: 362, total: 7600 }
        ],
        subtotal: 95000,
        discount: 5000, // Flat discount
        tax: 4886,
        total: 97600,
        paymentMethod: "credit",
        pointsEarned: 976,
        pointsRedeemed: 0
      },
      {
        id: "INV-2026-0003",
        date: "2026-07-07T10:15:00Z",
        customerId: "CUST-002",
        channel: "hotel",
        items: [
          { sku: "TEA-DARJEELING", quantity: 30, unitPrice: 1100, taxRate: 5, taxAmount: 1571, total: 33000 }
        ],
        subtotal: 31429,
        discount: 0,
        tax: 1571,
        total: 33000,
        paymentMethod: "square",
        pointsEarned: 330,
        pointsRedeemed: 0
      }
    ];
  },

  // Central Database Interface Methods

  // PRODUCTS
  getProducts() {
    return this.read("products");
  },
  saveProducts(list) {
    return this.write("products", list);
  },
  saveProduct(product) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.sku === product.sku);
    if (idx !== -1) {
      list[idx] = product;
    } else {
      list.push(product);
    }
    return this.saveProducts(list);
  },
  deleteProduct(sku) {
    const list = this.getProducts();
    const filtered = list.filter(p => p.sku !== sku);
    return this.saveProducts(filtered);
  },
  adjustStock(sku, storeId, amount) {
    const list = this.getProducts();
    const product = list.find(p => p.sku === sku);
    if (product) {
      if (!product.stock) product.stock = {};
      const current = product.stock[storeId] || 0;
      product.stock[storeId] = Math.max(0, current + amount);
      this.saveProduct(product);
      return true;
    }
    return false;
  },

  // SHIPMENTS
  getShipments() {
    return this.read("shipments");
  },
  saveShipment(shipment) {
    const list = this.getShipments();
    const idx = list.findIndex(s => s.id === shipment.id);
    if (idx !== -1) {
      list[idx] = shipment;
    } else {
      list.push(shipment);
    }
    this.write("shipments", list);
    
    // Auto-update base import price and receive stock in the Main Warehouse for item in shipment
    if (shipment.status === "Delivered") {
      shipment.items.forEach(item => {
        this.adjustStock(item.sku, "warehouse", item.quantity);
        // Set the landed cost as the import price in product pricing
        const products = this.getProducts();
        const p = products.find(p => p.sku === item.sku);
        if (p) {
          p.prices.import = shipment.landedCostPerUnit;
          this.saveProduct(p);
        }
      });
    }
    return true;
  },

  // SALES
  getSales() {
    return this.read("sales");
  },
  addSale(sale) {
    const sales = this.getSales();
    sales.push(sale);
    this.write("sales", sales);

    // 1. Deduct Stock from channel warehouse
    let storeId = sale.channel;
    if (["online", "restaurant", "hotel", "bulk"].includes(storeId)) {
      storeId = "warehouse"; // Online and B2B fulfilled from Main Warehouse
    }
    sale.items.forEach(item => {
      this.adjustStock(item.sku, storeId, -item.quantity);
    });

    // 2. Adjust Loyalty Points
    if (sale.customerId && sale.customerId !== "GUEST") {
      const customers = this.getCustomers();
      const customer = customers.find(c => c.id === sale.customerId);
      if (customer) {
        customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints + (sale.pointsEarned || 0) - (sale.pointsRedeemed || 0));
        
        // 3. Handle Credit account checkout balance adjustment
        if (sale.paymentMethod === "credit") {
          customer.creditBalance = (customer.creditBalance || 0) + sale.total;
        }
        this.saveCustomer(customer);
      }
    }
    return true;
  },

  // CUSTOMERS
  getCustomers() {
    return this.read("customers");
  },
  saveCustomer(customer) {
    const list = this.getCustomers();
    const idx = list.findIndex(c => c.id === customer.id);
    if (idx !== -1) {
      list[idx] = customer;
    } else {
      list.push(customer);
    }
    return this.write("customers", list);
  },
  adjustCustomerCredit(customerId, amount, description = "") {
    const list = this.getCustomers();
    const customer = list.find(c => c.id === customerId);
    if (customer) {
      customer.creditBalance = Math.max(0, (customer.creditBalance || 0) - amount); // subtracting paid amounts
      this.saveCustomer(customer);
      
      // record an offsetting expense adjustment/credit transaction if needed (optional log)
      return true;
    }
    return false;
  },

  // SUPPLIERS
  getSuppliers() {
    return this.read("suppliers");
  },
  saveSupplier(supplier) {
    const list = this.getSuppliers();
    const idx = list.findIndex(s => s.id === supplier.id);
    if (idx !== -1) {
      list[idx] = supplier;
    } else {
      list.push(supplier);
    }
    return this.write("suppliers", list);
  },

  // PURCHASE ORDERS
  getPurchaseOrders() {
    return this.read("purchase_orders");
  },
  savePurchaseOrder(po) {
    const list = this.getPurchaseOrders();
    const idx = list.findIndex(p => p.id === po.id);
    if (idx !== -1) {
      list[idx] = po;
    } else {
      list.push(po);
    }
    return this.write("purchase_orders", list);
  },
  receivePurchaseOrder(poId) {
    const list = this.getPurchaseOrders();
    const po = list.find(p => p.id === poId);
    if (po && po.status !== "Received") {
      po.status = "Received";
      this.savePurchaseOrder(po);
      
      // Add items stock to Warehouse
      po.items.forEach(item => {
        this.adjustStock(item.sku, "warehouse", item.quantity);
      });

      // Increase supplier outstanding balance
      const suppliers = this.getSuppliers();
      const sup = suppliers.find(s => s.id === po.supplierId);
      if (sup) {
        sup.balance = (sup.balance || 0) + po.total;
        this.saveSupplier(sup);
      }
      return true;
    }
    return false;
  },

  // EXPENSES
  getExpenses() {
    return this.read("expenses");
  },
  addExpense(expense) {
    const list = this.getExpenses();
    list.push(expense);
    return this.write("expenses", list);
  },

  // EMPLOYEES
  getEmployees() {
    return this.read("employees");
  },
  saveEmployee(emp) {
    const list = this.getEmployees();
    const idx = list.findIndex(e => e.id === emp.id);
    if (idx !== -1) {
      list[idx] = emp;
    } else {
      list.push(emp);
    }
    return this.write("employees", list);
  },

  // SETTINGS
  getSettings() {
    return this.read("settings", {
      taxStandard: 10,
      taxReduced: 8,
      loyaltyRatio: 100,
      activeStore: "store1"
    });
  },
  saveSettings(settings) {
    return this.write("settings", settings);
  }
};

// Initialize DB on script load
db.init();
window.db = db; // Export to global namespace
