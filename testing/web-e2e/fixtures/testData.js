export const testUsers = {
  owner: {
    email: 'admin@localshop.com',
    password: 'Password123!',
    role: 'Owner',
    storeName: 'Kirana Central'
  },
  manager: {
    email: 'manager@localshop.com',
    password: 'Password123!',
    role: 'Manager'
  },
  cashier: {
    email: 'cashier@localshop.com',
    password: 'Password123!',
    role: 'Cashier'
  },
  invalidUser: {
    email: 'unregistered.user@example.com',
    password: 'WrongPassword999!'
  }
};

export const testProducts = {
  dairyMilk: {
    name: 'A2 Organic Cow Milk 1L',
    category: 'Dairy',
    sku: 'DAIRY-A2-001',
    price: 68,
    cost: 54,
    reorderLevel: 10,
    quantity: 40,
    batch: 'BATCH-AUG-99',
    expiryDaysAhead: 3
  },
  bakeryBread: {
    name: 'Whole Wheat Sourdough Bread',
    category: 'Bakery',
    sku: 'BAKE-WHT-002',
    price: 55,
    cost: 38,
    reorderLevel: 8,
    quantity: 25,
    batch: 'BATCH-SEP-14',
    expiryDaysAhead: 2
  },
  stapleRice: {
    name: 'Basmati Classic Grain 5kg',
    category: 'Staples',
    sku: 'STAPLE-BAS-003',
    price: 420,
    cost: 350,
    reorderLevel: 5,
    quantity: 15,
    batch: 'BATCH-OCT-01',
    expiryDaysAhead: 180
  }
};

export const testCustomers = {
  rajesh: {
    name: 'Rajesh Sharma',
    phone: '9876543210',
    creditLimit: 5000,
    currentBalance: 1200
  },
  anita: {
    name: 'Anita Verma',
    phone: '9812345678',
    creditLimit: 3000,
    currentBalance: 450
  }
};

export default { testUsers, testProducts, testCustomers };
