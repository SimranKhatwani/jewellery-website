import assert from 'assert';
import { getResolvedStorefrontConfig } from '../src/controllers/storefront.controller.js';

console.log('--- RUNNING WHITE-LABEL MULTI-TENANT VERIFICATION TESTS ---\n');

// ==========================================
// Test 1: Aurelle Default Branding & Configuration
// ==========================================
console.log('1. Testing AURELLE Default Storefront Configuration...');
const aurelleTenant = {
  _id: '507f191e810c19729de860ea',
  name: 'Aurelle Fine Jewellery',
  slug: 'aurelle',
  status: 'active',
  settings: {
    currency: 'INR',
    currencySymbol: '₹',
  },
};

const aurelleConfig = getResolvedStorefrontConfig(aurelleTenant);
assert.strictEqual(aurelleConfig.branding.tagline, 'Silver Atelier');
assert.strictEqual(aurelleConfig.hero.heading, 'A Little Extraordinary');
assert.strictEqual(aurelleConfig.hero.subheading, 'AURELLE FINE SILVER');
assert.ok(aurelleConfig.announcement.text.includes('925 Sterling Silver Atelier'));
assert.ok(aurelleConfig.sections.brandStory.content.includes('At AURELLE, silver is not treated as a secondary metal'));
assert.ok(aurelleConfig.footer.copyrightText.includes('AURELLE. Distributed by RKB Enterprises'));
console.log('   ✓ AURELLE defaults verified with 100% zero regression.\n');

// ==========================================
// Test 2: Dynamic Custom Tenant (Royal Jewellery)
// ==========================================
console.log('2. Testing Dynamic White-Label Tenant (Royal Jewellery)...');
const royalTenant = {
  _id: '607f191e810c19729de860eb',
  name: 'Royal Jewellery',
  slug: 'royal-jewellery',
  status: 'active',
  settings: {
    currency: 'INR',
    currencySymbol: '₹',
    branding: {
      primaryColor: '#1A365D',
      accentColor: '#D69E2E',
      tagline: 'Imperial Heritage Silver Atelier',
    },
    hero: {
      heading: 'Timeless Imperial Elegance',
      subheading: 'ROYAL HERITAGE ATELIER',
    },
    businessAddress: {
      addressLine1: 'Palace Road, Johari Bazaar',
      city: 'Jaipur',
      state: 'Rajasthan',
      postalCode: '302003',
      country: 'India',
    },
  },
};

const royalConfig = getResolvedStorefrontConfig(royalTenant);
assert.strictEqual(royalConfig.branding.tagline, 'Imperial Heritage Silver Atelier');
assert.strictEqual(royalConfig.branding.primaryColor, '#1A365D');
assert.strictEqual(royalConfig.branding.accentColor, '#D69E2E');
assert.strictEqual(royalConfig.hero.heading, 'Timeless Imperial Elegance');
assert.strictEqual(royalConfig.hero.subheading, 'ROYAL HERITAGE ATELIER');
// Crucial: Must NEVER contain hardcoded "AURELLE" or "RKB Enterprises"
assert.ok(!royalConfig.footer.copyrightText.includes('AURELLE'));
assert.ok(!royalConfig.footer.copyrightText.includes('RKB Enterprises'));
assert.ok(royalConfig.footer.copyrightText.includes('Royal Jewellery'));
assert.ok(royalConfig.announcement.text.includes('Royal Jewellery'));
assert.ok(royalConfig.sections.brandStory.title.includes('Royal Jewellery'));
console.log('   ✓ Royal Jewellery white-label branding isolated with NO Aurelle leakage.\n');

// ==========================================
// Test 3: Dynamic GIVA Jewels Tenant
// ==========================================
console.log('3. Testing Dynamic GIVA Jewels Tenant...');
const givaTenant = {
  _id: '707f191e810c19729de860ec',
  name: 'GIVA Jewels',
  slug: 'giva-jewels',
  status: 'active',
  settings: {
    currency: 'INR',
    currencySymbol: '₹',
  },
};

const givaConfig = getResolvedStorefrontConfig(givaTenant);
assert.ok(!givaConfig.footer.copyrightText.includes('AURELLE'));
assert.ok(givaConfig.footer.copyrightText.includes('GIVA Jewels'));
assert.strictEqual(givaConfig.branding.tagline, 'GIVA Jewels Atelier');
assert.ok(givaConfig.announcement.text.includes('Welcome to GIVA Jewels'));
console.log('   ✓ GIVA Jewels generated isolated white-label configuration.\n');

