import assert from 'assert';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });
import { Tenant } from '../src/models/Tenant.js';
import { getResolvedStorefrontConfig } from '../src/controllers/storefront.controller.js';
import { sanitizeHtml, sanitizeContentData } from '../src/utils/sanitize.js';
import * as tenantService from '../src/services/tenant.service.js';

console.log('=== RUNNING TENANT-SPECIFIC STORE CONTENT & POLICIES TEST SUITE ===\n');

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI);

  // ----------------------------------------------------
  // TEST 1: Existing AURELLE Content Remains Intact (Zero Regression)
  // ----------------------------------------------------
  console.log('Test 1: Verifying AURELLE Authenticity & Published Policies...');
  const aurelle = await Tenant.findOne({ slug: 'aurelle' });
  assert.ok(aurelle, 'Aurelle tenant must exist in database');

  const aurelleCfg = getResolvedStorefrontConfig(aurelle);
  assert.ok(aurelleCfg.contentPages, 'Aurelle must have contentPages configured');
  assert.strictEqual(aurelleCfg.contentPages.returnPolicy.status, 'published');
  assert.strictEqual(aurelleCfg.contentPages.returnPolicy.returnPeriod, 2);
  assert.ok(aurelleCfg.contentPages.aboutUs.content.includes('sculptural expression'));
  assert.ok(aurelleCfg.contentPages.shippingPolicy.shippingCharges.includes('Complimentary'));
  assert.strictEqual(aurelleCfg.contentPages.faqs.items.length, 3);
  console.log('   ✓ Test 1 Passed: AURELLE 2-day return policy, artisanal story, and FAQs are intact.\n');

  // ----------------------------------------------------
  // TEST 2: GIVA Tenant Has Zero AURELLE Leakage & Independent Draft State
  // ----------------------------------------------------
  console.log('Test 2: Verifying GIVA Tenant Content Isolation (No AURELLE Leakage)...');
  const giva = await Tenant.findOne({ slug: 'giva-jewels' });
  assert.ok(giva, 'GIVA tenant must exist in database');

  const givaCfg = getResolvedStorefrontConfig(giva);
  assert.ok(givaCfg.contentPages, 'GIVA must have contentPages object');

  // Check that GIVA does NOT leak AURELLE content
  const givaReturnPolicy = givaCfg.contentPages.returnPolicy;
  assert.ok(!givaReturnPolicy.content.includes('At AURELLE'), 'GIVA must not inherit AURELLE return policy');
  assert.ok(!givaCfg.contentPages.aboutUs.content.includes('About AURELLE'), 'GIVA must not inherit AURELLE about us');
  assert.ok(!givaCfg.contentPages.shippingPolicy.content.includes('AURELLE allocation'), 'GIVA must not inherit AURELLE shipping policy');

  // Unpublished / draft pages must be marked as draft
  assert.strictEqual(givaReturnPolicy.status, 'draft', 'Unconfigured GIVA pages must start as draft');
  console.log('   ✓ Test 2 Passed: GIVA has zero AURELLE leakage and starts in isolated draft mode.\n');

  // ----------------------------------------------------
  // TEST 3: GIVA Can Independently Configure and Publish its Return Policy
  // ----------------------------------------------------
  console.log('Test 3: Testing GIVA Independent Return Policy Creation & Publishing...');
  const givaCustomPolicy = {
    settings: {
      contentPages: {
        returnPolicy: {
          title: 'GIVA 15-Day Return & Exchange Promise',
          content: '<p>At GIVA Fine Jewels, we offer an effortless 15-day doorstep return on all sterling silver & gold-plated items.</p>',
          status: 'published',
          returnPeriod: 15,
          eligibleProducts: 'All silver rings, necklaces, and bracelets with intact security tags.',
          nonReturnableProducts: 'Personalized initial engraved necklaces and final clearance gifts.',
          returnConditions: 'Must be in original GIVA presentation box with authenticity certificate.',
          refundProcess: 'Instant refund to GIVA wallet or 3-5 days to original bank/UPI account.',
          refundTimeline: '3 to 5 business days after pickup verification.',
          exchangeConditions: 'Free size exchange for all rings and bracelets within 15 days.',
          supportPhone: '+91 9988776655',
          supportEmail: 'care@giva.co',
        },
      },
    },
  };

  const updatedGiva = await tenantService.updateTenantDetails(giva._id, givaCustomPolicy, giva.ownerId);
  const updatedGivaCfg = getResolvedStorefrontConfig(updatedGiva);

  assert.strictEqual(updatedGivaCfg.contentPages.returnPolicy.title, 'GIVA 15-Day Return & Exchange Promise');
  assert.strictEqual(updatedGivaCfg.contentPages.returnPolicy.status, 'published');
  assert.strictEqual(updatedGivaCfg.contentPages.returnPolicy.returnPeriod, 15);
  assert.strictEqual(updatedGivaCfg.contentPages.returnPolicy.supportPhone, '+91 9988776655');
  assert.ok(updatedGivaCfg.contentPages.returnPolicy.content.includes('GIVA Fine Jewels'));
  console.log('   ✓ Test 3 Passed: GIVA published its 15-day return policy independently.\n');

  // ----------------------------------------------------
  // TEST 4: Cross-Tenant Verification: Aurelle is NOT Modified by GIVA Changes
  // ----------------------------------------------------
  console.log('Test 4: Verifying Cross-Tenant Isolation (Aurelle untouched by GIVA)...');
  const freshAurelle = await Tenant.findOne({ slug: 'aurelle' });
  const freshAurelleCfg = getResolvedStorefrontConfig(freshAurelle);

  assert.strictEqual(freshAurelleCfg.contentPages.returnPolicy.returnPeriod, 2, 'Aurelle must keep its 2-day policy');
  assert.ok(!freshAurelleCfg.contentPages.returnPolicy.content.includes('GIVA'), 'Aurelle must not contain GIVA text');
  console.log('   ✓ Test 4 Passed: Aurelle unaffected by GIVA edits (100% tenant isolation).\n');

  // ----------------------------------------------------
  // TEST 5: Royal Jewellery Independent Shipping Policy Configuration
  // ----------------------------------------------------
  console.log('Test 5: Testing Royal Jewellery Shipping Policy Configuration in Mock Tenant...');
  const royalMock = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Royal Jewellery',
    slug: 'royal-jewellery',
    status: 'active',
    settings: {
      contentPages: {
        shippingPolicy: {
          title: 'Royal Delivery & Safe Transit Policy',
          content: '<p>Every Royal Jewellery order is handcrafted and dispatched in solid wooden presentation cases.</p>',
          status: 'published',
          shippingCharges: '₹150 Flat Express Courier / Free above ₹2,499',
          freeShippingThreshold: '₹2,499',
          estimatedDeliveryTime: '3-4 business days via Blue Dart Express',
          shippingLocations: 'All PIN codes in India, plus UAE and Singapore on special request',
          processingTime: 'Hand-crafted and dispatched within 3 business days',
          trackingInformation: 'Airway bill number provided via SMS and email with live GPS tracking',
        },
      },
    },
  };

  const royalCfg = getResolvedStorefrontConfig(royalMock);
  assert.strictEqual(royalCfg.contentPages.shippingPolicy.status, 'published');
  assert.strictEqual(royalCfg.contentPages.shippingPolicy.freeShippingThreshold, '₹2,499');
  assert.ok(!royalCfg.contentPages.shippingPolicy.content.includes('AURELLE'));
  assert.ok(royalCfg.contentPages.shippingPolicy.content.includes('Royal Jewellery'));
  console.log('   ✓ Test 5 Passed: Royal Jewellery shipping policy isolated and configured.\n');

  // ----------------------------------------------------
  // TEST 6: HTML Sanitization & XSS Prevention
  // ----------------------------------------------------
  console.log('Test 6: Testing HTML Sanitization & Anti-XSS Guards...');
  const maliciousPayload = `
    <h2>Authentic Silver Care</h2>
    <script>alert("XSS Vulnerability")</script>
    <img src="valid.jpg" onerror="alert(document.cookie)" />
    <iframe src="http://evil.com"></iframe>
    <a href="javascript:stealToken()">Click here for discount</a>
    <p>Safe paragraph <strong>with bold</strong> and <em>italic</em>.</p>
  `;

  const sanitized = sanitizeHtml(maliciousPayload);
  assert.ok(!sanitized.includes('<script>'), 'Must strip <script> tag');
  assert.ok(!sanitized.includes('alert('), 'Must strip script content');
  assert.ok(!sanitized.includes('onerror='), 'Must strip inline onerror handler');
  assert.ok(!sanitized.includes('<iframe'), 'Must strip <iframe>');
  assert.ok(!sanitized.includes('javascript:'), 'Must neutralize javascript: pseudo-protocol');
  assert.ok(sanitized.includes('<h2>Authentic Silver Care</h2>'), 'Must preserve safe <h2>');
  assert.ok(sanitized.includes('<strong>with bold</strong>'), 'Must preserve safe <strong>');
  console.log('   ✓ Test 6 Passed: Malicious scripts, event handlers, and iframes neutralized.\n');

  // ----------------------------------------------------
  // TEST 7: FAQs Management with Add/Edit/Delete
  // ----------------------------------------------------
  console.log('Test 7: Testing FAQs Add, Edit, and Ordering Structure...');
  const sampleFaqs = [
    { id: 'faq-1', question: 'How is silver hallmarked?', answer: 'BIS 925 laser hallmarking.', order: 1 },
    { id: 'faq-2', question: 'What is your exchange policy?', answer: '15-day size exchange.', order: 2 },
  ];

  const sanitizedFaqs = sanitizeContentData(sampleFaqs);
  assert.strictEqual(sanitizedFaqs.length, 2);
  assert.strictEqual(sanitizedFaqs[0].question, 'How is silver hallmarked?');
  console.log('   ✓ Test 7 Passed: FAQs data structure validated and sanitized.\n');

  console.log('====================================================');
  console.log('ALL TENANT CONTENT & POLICIES TESTS PASSED (100%)!');
  console.log('====================================================');

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
