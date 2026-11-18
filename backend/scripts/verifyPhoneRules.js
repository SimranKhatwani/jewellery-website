import { isValidPhoneNumber, normalizePhoneNumber, PHONE_REGEX } from '../src/utils/phone.js';
import mongoose from 'mongoose';
import { Address } from '../src/models/Address.js';
import { Customer } from '../src/models/Customer.js';
import { User } from '../src/models/User.js';
import { Order } from '../src/models/Order.js';
import { Tenant } from '../src/models/Tenant.js';

console.log('--- Testing Phone Utilities ---');

const testCases = [
  { input: '9876543210', expectedValid: true, expectedClean: '9876543210' },
  { input: '+91 98765 43210', expectedValid: true, expectedClean: '9876543210' },
  { input: '919876543210', expectedValid: true, expectedClean: '9876543210' },
  { input: '09876543210', expectedValid: true, expectedClean: '9876543210' },
  { input: '8123456789', expectedValid: true, expectedClean: '8123456789' },
  { input: '7000111222', expectedValid: true, expectedClean: '7000111222' },
  { input: '6300000000', expectedValid: true, expectedClean: '6300000000' },
  { input: '5555555555', expectedValid: false, reason: 'Starts with 5' },
  { input: '1234567890', expectedValid: false, reason: 'Starts with 1' },
  { input: '0123456789', expectedValid: false, reason: 'Leading 0 stripped gives 9 digits' },
  { input: '98765', expectedValid: false, reason: 'Less than 10 digits' },
  { input: '9876543210999', expectedValid: true, reason: 'Normalized slices first 10 digits if starting with 6-9' },
  { input: 'abcdefghij', expectedValid: false, reason: 'Non-numeric' },
  { input: '', expectedValid: false, reason: 'Empty string' },
];

let failedTests = 0;

for (const tc of testCases) {
  const clean = normalizePhoneNumber(tc.input);
  const valid = isValidPhoneNumber(tc.input);
  if (valid !== tc.expectedValid) {
    console.error(`FAILED test for input "${tc.input}": expected valid=${tc.expectedValid}, got ${valid}`);
    failedTests++;
  } else {
    console.log(`PASSED: "${tc.input}" -> clean="${clean}", valid=${valid}`);
  }
}

console.log('\n--- Testing Mongoose Schema Regex Rules ---');

const dummyId = new mongoose.Types.ObjectId();

// 1. Address Schema test
const validAddress = new Address({
  userId: dummyId,
  name: 'Test User',
  phone: '9876543210',
  addressLine1: '123 Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400001',
});
const errValidAddress = validAddress.validateSync();
if (errValidAddress) {
  console.error('Address valid phone failed validation:', errValidAddress.message);
  failedTests++;
} else {
  console.log('PASSED: Valid Address phone accepted');
}

const invalidAddress = new Address({
  userId: dummyId,
  name: 'Test User',
  phone: '1234567890',
  addressLine1: '123 Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400001',
});
const errInvalidAddress = invalidAddress.validateSync();
if (!errInvalidAddress || !errInvalidAddress.errors['phone']) {
  console.error('Address invalid phone (1234567890) was unexpectedly accepted!');
  failedTests++;
} else {
  console.log('PASSED: Invalid Address phone correctly rejected');
}

// 2. Customer Schema test
const validCustomer = new Customer({
  name: 'Test Customer',
  email: 'cust@test.com',
  phone: '8123456789',
});
const errValidCustomer = validCustomer.validateSync();
if (errValidCustomer) {
  console.error('Customer valid phone failed validation:', errValidCustomer.message);
  failedTests++;
} else {
  console.log('PASSED: Valid Customer phone accepted');
}

const invalidCustomer = new Customer({
  name: 'Test Customer',
  email: 'cust@test.com',
  phone: '5555555555',
});
const errInvalidCustomer = invalidCustomer.validateSync();
if (!errInvalidCustomer || !errInvalidCustomer.errors['phone']) {
  console.error('Customer invalid phone was unexpectedly accepted!');
  failedTests++;
} else {
  console.log('PASSED: Invalid Customer phone correctly rejected');
}

// 3. User Schema test
const validUser = new User({
  name: 'Test User',
  email: 'user@test.com',
  passwordHash: 'hash',
  phoneNumber: '7000111222',
});
const errValidUser = validUser.validateSync();
if (errValidUser) {
  console.error('User valid phone failed validation:', errValidUser.message);
  failedTests++;
} else {
  console.log('PASSED: Valid User phone accepted');
}

const invalidUser = new User({
  name: 'Test User',
  email: 'user@test.com',
  passwordHash: 'hash',
  phoneNumber: '4444444444',
});
const errInvalidUser = invalidUser.validateSync();
if (!errInvalidUser || !errInvalidUser.errors['phoneNumber']) {
  console.error('User invalid phone was unexpectedly accepted!');
  failedTests++;
} else {
  console.log('PASSED: Invalid User phone correctly rejected');
}

// 4. Order Schema test
const validOrder = new Order({
  orderNumber: 'AUR-TEST-001',
  tenantId: dummyId,
  paymentMethod: 'cod',
  customerInfo: {
    name: 'Order User',
    email: 'order@test.com',
    phone: '9876543210',
  },
  shippingAddress: {
    name: 'Order User',
    phone: '9876543210',
    addressLine1: 'Line 1',
    city: 'City',
    postalCode: '110001',
  },
  items: [
    {
      productId: dummyId,
      name: 'Item',
      sku: 'SKU1',
      unitPrice: 100,
      quantity: 1,
      itemSubtotal: 100,
    },
  ],
  pricing: {
    subtotal: 100,
    tax: 0,
    shippingFee: 0,
    discount: 0,
    totalPayable: 100,
  },
});
const errValidOrder = validOrder.validateSync();
if (errValidOrder) {
  console.error('Order valid phone failed validation:', errValidOrder.message);
  failedTests++;
} else {
  console.log('PASSED: Valid Order phone accepted');
}

const invalidOrder = new Order({
  orderNumber: 'AUR-TEST-002',
  customerInfo: {
    name: 'Order User',
    email: 'order@test.com',
    phone: '3333333333',
  },
  shippingAddress: {
    name: 'Order User',
    phone: '2222222222',
    addressLine1: 'Line 1',
    city: 'City',
    postalCode: '110001',
  },
  items: [
    {
      productId: dummyId,
      name: 'Item',
      sku: 'SKU1',
      price: 100,
      quantity: 1,
      subtotal: 100,
    },
  ],
  pricing: {
    subtotal: 100,
    tax: 0,
    shippingFee: 0,
    discount: 0,
    total: 100,
  },
});
const errInvalidOrder = invalidOrder.validateSync();
if (!errInvalidOrder) {
  console.error('Order invalid phone was unexpectedly accepted!');
  failedTests++;
} else {
  console.log('PASSED: Invalid Order phone correctly rejected');
}

console.log(`\nAll checks completed. Failed tests: ${failedTests}`);
if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