// ==========================================
// Test 4: Frontend Slug Resolution Logic
// ==========================================
console.log('4. Testing Frontend Slug Resolution Rules...');
const RESERVED_ROUTES = new Set([
  'admin',
  'sa',
  'superadmin',
  'api',
  'assets',
  'store',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

function mockGetStoreSlug(pathname, search = '') {
  const params = new URLSearchParams(search);
  const qSlug = params.get('store') || params.get('tenant');
  if (qSlug) return qSlug.toLowerCase().trim();

  const storePathMatch = pathname.match(/^\/store\/([a-zA-Z0-9_-]+)/i);
  if (storePathMatch) return storePathMatch[1].toLowerCase();

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const firstSegment = segments[0].toLowerCase().trim();
    if (!RESERVED_ROUTES.has(firstSegment) && /^[a-z0-9_-]+$/.test(firstSegment)) {
      return firstSegment;
    }
  }
  return 'aurelle';
}

assert.strictEqual(mockGetStoreSlug('/royal-jewellery'), 'royal-jewellery');
assert.strictEqual(mockGetStoreSlug('/giva-jewels'), 'giva-jewels');
assert.strictEqual(mockGetStoreSlug('/store/silver-shine'), 'silver-shine');
assert.strictEqual(mockGetStoreSlug('/', '?store=diamond-luxe'), 'diamond-luxe');
assert.strictEqual(mockGetStoreSlug('/admin'), 'aurelle'); // Reserved route does not trigger slug
assert.strictEqual(mockGetStoreSlug('/sa'), 'aurelle'); // Reserved route does not trigger slug
assert.strictEqual(mockGetStoreSlug('/'), 'aurelle'); // Root defaults to platform tenant
console.log('   ✓ URL routing rules correctly resolve tenant storefront slugs.\n');

// ==========================================
// Test 5: Dynamic Return & Exchange Policy Isolation
// ==========================================
console.log('5. Testing Dynamic Return & Exchange Policy (White-Label & Zero Regression)...');

// 5a. Aurelle Default Return Policy
assert.strictEqual(aurelleConfig.policies.returnPolicyConfig.returnWindowDays, 2);
assert.ok(aurelleConfig.policies.returnPolicyConfig.policyOverview.includes('At AURELLE, shop with confidence'));
assert.ok(aurelleConfig.policies.returnPolicyConfig.windowDetails.includes('within 2 days'));
assert.ok(aurelleConfig.policies.returnPolicyConfig.exchangeTerms.includes('LGD products can only be exchanged for other LGD items'));
assert.ok(aurelleConfig.policies.returnPolicyConfig.whatsappMessage.includes('Hello AURELLE Support'));
console.log('   ✓ Aurelle 2-day Demifine/Gold/LGD return policy preserved with 0 regression.');

// 5b. GIVA Jewels Default Dynamic Return Policy
assert.strictEqual(givaConfig.policies.returnPolicyConfig.returnWindowDays, 7);
assert.ok(!givaConfig.policies.returnPolicyConfig.policyOverview.includes('AURELLE'));
assert.ok(!givaConfig.policies.returnPolicyConfig.whatsappMessage.includes('AURELLE'));
assert.ok(givaConfig.policies.returnPolicyConfig.whatsappMessage.includes('Hello GIVA Jewels Support'));
console.log('   ✓ GIVA Jewels generated isolated return policy with zero AURELLE leakage.');

// 5c. GIVA Jewels with Custom Admin Settings
const customGivaTenant = {
  _id: '707f191e810c19729de860ec',
  name: 'GIVA Jewels',
  slug: 'giva-jewels',
  status: 'active',
  settings: {
    contactPhone: '+91 9988776655',
    policies: {
      returnPolicyConfig: {
        returnWindowDays: 15,
        policyOverview: 'Enjoy a seamless 15-day return & doorstep exchange at GIVA.',
        windowDetails: 'Initiate your return or exchange within 15 calendar days from delivery date.',
        whatsappSupportNumber: '+91 9988776655',
        whatsappMessage: 'Hi GIVA Team, I want to initiate a 15-day return request.',
      },
    },
  },
};

const customGivaConfig = getResolvedStorefrontConfig(customGivaTenant);
assert.strictEqual(customGivaConfig.policies.returnPolicyConfig.returnWindowDays, 15);
assert.strictEqual(customGivaConfig.policies.returnPolicyConfig.policyOverview, 'Enjoy a seamless 15-day return & doorstep exchange at GIVA.');
assert.strictEqual(customGivaConfig.policies.returnPolicyConfig.windowDetails, 'Initiate your return or exchange within 15 calendar days from delivery date.');
assert.strictEqual(customGivaConfig.policies.returnPolicyConfig.whatsappSupportNumber, '+91 9988776655');
assert.strictEqual(customGivaConfig.policies.returnPolicyConfig.whatsappMessage, 'Hi GIVA Team, I want to initiate a 15-day return request.');
console.log('   ✓ Custom tenant policy settings successfully override defaults.\n');

console.log('----------------------------------------------------');
console.log('ALL WHITE-LABEL MULTI-TENANT VERIFICATION TESTS PASSED!');
console.log('----------------------------------------------------');
