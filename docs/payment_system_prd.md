# Payment System PRD: Firebase + Stripe Integration

| Version | 1.0 |
| :--- | :--- |
| **Status** | Draft |
| **Created** | 2024 |
| **Integration** | Firebase Functions + Stripe |
| **Reference** | [Firebase Stripe Tutorial](https://firebase.google.com/docs/tutorials/payments-stripe) |

---

## 1. Executive Summary

This PRD defines the implementation of a payment system for the YouTube Batch Summary Service using **Firebase Cloud Functions** and **Stripe** as the payment processor. The system enables users to:

- Subscribe to paid tiers (Starter, Pro, Premium) with monthly or annual billing
- Purchase one-time credit packs
- Enable auto-recharge for credits
- Manage payment methods securely
- View payment history and invoices

**Key Principles:**
- **Security First:** All payment processing happens server-side via Firebase Functions
- **PCI Compliance:** Stripe handles all sensitive payment data (no card data stored)
- **Real-time Updates:** Firestore listeners provide instant UI updates
- **Reliability:** Webhook-based event handling ensures payment state consistency
- **User Experience:** Seamless checkout flow with clear pricing and confirmation

---

## 2. Architecture Overview

### 2.1 System Components

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
│                 │
│  - Stripe       │
│    Elements     │
│  - Payment UI   │
│  - Subscription │
│    Management   │
└────────┬────────┘
         │ HTTPS
         │
┌────────▼─────────────────────────────────────┐
│   Firebase Cloud Functions                    │
│                                               │
│  - createCheckoutSession()                    │
│  - createSubscription()                       │
│  - cancelSubscription()                       │
│  - purchaseCredits()                          │
│  - setupAutoRecharge()                        │
│  - handleStripeWebhook()                      │
└────────┬──────────────────────────────────────┘
         │
         │ API Calls
         │
┌────────▼────────┐         ┌──────────────────┐
│     Stripe      │◄────────┤  Stripe Webhooks  │
│                 │         │  (Event Handler)  │
│  - Customers    │         └──────────────────┘
│  - Subscriptions│
│  - Payments     │
│  - Webhooks     │
└─────────────────┘
         │
         │ Updates
         │
┌────────▼────────┐
│   Firestore     │
│                 │
│  - subscriptions│
│  - payments     │
│  - user_credits │
│  - transactions │
└─────────────────┘
```

### 2.2 Technology Stack

**Backend:**
- Firebase Cloud Functions (Node.js/TypeScript)
- Stripe Node.js SDK (`stripe`)
- Firebase Admin SDK (`firebase-admin`)
- Firestore for data persistence

**Frontend:**
- Next.js (React)
- Stripe.js (`@stripe/stripe-js`)
- Stripe Elements (`@stripe/react-stripe-js`)
- Firebase SDK for Firestore listeners

**Payment Processing:**
- Stripe Checkout (for subscriptions)
- Stripe Payment Intents (for one-time purchases)
- Stripe Customer Portal (for subscription management)

---

## 3. Centralized Pricing Configuration

### 3.1 Overview

**Critical Requirement:** All pricing configurations must be centralized in a single source of truth that both backend and frontend can access. This enables:
- **Quick Updates:** Change pricing without code deployment
- **Consistency:** Backend and frontend always use the same prices
- **A/B Testing:** Easily test different pricing strategies
- **Regional Pricing:** Support different prices by region (future)

### 3.2 Implementation: Firestore Pricing Collection

**Storage:** Firestore collection `pricing_config`

**Document Structure:**
```typescript
{
  id: 'current', // Single document with ID 'current'
  version: number; // Increment on each update
  lastUpdated: Timestamp;
  lastUpdatedBy: string; // Admin user ID
  
  // Subscription Pricing
  subscriptions: {
    starter: {
      monthly: {
        priceId: string; // Stripe Price ID
        amount: number; // in cents (499 = $4.99)
        credits: number; // 500
        features: string[]; // Feature list
      };
      annual: {
        priceId: string;
        amount: number; // in cents (4790 = $47.90)
        credits: number; // 500 (same as monthly)
        discountPercent: number; // 20
        features: string[]; // Same as monthly
      };
    };
    pro: {
      monthly: {
        priceId: string;
        amount: number; // 1499
        credits: number; // 2000
        features: string[];
      };
      annual: {
        priceId: string;
        amount: number; // 14390
        credits: number; // 2000
        discountPercent: number; // 20
        features: string[];
      };
    };
    premium: {
      monthly: {
        priceId: string;
        amount: number; // 2999
        credits: number; // 5000
        features: string[];
      };
      annual: {
        priceId: string;
        amount: number; // 28790
        credits: number; // 5000
        discountPercent: number; // 20
        features: string[];
      };
    };
  };
  
  // Credit Pack Pricing
  creditPacks: {
    small: {
      priceId: string; // Stripe Price ID
      amount: number; // in cents (499 = $4.99)
      credits: number; // 500
      pricePerCredit: number; // 0.00998 (calculated)
    };
    medium: {
      priceId: string;
      amount: number; // 999
      credits: number; // 1200
      pricePerCredit: number; // 0.00833
    };
    large: {
      priceId: string;
      amount: number; // 1999
      credits: number; // 2500
      pricePerCredit: number; // 0.00800
    };
    mega: {
      priceId: string;
      amount: number; // 3999
      credits: number; // 5500
      pricePerCredit: number; // 0.00727
    };
  };
  
  // Free Tier Configuration
  freeTier: {
    monthlyCredits: number; // 120
    dailyCredits: number; // 40
    maxBatchesPerDay: number; // 3
    maxVideosPerBatch: number; // 3
    features: string[];
  };
  
  // Credit Consumption Rates (for batch pricing calculation)
  creditRates: {
    transcriptPerVideo: number; // 10 credits
    aiInputPer1kTokens: number; // 0.1 credits
    aiOutputPer1kTokens: {
      free: number; // 0.3 credits
      premium: number; // 0.6 credits
    };
    preCondenseInputPer1kTokens: number; // 0.1 credits
    preCondenseOutputPer1kTokens: number; // 0.5 credits
  };
  
  // Batch Pricing (simplified flat rates)
  batchPricing: {
    '1': number; // 20 credits
    '2': number; // 30 credits
    '3': number; // 40 credits
    '4-5': number; // 60 credits
    '6-10': number; // 120 credits
  };
}
```

### 3.3 Backend Pricing Service

**File:** `backend/src/services/pricing.service.ts`

**Purpose:** Centralized service to fetch and cache pricing configuration

```typescript
import { db } from '../config/database';
import { doc, getDoc } from 'firebase-admin/firestore';

interface PricingConfig {
  // ... (matches Firestore structure above)
}

let cachedPricing: PricingConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get current pricing configuration
 * Uses in-memory cache with 5-minute TTL
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (cachedPricing && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedPricing;
  }
  
  // Fetch from Firestore
  const docRef = doc(db, 'pricing_config', 'current');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Pricing configuration not found');
  }
  
  cachedPricing = docSnap.data() as PricingConfig;
  cacheTimestamp = now;
  
  return cachedPricing;
}

/**
 * Get subscription price for tier and period
 */
export async function getSubscriptionPrice(
  tier: 'starter' | 'pro' | 'premium',
  period: 'monthly' | 'annual'
): Promise<{ priceId: string; amount: number; credits: number }> {
  const config = await getPricingConfig();
  return config.subscriptions[tier][period];
}

/**
 * Get credit pack pricing
 */
export async function getCreditPackPrice(
  packId: 'small' | 'medium' | 'large' | 'mega'
): Promise<{ priceId: string; amount: number; credits: number }> {
  const config = await getPricingConfig();
  return config.creditPacks[packId];
}

/**
 * Get batch pricing for video count
 */
export async function getBatchPrice(videoCount: number): Promise<number> {
  const config = await getPricingConfig();
  
  if (videoCount === 1) return config.batchPricing['1'];
  if (videoCount === 2) return config.batchPricing['2'];
  if (videoCount === 3) return config.batchPricing['3'];
  if (videoCount >= 4 && videoCount <= 5) return config.batchPricing['4-5'];
  if (videoCount >= 6 && videoCount <= 10) return config.batchPricing['6-10'];
  
  throw new Error(`Invalid video count: ${videoCount}`);
}

/**
 * Invalidate cache (call after pricing updates)
 */
export function invalidatePricingCache(): void {
  cachedPricing = null;
  cacheTimestamp = 0;
}
```

### 3.4 Frontend Pricing Hook

**File:** `frontend/src/hooks/usePricing.ts`

**Purpose:** React hook to fetch and cache pricing configuration

```typescript
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PricingConfig {
  // ... (matches Firestore structure)
}

let cachedPricing: PricingConfig | null = null;
let cacheListeners: Set<(config: PricingConfig) => void> = new Set();

/**
 * React hook to get pricing configuration
 * Uses Firestore real-time listener for instant updates
 */
export function usePricing() {
  const [pricing, setPricing] = useState<PricingConfig | null>(cachedPricing);
  const [loading, setLoading] = useState(!cachedPricing);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Add listener
    const updateListener = (config: PricingConfig) => {
      setPricing(config);
      setLoading(false);
      setError(null);
    };
    cacheListeners.add(updateListener);

    // Set initial value if cached
    if (cachedPricing) {
      updateListener(cachedPricing);
    }

    // Set up Firestore listener
    const unsubscribe = onSnapshot(
      doc(db, 'pricing_config', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          const config = snapshot.data() as PricingConfig;
          cachedPricing = config;
          // Notify all listeners
          cacheListeners.forEach(listener => listener(config));
        } else {
          setError(new Error('Pricing configuration not found'));
          setLoading(false);
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      cacheListeners.delete(updateListener);
      unsubscribe();
    };
  }, []);

  return { pricing, loading, error };
}

/**
 * Helper hook for subscription prices
 */
export function useSubscriptionPrice(
  tier: 'starter' | 'pro' | 'premium',
  period: 'monthly' | 'annual'
) {
  const { pricing, loading, error } = usePricing();

  return {
    price: pricing?.subscriptions[tier]?.[period],
    loading,
    error,
  };
}

/**
 * Helper hook for credit packs
 */
export function useCreditPacks() {
  const { pricing, loading, error } = usePricing();

  return {
    packs: pricing?.creditPacks,
    loading,
    error,
  };
}
```

### 3.5 API Endpoint for Pricing

**File:** `backend/src/routes/pricing.routes.ts`

**Purpose:** Expose pricing configuration via REST API (alternative to Firestore)

```typescript
import { Router } from 'express';
import { getPricingConfig } from '../services/pricing.service';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/pricing
 * Returns current pricing configuration
 * Public endpoint (no auth required for pricing display)
 */
router.get('/', async (req, res) => {
  try {
    const pricing = await getPricingConfig();
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});

export default router;
```

**Frontend Usage:**
```typescript
// Alternative to Firestore listener
const response = await fetch('/api/pricing');
const pricing = await response.json();
```

### 3.6 Admin Interface for Pricing Updates

**File:** `frontend/src/app/admin/pricing/page.tsx` (Admin Only)

**Purpose:** Admin UI to update pricing configuration

**Features:**
- Form to edit all pricing values
- Validation before saving
- Preview of changes
- Version tracking
- Audit log of changes

**Implementation:**
```typescript
// Admin can update pricing via Firestore admin SDK
// or through a secure admin API endpoint
```

### 3.7 Initial Pricing Data Setup

**File:** `backend/scripts/init-pricing-config.ts`

**Purpose:** Script to initialize pricing configuration in Firestore

```typescript
import { db } from '../src/config/database';
import { doc, setDoc } from 'firebase-admin/firestore';

const initialPricing = {
  version: 1,
  lastUpdated: new Date(),
  lastUpdatedBy: 'system',
  subscriptions: {
    starter: {
      monthly: {
        priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
        amount: 499,
        credits: 500,
        features: ['10 batches/day', '5 videos/batch', 'qwen-plus', '90 days history'],
      },
      annual: {
        priceId: process.env.STRIPE_PRICE_STARTER_ANNUAL!,
        amount: 4790,
        credits: 500,
        discountPercent: 20,
        features: ['10 batches/day', '5 videos/batch', 'qwen-plus', '90 days history'],
      },
    },
    // ... (pro, premium)
  },
  creditPacks: {
    small: { priceId: '...', amount: 499, credits: 500, pricePerCredit: 0.00998 },
    medium: { priceId: '...', amount: 999, credits: 1200, pricePerCredit: 0.00833 },
    large: { priceId: '...', amount: 1999, credits: 2500, pricePerCredit: 0.00800 },
    mega: { priceId: '...', amount: 3999, credits: 5500, pricePerCredit: 0.00727 },
  },
  // ... (rest of config)
};

async function initPricing() {
  await setDoc(doc(db, 'pricing_config', 'current'), initialPricing);
  console.log('Pricing configuration initialized');
}
```

### 3.8 Migration from Hardcoded Configs

**Steps:**
1. Create `pricing_config` collection in Firestore
2. Run initialization script with current prices
3. Update backend services to use `pricing.service.ts`
4. Update frontend components to use `usePricing()` hook
5. Remove hardcoded pricing constants
6. Test pricing updates via Firestore

### 3.9 Benefits of Centralized Pricing

1. **No Code Deployment:** Update prices instantly via Firestore
2. **Consistency:** Single source of truth prevents mismatches
3. **Real-time Updates:** Frontend automatically reflects changes
4. **Version Control:** Track pricing history via version field
5. **A/B Testing:** Easy to test different prices
6. **Regional Pricing:** Can extend to support multiple regions
7. **Audit Trail:** Track who changed prices and when

### 3.10 Security Rules

**File:** `firestore.rules`

```javascript
match /pricing_config/{document} {
  // Everyone can read pricing (needed for public pricing page)
  allow read: if true;
  
  // Only admins can write
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

---

## 4. Backend Implementation

### 3.1 Firebase Functions Setup

#### 3.1.1 Project Configuration

**File:** `backend/functions/package.json`

```json
{
  "name": "payment-functions",
  "version": "1.0.0",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0",
    "stripe": "^14.0.0",
    "express": "^4.18.0",
    "cors": "^2.8.5"
  }
}
```

**File:** `backend/functions/src/index.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

admin.initializeApp();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

// Export all payment functions
export { createCheckoutSession } from './payments/createCheckoutSession';
export { createSubscription } from './payments/createSubscription';
export { cancelSubscription } from './payments/cancelSubscription';
export { purchaseCredits } from './payments/purchaseCredits';
export { setupAutoRecharge } from './payments/setupAutoRecharge';
export { handleStripeWebhook } from './webhooks/stripeWebhook';
```

#### 3.1.2 Environment Variables

**File:** `.env` (Firebase Functions)

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FIREBASE_PROJECT_ID=your-project-id
```

**Configuration via Firebase CLI:**
```bash
firebase functions:config:set stripe.secret="sk_test_..."
firebase functions:config:set stripe.publishable="pk_test_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
```

### 3.2 Payment Functions

#### 3.2.1 Create Checkout Session (Subscriptions)

**File:** `backend/functions/src/payments/createCheckoutSession.ts`

**Purpose:** Create a Stripe Checkout session for subscription purchases

**Endpoint:** `POST /api/payments/create-checkout-session`

**Request Body:**
```typescript
{
  userId: string;
  tier: 'starter' | 'pro' | 'premium';
  billingPeriod: 'monthly' | 'annual';
  successUrl: string; // Frontend success page
  cancelUrl: string;  // Frontend cancel page
}
```

**Response:**
```typescript
{
  sessionId: string;
  url: string; // Stripe Checkout URL
}
```

**Implementation Logic:**
1. Verify user authentication
2. Get tier pricing from `pricing.service.getSubscriptionPrice(tier, billingPeriod)`
3. Create Stripe Customer (if doesn't exist)
4. Create Stripe Checkout Session with:
   - Price ID for selected tier/period
   - Customer ID
   - Metadata: `userId`, `tier`, `billingPeriod`
   - Success/Cancel URLs
5. Store session ID in Firestore `checkout_sessions` collection
6. Return session URL to frontend

**Firestore Document:**
```typescript
{
  sessionId: string;
  userId: string;
  tier: string;
  billingPeriod: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
```

#### 3.2.2 Create Subscription (Direct API)

**File:** `backend/functions/src/payments/createSubscription.ts`

**Purpose:** Create subscription directly via API (alternative to Checkout)

**Endpoint:** `POST /api/payments/create-subscription`

**Request Body:**
```typescript
{
  userId: string;
  tier: 'starter' | 'pro' | 'premium';
  billingPeriod: 'monthly' | 'annual';
  paymentMethodId: string; // From Stripe Elements
}
```

**Response:**
```typescript
{
  subscriptionId: string;
  status: string;
  currentPeriodEnd: string;
}
```

**Implementation Logic:**
1. Verify user authentication
2. Get or create Stripe Customer
3. Attach payment method to customer
4. Create Stripe Subscription with:
   - Price ID for tier/period
   - Customer ID
   - Payment method
   - Metadata: `userId`, `tier`
5. Update Firestore `subscriptions` collection
6. Add credits to user via credit service
7. Create transaction record

#### 3.2.3 Cancel Subscription

**File:** `backend/functions/src/payments/cancelSubscription.ts`

**Purpose:** Cancel or pause user subscription

**Endpoint:** `POST /api/payments/cancel-subscription`

**Request Body:**
```typescript
{
  userId: string;
  subscriptionId: string;
  cancelImmediately?: boolean; // true = cancel now, false = cancel at period end
}
```

**Response:**
```typescript
{
  subscriptionId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
}
```

**Implementation Logic:**
1. Verify user owns subscription
2. Get Stripe Subscription
3. If `cancelImmediately`:
   - Cancel subscription immediately
   - Downgrade user to free tier
   - Revoke premium features
4. Else:
   - Set `cancel_at_period_end = true`
   - Subscription continues until period end
5. Update Firestore subscription document
6. Create transaction record

#### 3.2.4 Purchase Credits (One-Time)

**File:** `backend/functions/src/payments/purchaseCredits.ts`

**Purpose:** Process one-time credit pack purchases

**Endpoint:** `POST /api/payments/purchase-credits`

**Request Body:**
```typescript
{
  userId: string;
  packId: 'small' | 'medium' | 'large' | 'mega';
  paymentMethodId: string; // From Stripe Elements
}
```

**Credit Pack Pricing:** (Stored in centralized `pricing_config`)
- Small: $4.99 → 500 credits
- Medium: $9.99 → 1,200 credits
- Large: $19.99 → 2,500 credits
- Mega: $39.99 → 5,500 credits

**Note:** All credit pack pricing is fetched from Firestore `pricing_config` collection via `pricing.service.getCreditPackPrice()`.

**Response:**
```typescript
{
  paymentIntentId: string;
  status: 'succeeded' | 'processing' | 'failed';
  creditsAdded: number;
  newBalance: number;
}
```

**Implementation Logic:**
1. Verify user authentication
2. Get pack pricing from `pricing.service.getCreditPackPrice(packId)`
3. Get or create Stripe Customer
4. Create Payment Intent:
   - Amount in cents
   - Currency: USD
   - Payment method
   - Metadata: `userId`, `packId`, `credits`
5. Confirm Payment Intent
6. If successful:
   - Add credits to user via credit service
   - Create transaction record
   - Update Firestore `payments` collection
7. Return payment status

#### 3.2.5 Setup Auto-Recharge

**File:** `backend/functions/src/payments/setupAutoRecharge.ts`

**Purpose:** Configure automatic credit purchases when balance is low

**Endpoint:** `POST /api/payments/setup-auto-recharge`

**Request Body:**
```typescript
{
  userId: string;
  enabled: boolean;
  threshold: number; // Credits threshold (default: 100)
  rechargeAmount: number; // Credits to purchase (default: 500)
  paymentMethodId?: string; // Required if enabling
}
```

**Response:**
```typescript
{
  autoRechargeEnabled: boolean;
  threshold: number;
  rechargeAmount: number;
}
```

**Implementation Logic:**
1. Verify user authentication
2. If enabling:
   - Verify payment method exists
   - Attach payment method to Stripe Customer
   - Set as default payment method
3. Update Firestore `user_credits` document:
   - `autoRechargeEnabled`
   - `autoRechargeThreshold`
   - `autoRechargeAmount`
   - `autoRechargePaymentMethodId`
4. Create background function trigger for low balance checks

**Auto-Recharge Trigger:**
- Cloud Function triggered on `user_credits` document updates
- Checks if `balance < threshold` and `autoRechargeEnabled = true`
- Calls `purchaseCredits()` with configured amount
- Handles failures gracefully (notify user, disable auto-recharge)

### 3.3 Webhook Handler

#### 3.3.1 Stripe Webhook Handler

**File:** `backend/functions/src/webhooks/stripeWebhook.ts`

**Purpose:** Handle Stripe webhook events for payment state synchronization

**Endpoint:** `POST /api/webhooks/stripe` (Firebase Function)

**Stripe Events Handled:**

1. **`checkout.session.completed`**
   - Subscription purchase completed
   - Add credits to user
   - Create subscription document
   - Update user tier
   - Create transaction record

2. **`customer.subscription.created`**
   - New subscription created
   - Initialize subscription document
   - Grant initial credits

3. **`customer.subscription.updated`**
   - Subscription modified (tier change, billing cycle)
   - Update subscription document
   - Adjust credits if tier changed

4. **`customer.subscription.deleted`**
   - Subscription canceled
   - Downgrade user to free tier
   - Update subscription status
   - Revoke premium features

5. **`invoice.payment_succeeded`**
   - Monthly/annual payment successful
   - Reset monthly credits
   - Create transaction record
   - Update subscription renewal date

6. **`invoice.payment_failed`**
   - Payment failed
   - Notify user
   - Mark subscription as past_due
   - Optionally retry payment

7. **`payment_intent.succeeded`**
   - One-time credit purchase succeeded
   - Add credits to user
   - Create transaction record

8. **`payment_intent.payment_failed`**
   - Credit purchase failed
   - Notify user
   - Log failure reason

**Implementation Logic:**
1. Verify webhook signature using `STRIPE_WEBHOOK_SECRET`
2. Parse event type and data
3. Route to appropriate handler function
4. Update Firestore collections atomically
5. Call credit service to update balances
6. Send notifications (email/push) if needed
7. Return 200 status to Stripe

**Security:**
- Verify webhook signature on every request
- Idempotency: Check if event already processed (store `eventId` in Firestore)
- Rate limiting: Prevent duplicate processing

### 3.4 Credit Service Integration

**File:** `backend/functions/src/services/creditService.ts`

**Purpose:** Integrate payment system with existing credit service

**Functions:**
```typescript
// Add credits to user account
async function addCredits(
  userId: string,
  amount: number,
  type: 'subscription' | 'purchase' | 'bonus',
  metadata: {
    subscriptionId?: string;
    paymentId?: string;
    transactionId?: string;
  }
): Promise<void>

// Get current credit balance
async function getCreditBalance(userId: string): Promise<number>

// Check if auto-recharge should trigger
async function checkAutoRecharge(userId: string): Promise<void>

// Calculate batch cost (uses centralized pricing)
async function calculateBatchCost(videoCount: number): Promise<number> {
  const pricing = await getPricingConfig();
  return pricing.batchPricing[videoCount] || pricing.batchPricing['6-10'];
}
```

**Integration Points:**
- Called from webhook handlers
- Called from payment functions
- Updates `user_credits` collection
- Creates `credit_transactions` records
- Triggers auto-recharge if enabled

---

## 4. Frontend Implementation

### 4.1 Stripe Setup

#### 4.1.1 Install Dependencies

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

#### 4.1.2 Stripe Provider

**File:** `frontend/src/components/payments/StripeProvider.tsx`

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}
```

**File:** `frontend/.env.local`

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4.2 Subscription Purchase Flow

#### 4.2.1 Pricing Page

**File:** `frontend/src/app/pricing/page.tsx`

**Features:**
- Display all subscription tiers (Free, Starter, Pro, Premium)
- Show monthly vs annual pricing (fetched from `usePricing()` hook)
- Credit allocations per tier (from centralized config)
- Feature comparison table (from centralized config)
- "Subscribe" buttons for each tier

**Implementation:**
```typescript
import { usePricing } from '@/hooks/usePricing';

export default function PricingPage() {
  const { pricing, loading } = usePricing();
  
  if (loading) return <LoadingSpinner />;
  if (!pricing) return <Error />;
  
  // Use pricing.subscriptions, pricing.freeTier, etc.
  // All pricing data comes from centralized config
}
```

**UI Components:**
- `TierCard` - Individual tier display
- `FeatureList` - Feature comparison
- `PricingToggle` - Monthly/Annual switcher
- `SubscribeButton` - Triggers checkout

#### 4.2.2 Checkout Flow

**File:** `frontend/src/components/payments/CheckoutButton.tsx`

**Flow:**
1. User clicks "Subscribe" on pricing page
2. Frontend calls `POST /api/payments/create-checkout-session`
3. Backend returns Stripe Checkout session URL
4. Redirect user to Stripe Checkout
5. User completes payment on Stripe
6. Stripe redirects to success page
7. Success page verifies payment and updates UI

**File:** `frontend/src/app/payment/success/page.tsx`

**Features:**
- Verify session ID from URL params
- Call backend to confirm payment
- Display success message
- Show subscription details
- Redirect to dashboard after 3 seconds

**File:** `frontend/src/app/payment/cancel/page.tsx`

**Features:**
- Display cancellation message
- Option to retry checkout
- Link back to pricing page

#### 4.2.3 Direct Subscription (Alternative)

**File:** `frontend/src/components/payments/SubscriptionForm.tsx`

**Purpose:** Create subscription without redirect (using Stripe Elements)

**Components:**
- `CardElement` - Stripe card input
- `PaymentButton` - Submit payment
- `BillingDetails` - Name, email, address

**Flow:**
1. User selects tier and billing period
2. Enters payment details via Stripe Elements
3. Frontend creates Payment Method
4. Calls `POST /api/payments/create-subscription`
5. Backend creates subscription and returns status
6. Frontend updates UI with subscription details

### 4.3 Credit Purchase Flow

#### 4.3.1 Credit Packs Page

**File:** `frontend/src/app/credits/page.tsx`

**Features:**
- Display credit pack options (Small, Medium, Large, Mega)
- Show price per credit for each pack (from `useCreditPacks()` hook)
- "Buy Now" buttons
- Current credit balance display
- Auto-recharge settings section

**Implementation:**
```typescript
import { useCreditPacks } from '@/hooks/usePricing';

export default function CreditsPage() {
  const { packs, loading } = useCreditPacks();
  
  // packs.small, packs.medium, etc. from centralized config
}
```

**UI Components:**
- `CreditPackCard` - Individual pack display
- `CreditBalance` - Current balance widget
- `AutoRechargeSettings` - Auto-recharge configuration

#### 4.3.2 Purchase Form

**File:** `frontend/src/components/payments/CreditPurchaseForm.tsx`

**Flow:**
1. User selects credit pack
2. Enters payment details (if not saved)
3. Frontend creates Payment Method
4. Calls `POST /api/payments/purchase-credits`
5. Backend processes payment
6. Frontend updates credit balance (via Firestore listener)
7. Shows success notification

**Components:**
- `CardElement` - Stripe card input
- `PackSelector` - Radio buttons for pack selection
- `PurchaseButton` - Submit purchase
- `LoadingState` - Processing indicator

### 4.4 Subscription Management

#### 4.4.1 Subscription Dashboard

**File:** `frontend/src/app/account/subscription/page.tsx`

**Features:**
- Current subscription status
- Tier information
- Billing period and renewal date
- Credit balance and usage
- Payment method on file
- Billing history
- Cancel subscription option

**UI Components:**
- `SubscriptionStatus` - Current tier badge
- `BillingInfo` - Renewal date, amount
- `PaymentMethod` - Card display (last 4 digits)
- `BillingHistory` - List of invoices
- `CancelButton` - Cancel subscription

#### 4.4.2 Cancel Subscription

**File:** `frontend/src/components/payments/CancelSubscriptionDialog.tsx`

**Flow:**
1. User clicks "Cancel Subscription"
2. Dialog shows cancellation options:
   - Cancel immediately (lose access now)
   - Cancel at period end (keep access until renewal)
3. User confirms cancellation
4. Frontend calls `POST /api/payments/cancel-subscription`
5. Backend processes cancellation
6. UI updates to show cancellation status

#### 4.4.3 Stripe Customer Portal

**Alternative:** Use Stripe's hosted Customer Portal

**File:** `frontend/src/components/payments/CustomerPortalButton.tsx`

**Flow:**
1. Backend creates portal session: `POST /api/payments/create-portal-session`
2. Returns portal URL
3. Redirect user to Stripe Customer Portal
4. User manages subscription, payment methods, invoices
5. Stripe redirects back to app

**Benefits:**
- Less code to maintain
- Stripe handles all edge cases
- PCI compliance handled by Stripe
- Automatic updates via webhooks

### 4.5 Auto-Recharge Settings

**File:** `frontend/src/components/payments/AutoRechargeSettings.tsx`

**Features:**
- Toggle auto-recharge on/off
- Set credit threshold (default: 100)
- Set recharge amount (default: 500)
- Select payment method
- Show last recharge date
- Disable auto-recharge

**UI Components:**
- `ToggleSwitch` - Enable/disable
- `NumberInput` - Threshold and amount inputs
- `PaymentMethodSelector` - Choose saved card
- `AutoRechargeHistory` - Past recharges

### 4.6 Real-Time Updates

#### 4.6.1 Firestore Listeners

**File:** `frontend/src/hooks/useCreditBalance.ts`

```typescript
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useCreditBalance(userId: string) {
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'user_credits', userId),
      (snapshot) => {
        const data = snapshot.data();
        setBalance(data?.balance || 0);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return balance;
}
```

**Usage:**
- Credit balance updates instantly after purchase
- Subscription status updates in real-time
- Payment confirmations appear immediately

### 4.7 Payment History

**File:** `frontend/src/app/account/payments/page.tsx`

**Features:**
- List all transactions (subscriptions + credit purchases)
- Filter by type, date range
- Download invoices (PDF)
- View transaction details
- Export to CSV

**UI Components:**
- `TransactionList` - Table of transactions
- `TransactionFilter` - Filter controls
- `InvoiceDownload` - Download button
- `TransactionDetail` - Modal with details

---

## 5. Database Schema

### 5.1 Firestore Collections

#### 5.1.1 `subscriptions`

**Document ID:** `{subscriptionId}` (Stripe subscription ID)

```typescript
{
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  tier: 'starter' | 'pro' | 'premium';
  billingPeriod: 'monthly' | 'annual';
  status: 'active' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;
  canceledAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata: {
    priceId: string;
    productId: string;
  };
}
```

**Indexes:**
- `userId` (for user queries)
- `status` (for active subscriptions)
- `currentPeriodEnd` (for renewal checks)

#### 5.1.2 `payments`

**Document ID:** `{paymentIntentId}` (Stripe payment intent ID)

```typescript
{
  userId: string;
  type: 'subscription' | 'credit_pack' | 'auto_recharge';
  amount: number; // in cents
  currency: string; // 'usd'
  status: 'succeeded' | 'pending' | 'failed';
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  metadata: {
    packId?: string;
    credits?: number;
    subscriptionId?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `userId` (for user payment history)
- `status` (for failed payment monitoring)
- `createdAt` (for date range queries)

#### 5.1.3 `checkout_sessions`

**Document ID:** `{sessionId}` (Stripe checkout session ID)

```typescript
{
  sessionId: string;
  userId: string;
  tier: string;
  billingPeriod: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  completedAt: Timestamp | null;
}
```

**Purpose:** Track checkout sessions for analytics and debugging

#### 5.1.4 `user_credits` (Update Existing)

**Add Fields:**
```typescript
{
  // ... existing fields ...
  subscriptionId: string | null;
  autoRechargeEnabled: boolean;
  autoRechargeThreshold: number;
  autoRechargeAmount: number;
  autoRechargePaymentMethodId: string | null;
  lastRechargeAt: Timestamp | null;
}
```

#### 5.1.5 `credit_transactions` (Update Existing)

**Add Fields:**
```typescript
{
  // ... existing fields ...
  paymentId: string | null; // Link to payments collection
  subscriptionId: string | null; // Link to subscriptions collection
  stripeEventId: string | null; // For webhook idempotency
}
```

### 5.2 Security Rules

**File:** `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own credit data
    match /user_credits/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only server can write
    }

    // Users can only read their own transactions
    match /credit_transactions/{transactionId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow write: if false; // Only server can write
    }

    // Users can only read their own subscriptions
    match /subscriptions/{subscriptionId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow write: if false; // Only server can write
    }

    // Users can only read their own payments
    match /payments/{paymentId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow write: if false; // Only server can write
    }

    // Checkout sessions are private
    match /checkout_sessions/{sessionId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow write: if false; // Only server can write
    }
  }
}
```

---

## 6. API Endpoints

### 6.1 Payment Endpoints

**Base URL:** `https://{region}-{project-id}.cloudfunctions.net/api`

#### 6.1.1 Create Checkout Session

```
POST /payments/create-checkout-session
Authorization: Bearer {jwt_token}

Request:
{
  "tier": "pro",
  "billingPeriod": "monthly",
  "successUrl": "https://app.com/payment/success",
  "cancelUrl": "https://app.com/payment/cancel"
}

Response:
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### 6.1.2 Create Subscription

```
POST /payments/create-subscription
Authorization: Bearer {jwt_token}

Request:
{
  "tier": "starter",
  "billingPeriod": "annual",
  "paymentMethodId": "pm_..."
}

Response:
{
  "subscriptionId": "sub_...",
  "status": "active",
  "currentPeriodEnd": "2024-02-01T00:00:00Z"
}
```

#### 6.1.3 Cancel Subscription

```
POST /payments/cancel-subscription
Authorization: Bearer {jwt_token}

Request:
{
  "subscriptionId": "sub_...",
  "cancelImmediately": false
}

Response:
{
  "subscriptionId": "sub_...",
  "status": "active",
  "cancelAtPeriodEnd": true,
  "canceledAt": null
}
```

#### 6.1.4 Purchase Credits

```
POST /payments/purchase-credits
Authorization: Bearer {jwt_token}

Request:
{
  "packId": "medium",
  "paymentMethodId": "pm_..."
}

Response:
{
  "paymentIntentId": "pi_...",
  "status": "succeeded",
  "creditsAdded": 1200,
  "newBalance": 1500
}
```

#### 6.1.5 Setup Auto-Recharge

```
POST /payments/setup-auto-recharge
Authorization: Bearer {jwt_token}

Request:
{
  "enabled": true,
  "threshold": 100,
  "rechargeAmount": 500,
  "paymentMethodId": "pm_..."
}

Response:
{
  "autoRechargeEnabled": true,
  "threshold": 100,
  "rechargeAmount": 500
}
```

#### 6.1.6 Get Subscription

```
GET /payments/subscription
Authorization: Bearer {jwt_token}

Response:
{
  "subscriptionId": "sub_...",
  "tier": "pro",
  "status": "active",
  "currentPeriodEnd": "2024-02-01T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

#### 6.1.7 Get Payment History

```
GET /payments/history?limit=20&offset=0
Authorization: Bearer {jwt_token}

Response:
{
  "payments": [
    {
      "id": "pi_...",
      "type": "credit_pack",
      "amount": 999,
      "status": "succeeded",
      "createdAt": "2024-01-15T10:00:00Z",
      "credits": 1200
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

### 6.2 Webhook Endpoint

```
POST /webhooks/stripe
Stripe-Signature: t=...,v1=...

Request: (Stripe Event Object)
{
  "id": "evt_...",
  "type": "checkout.session.completed",
  "data": { ... }
}

Response: 200 OK
```

---

## 7. Stripe Configuration

### 7.1 Products and Prices

**Stripe Dashboard Setup:**

1. **Create Products:**
   - Starter (Monthly)
   - Starter (Annual)
   - Pro (Monthly)
   - Pro (Annual)
   - Premium (Monthly)
   - Premium (Annual)

2. **Create Prices:**
   - Link each product to recurring price
   - Monthly: Billing period = month
   - Annual: Billing period = year, 20% discount

3. **Credit Pack Products:**
   - Small Pack ($4.99)
   - Medium Pack ($9.99)
   - Large Pack ($19.99)
   - Mega Pack ($39.99)

**Price IDs:** Stored in Firestore `pricing_config` collection, fetched via `pricing.service.ts`

**Note:** Stripe Price IDs are stored in the centralized pricing configuration. When creating products in Stripe, update the `priceId` field in Firestore `pricing_config` document.

### 7.2 Webhook Configuration

**Stripe Dashboard → Webhooks:**

1. **Endpoint URL:**
   ```
   https://{region}-{project-id}.cloudfunctions.net/api/webhooks/stripe
   ```

2. **Events to Listen:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

3. **Webhook Secret:**
   - Copy secret from Stripe dashboard
   - Store in Firebase Functions config: `stripe.webhook_secret`

### 7.3 Customer Portal

**Stripe Dashboard → Settings → Customer Portal:**

1. **Enable Customer Portal**
2. **Configure Features:**
   - Allow subscription cancellation
   - Allow payment method updates
   - Allow invoice downloads
   - Allow subscription upgrades/downgrades (optional)

3. **Branding:**
   - Add logo
   - Customize colors
   - Add business information

---

## 8. Security Considerations

### 8.1 Authentication

- All payment endpoints require JWT authentication
- Verify `userId` from JWT matches request `userId`
- Prevent users from accessing other users' payment data

### 8.2 Webhook Security

- **Verify Webhook Signature:** Always verify Stripe webhook signature
- **Idempotency:** Check if event already processed (store `eventId`)
- **Rate Limiting:** Prevent duplicate processing
- **Error Handling:** Log failures, retry with exponential backoff

### 8.3 Payment Data

- **Never store card numbers:** Stripe handles all sensitive data
- **PCI Compliance:** Use Stripe Elements (PCI-compliant)
- **Tokenization:** Only store Stripe payment method IDs
- **Encryption:** Encrypt sensitive metadata in Firestore

### 8.4 Fraud Prevention

- **Stripe Radar:** Enable Stripe's fraud detection
- **Rate Limiting:** Limit payment attempts per user
- **IP Blocking:** Block suspicious IPs
- **Transaction Monitoring:** Alert on unusual patterns

### 8.5 Environment Separation

- **Test Mode:** Use Stripe test keys for development
- **Live Mode:** Use Stripe live keys for production
- **Separate Projects:** Use different Firebase projects for test/prod
- **Key Rotation:** Rotate API keys periodically

---

## 9. Error Handling

### 9.1 Payment Failures

**Common Scenarios:**

1. **Insufficient Funds:**
   - Display clear error message
   - Suggest alternative payment method
   - Offer to save card for retry

2. **Card Declined:**
   - Show user-friendly message
   - Suggest contacting bank
   - Allow retry with different card

3. **Network Errors:**
   - Retry payment automatically (3 attempts)
   - Show loading state
   - Fallback to manual retry

4. **Webhook Failures:**
   - Log error with full context
   - Retry webhook processing
   - Manual reconciliation if needed

### 9.2 User Communication

**Email Notifications:**
- Payment succeeded
- Payment failed
- Subscription canceled
- Subscription renewed
- Auto-recharge triggered

**In-App Notifications:**
- Real-time credit balance updates
- Payment status changes
- Subscription expiration warnings

---

## 10. Testing Requirements

### 10.1 Unit Tests

**Backend:**
- Payment function logic
- Webhook event handling
- Credit service integration
- Error handling

**Frontend:**
- Payment form validation
- Stripe Elements integration
- UI state management

### 10.2 Integration Tests

- End-to-end subscription flow
- Credit purchase flow
- Webhook processing
- Auto-recharge triggering

### 10.3 Stripe Test Mode

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

**Test Scenarios:**
- Successful subscription
- Failed payment
- Subscription cancellation
- Auto-recharge
- Webhook events

### 10.4 Load Testing

- Concurrent checkout sessions
- Webhook processing under load
- Firestore write performance
- Stripe API rate limits

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Backend:**
- [ ] Set up Firebase Functions project
- [ ] Install Stripe SDK
- [ ] Configure environment variables
- [ ] **Create centralized pricing service (`pricing.service.ts`)**
- [ ] **Initialize Firestore `pricing_config` collection**
- [ ] **Run pricing initialization script**
- [ ] Create base payment functions structure
- [ ] Set up Firestore collections
- [ ] Implement security rules

**Frontend:**
- [ ] Install Stripe.js dependencies
- [ ] Set up Stripe Provider
- [ ] **Create `usePricing()` hook with Firestore listener**
- [ ] **Create pricing configuration types**
- [ ] Create pricing page UI (using centralized pricing)
- [ ] Implement basic checkout flow

### Phase 2: Subscriptions (Week 3-4)

**Backend:**
- [ ] **Update payment functions to use `pricing.service.ts`**
- [ ] Implement `createCheckoutSession` (uses centralized pricing)
- [ ] Implement `createSubscription` (uses centralized pricing)
- [ ] Implement `cancelSubscription`
- [ ] Set up Stripe products and prices
- [ ] **Update Firestore `pricing_config` with Stripe Price IDs**
- [ ] Configure webhooks

**Frontend:**
- [ ] Complete checkout flow
- [ ] Build subscription management UI
- [ ] Implement success/cancel pages
- [ ] Add subscription status display

### Phase 3: Credit Purchases (Week 5)

**Backend:**
- [ ] Implement `purchaseCredits`
- [ ] Create credit pack products in Stripe
- [ ] Add credit service integration

**Frontend:**
- [ ] Build credit packs page (using `useCreditPacks()` hook)
- [ ] Implement purchase form
- [ ] Add credit balance display
- [ ] **Ensure all pricing displays use centralized config**

### Phase 4: Auto-Recharge (Week 6)

**Backend:**
- [ ] Implement `setupAutoRecharge`
- [ ] Create auto-recharge trigger function
- [ ] Add low balance detection

**Frontend:**
- [ ] Build auto-recharge settings UI
- [ ] Add payment method selection
- [ ] Show recharge history

### Phase 5: Webhooks & Polish (Week 7-8)

**Backend:**
- [ ] Implement webhook handler
- [ ] Add all event handlers
- [ ] Implement idempotency
- [ ] Add error handling and logging

**Frontend:**
- [ ] Add payment history page
- [ ] Implement real-time updates
- [ ] Add error handling
- [ ] Polish UI/UX

### Phase 6: Testing & Launch (Week 9-10)

- [ ] Comprehensive testing (unit, integration, E2E)
- [ ] Security audit
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Documentation
- [ ] Production deployment
- [ ] Monitor and iterate

---

## 12. Monitoring & Analytics

### 12.1 Key Metrics

**Financial:**
- Monthly Recurring Revenue (MRR)
- Average Revenue Per User (ARPU)
- Churn rate
- Conversion rate (free → paid)

**Operational:**
- Payment success rate
- Webhook processing time
- Failed payment rate
- Auto-recharge success rate

**User Behavior:**
- Subscription tier distribution
- Credit pack purchase frequency
- Auto-recharge adoption rate
- Payment method preferences

### 12.2 Alerts

- Payment failure rate > 5%
- Webhook processing failures
- Subscription cancellation spike
- Unusual payment patterns (fraud)

### 12.3 Dashboards

**Stripe Dashboard:**
- Revenue overview
- Payment success rates
- Customer lifetime value

**Firebase Console:**
- Function execution metrics
- Firestore read/write counts
- Error rates

**Custom Dashboard:**
- Real-time subscription metrics
- Credit usage analytics
- User tier distribution

---

## 13. Future Enhancements

### 13.1 Additional Payment Methods

- Apple Pay
- Google Pay
- PayPal
- Bank transfers (for enterprise)

### 13.2 Subscription Upgrades/Downgrades

- Prorated billing
- Immediate tier changes
- Upgrade incentives

### 13.3 Promotional Features

- Coupon codes
- Referral discounts
- Limited-time offers
- Trial periods

### 13.4 Enterprise Features

- Invoice billing
- Custom pricing
- Volume discounts
- Dedicated support

---

## 14. Appendix

### 14.1 Pricing Configuration Location

**All pricing is centralized in Firestore `pricing_config` collection.**

**Access Methods:**
- **Backend:** Use `pricing.service.ts` functions
- **Frontend:** Use `usePricing()` hook or `/api/pricing` endpoint
- **Admin:** Update via Firestore console or admin interface

**Initial Setup:**
1. Run `backend/scripts/init-pricing-config.ts` to create initial configuration
2. Update Stripe Price IDs in Firestore after creating products in Stripe
3. Both backend and frontend will automatically use updated prices

**Example Pricing Structure:**
See Section 3.2 for complete Firestore document structure. All pricing values (subscriptions, credit packs, batch pricing, credit rates) are stored in a single document with ID `'current'`.

### 14.2 Updating Pricing

**Via Firestore Console:**
1. Navigate to `pricing_config` collection
2. Open `current` document
3. Update desired pricing values
4. Increment `version` field
5. Update `lastUpdated` and `lastUpdatedBy`
6. Save document
7. Backend cache invalidates after 5 minutes (or restart)
8. Frontend updates immediately via Firestore listener

**Via Admin API (Future):**
```typescript
POST /api/admin/pricing/update
Authorization: Bearer {admin_jwt_token}

Request:
{
  "subscriptions": { ... },
  "creditPacks": { ... },
  // ... partial updates supported
}
```

### 14.3 Pricing Configuration Schema Reference

See Section 3.2 for the complete TypeScript interface. Key fields:
- `subscriptions.{tier}.{period}` - Subscription pricing
- `creditPacks.{packId}` - Credit pack pricing
- `freeTier` - Free tier configuration
- `creditRates` - Credit consumption rates
- `batchPricing` - Simplified batch pricing

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Status:** Draft - Ready for Implementation  
**Next Steps:** Begin Phase 1 implementation, set up Stripe account and Firebase Functions

