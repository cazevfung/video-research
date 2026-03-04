# Freemium Credit System PRD: YouTube Batch Summary Service

| Version | 1.0 |
| :--- | :--- |
| **Status** | Draft |
| **Created** | 2024 |
| **Target Margin** | 50% |

---

## 1. Executive Summary

This PRD defines a credit-based freemium model for the YouTube Batch Summary Service. The system uses credits as a unified currency to abstract away the complexity of different service costs (Supadata transcripts, Qwen AI processing, Firebase storage) while maintaining a **50% gross margin** target.

**Key Principles:**
- **Transparency:** Users understand what credits cost and how they're consumed
- **Fair Pricing:** Credits reflect actual service costs with 50% margin
- **Flexible Tiers:** Multiple subscription tiers to accommodate different usage patterns
- **Cost Efficiency:** Optimize operations to minimize costs while maintaining quality

---

## 2. Service Cost Analysis

### 2.1 Cost Breakdown by Service Provider

#### Supadata (Transcript Extraction)
- **Cost per transcript:** 1 credit (from Supadata)
- **Pricing tiers:**
  - Free: 100 credits/month (no cost to us)
  - Basic: $5/month for 300 credits = **$0.0167 per credit**
  - Pro: $17/month for 3,000 credits = **$0.0057 per credit**
  - Mega: $47/month for 30,000 credits = **$0.0016 per credit**
  - Giga: $297/month for 300,000 credits = **$0.0010 per credit**

**Assumption:** We'll use Pro tier ($0.0057/credit) for cost calculations, upgrading to Mega/Giga as volume increases.

#### Qwen/DashScope (AI Processing)

**Pricing (in Chinese Yuan, converted to USD at ~7 CNY = $1 USD):**

**qwen-plus (default model):**
- Input: 0.0008元/1k tokens = **$0.000114/1k tokens**
- Output: 0.002元/1k tokens = **$0.000286/1k tokens**

**qwen-flash (pre-condensing):**
- Input: 0.00015元/1k tokens = **$0.000021/1k tokens**
- Output: 0.0015元/1k tokens = **$0.000214/1k tokens**

**qwen-max (premium model):**
- Pricing not explicitly shown, assumed ~2x qwen-plus = **$0.000228/1k input, $0.000572/1k output**

**Token Estimation:**
- Words to tokens ratio: **1.3 tokens per word** (from config)
- Average video transcript: **2,000 words** = **2,600 tokens**
- Long video (>60min or >8000 words): **8,000 words** = **10,400 tokens**
- Pre-condensed output: **~50% reduction** = **5,200 tokens**
- Final summary: **500-2,000 words** = **650-2,600 tokens**

#### Firebase Firestore (Storage & Database)

**Free Tier Limits:**
- Storage: 1 GiB free
- Network egress: 10 GiB/month free
- Document writes: 20K/day free
- Document reads: 50K/day free

**Paid Pricing (after free tier):**
- Storage: **$0.18/GiB/month**
- Document writes: **$0.18 per 100K operations**
- Document reads: **$0.06 per 100K operations**
- Network egress: **$0.12/GB** (varies by region)

**Per Batch Operation:**
- 1 summary document write: **~$0.0000018** (negligible)
- 1 summary document read: **~$0.0000006** (negligible)
- Storage: **~$0.00001 per summary** (assuming 10KB per summary, negligible)

**Assumption:** Firebase costs are negligible for typical usage volumes. Focus on Supadata and Qwen costs.

### 2.2 Typical Batch Cost Calculation

**Scenario: Free Tier Batch (3 videos, average length)**

1. **Transcript Fetching:**
   - 3 videos × 1 Supadata credit = 3 credits
   - Cost: 3 × $0.0057 = **$0.0171**

2. **AI Processing:**
   - Each video: 2,000 words = 2,600 tokens
   - Pre-condensing (if needed): Usually not needed for average videos
   - Final summary generation:
     - Input: System prompt (~500 tokens) + 3 transcripts (7,800 tokens) = **8,300 tokens**
     - Output: Summary (~1,000 words = 1,300 tokens)
     - Cost: (8,300 × $0.000114) + (1,300 × $0.000286) = **$0.000946 + $0.000372 = $0.001318**

3. **Firebase:**
   - Storage + writes: **~$0.00001** (negligible)

**Total Cost per Batch: ~$0.0184**

**With 50% Margin: Price per Batch = $0.0276** (cost × 1.5)

**Credit Cost per Batch: ~28 credits** (rounded to 30 for simplicity and ease of use)

---

**Scenario: Premium Tier Batch (10 videos, some long)**

1. **Transcript Fetching:**
   - 10 videos × 1 Supadata credit = 10 credits
   - Cost: 10 × $0.0057 = **$0.057**

2. **AI Processing:**
   - 5 average videos (2,000 words each) = 13,000 tokens
   - 5 long videos (8,000 words each) = 52,000 tokens
   - Pre-condensing 5 long videos:
     - Input: 52,000 tokens
     - Output: 26,000 tokens (50% reduction)
     - Cost: (52,000 × $0.000021) + (26,000 × $0.000214) = **$0.001092 + $0.005564 = $0.006656**
   - Final summary (qwen-max for premium):
     - Input: System prompt (500) + 5 raw (13,000) + 5 condensed (26,000) = **39,500 tokens**
     - Output: Summary (2,000 words = 2,600 tokens)
     - Cost: (39,500 × $0.000228) + (2,600 × $0.000572) = **$0.009006 + $0.001487 = $0.010493**

3. **Firebase:**
   - Storage + writes: **~$0.00001** (negligible)

**Total Cost per Batch: ~$0.074**

**With 50% Margin: Price per Batch = $0.111** (cost × 1.5)

**Credit Cost per Batch: ~111 credits** (rounded to 110 for simplicity)

---

## 3. Credit System Design

### 3.1 Credit Definition

**1 Credit = $0.001 USD** (base unit)

This allows for:
- Fine-grained pricing
- Easy mental math (1000 credits = $1)
- Flexibility for future adjustments

### 3.2 Credit Consumption Rules

#### Per Video Transcript Fetch
- **Cost:** 10 credits per video
- **Rationale:** Supadata costs $0.0057/credit, we charge 10 credits = $0.01 (75% margin)

#### Per AI Processing Operation

**Pre-Condensing (qwen-flash):**
- **Input tokens:** 0.1 credits per 1k tokens
- **Output tokens:** 0.5 credits per 1k tokens
- **Rationale:** Actual cost ~$0.000021/1k input, we charge $0.0001 (376% margin to cover overhead)

**Final Summary Generation:**

**Free Tier (qwen-plus):**
- **Input tokens:** 0.1 credits per 1k tokens
- **Output tokens:** 0.3 credits per 1k tokens

**Premium Tier (qwen-max):**
- **Input tokens:** 0.2 credits per 1k tokens
- **Output tokens:** 0.6 credits per 1k tokens

**Rationale:** Premium users get better quality, pay slightly more per token.

#### Per Batch Operation (Simplified Pricing)

To simplify user experience, we offer **flat-rate pricing per batch** based on video count:

| Videos per Batch | Credits per Batch | Approximate Cost Breakdown |
|-----------------|-------------------|----------------------------|
| 1 video | 20 credits | 10 (transcript) + 10 (AI) |
| 2 videos | 30 credits | 20 (transcripts) + 10 (AI) |
| 3 videos | 40 credits | 30 (transcripts) + 10 (AI) |
| 4-5 videos | 60 credits | 40-50 (transcripts) + 10-20 (AI) |
| 6-10 videos | 120 credits | 60-100 (transcripts) + 20-40 (AI) |

**Note:** These are simplified flat rates. Actual costs vary based on video length and AI processing requirements. Long videos (>60min) may incur additional credits for pre-condensing.

**Note:** For batches with long videos (>60min or >8000 words), additional credits may be charged for pre-condensing. This is handled automatically.

### 3.3 Credit Allocation Examples

**Example 1: Free Tier User - 3 Average Videos**
- Transcripts: 3 × 10 = 30 credits
- AI Processing: ~8,300 input tokens × 0.1 + 1,300 output tokens × 0.3 = 830 + 390 = 1,220 credits
- **Total: ~1,250 credits** (but charged flat rate of 40 credits per batch)

**Example 2: Premium Tier User - 10 Videos (5 Long)**
- Transcripts: 10 × 10 = 100 credits
- Pre-condensing 5 videos: ~52,000 input × 0.1 + 26,000 output × 0.5 = 5,200 + 13,000 = 18,200 credits
- Final summary: ~39,500 input × 0.2 + 2,600 output × 0.6 = 7,900 + 1,560 = 9,460 credits
- **Total: ~27,760 credits** (but charged flat rate of 120 credits per batch)

**Note:** The flat-rate pricing is heavily subsidized for complex batches to provide predictable pricing. This encourages usage while maintaining overall profitability through volume.

**Note:** The flat-rate pricing is subsidized for small batches but becomes more accurate for larger batches. This encourages usage while maintaining profitability.

---

## 4. Subscription Tiers

### 4.1 Free Tier

**Monthly Credits:** 120 credits (equivalent to 3 batches of 3 videos, or 6 batches of 1-2 videos)

**Features:**
- 3 batches per day maximum
- Up to 3 videos per batch
- qwen-plus model (good quality)
- Standard processing speed
- Access to all preset styles
- History retention: 30 days

**Credit Reset:** Daily reset at midnight UTC (40 credits/day, equivalent to 1 batch of 3 videos)

**Cost to Service:** ~$0.0184 per batch × 3 = $0.0552/day = $1.66/month
**Revenue:** $0 (free tier)
**Margin:** N/A (acquisition cost)

---

### 4.2 Starter Tier

**Monthly Price:** $4.99/month
**Monthly Credits:** 500 credits

**Features:**
- 10 batches per day maximum
- Up to 5 videos per batch
- qwen-plus model
- Standard processing speed
- Access to all preset styles
- Custom prompts
- History retention: 90 days
- Priority support

**Credit Reset:** Monthly reset on billing date

**Cost to Service:** ~$0.0184 per batch × 10 batches = $0.184/day = $5.52/month (assuming 10 batches/day)
**Revenue:** $4.99/month
**Margin:** -10.6% (if fully utilized, but users typically use 30-50% of credits)

**Break-even Analysis:**
- If user uses 3 batches/day: Cost = $1.66/month, Margin = 66.7%
- If user uses 5 batches/day: Cost = $2.76/month, Margin = 44.7%
- If user uses 10 batches/day: Cost = $5.52/month, Margin = -10.6%

**Expected Usage:** Average user uses 3-5 batches/day, maintaining healthy margins.

---

### 4.3 Pro Tier

**Monthly Price:** $14.99/month
**Monthly Credits:** 2,000 credits

**Features:**
- 50 batches per day maximum
- Up to 10 videos per batch
- qwen-plus model (default) with option to upgrade to qwen-max
- Faster processing priority
- Access to all preset styles
- Custom prompts
- History retention: 1 year
- Priority support
- API access (future)

**Credit Reset:** Monthly reset on billing date

**Cost to Service:** ~$0.074 per batch × 20 batches = $1.48/day = $44.40/month (assuming 20 batches/day with long videos)
**Revenue:** $14.99/month
**Margin:** -66.2% (if fully utilized with complex batches)

**Break-even Analysis:**
- If user uses 3 batches/day (average videos): Cost = $1.66/month, Margin = 88.9%
- If user uses 5 batches/day (mix): Cost = $3.70/month, Margin = 75.3%
- If user uses 10 batches/day (mix): Cost = $7.40/month, Margin = 50.7%
- If user uses 20 batches/day (all complex): Cost = $44.40/month, Margin = -66.2%

**Note:** Most users won't fully utilize credits, and average batches are simpler (3 videos, average length). Expected usage is 5-10 batches/day, maintaining healthy margins.

---

### 4.4 Premium Tier

**Monthly Price:** $29.99/month
**Monthly Credits:** 5,000 credits

**Features:**
- Unlimited batches per day (within rate limits)
- Up to 10 videos per batch
- qwen-max model (highest quality)
- Fastest processing priority
- Access to all preset styles
- Custom prompts
- History retention: Unlimited
- Priority support
- API access
- Advanced features (batch exports, custom integrations)

**Credit Reset:** Monthly reset on billing date

**Cost to Service:** ~$0.074 per batch × 50 batches = $3.70/day = $111/month (assuming 50 batches/day, all complex)
**Revenue:** $29.99/month
**Margin:** -270% (if fully utilized with all complex batches)

**Break-even Analysis:**
- If user uses 5 batches/day (mix): Cost = $3.70/month, Margin = 87.7%
- If user uses 10 batches/day (mix): Cost = $7.40/month, Margin = 75.3%
- If user uses 20 batches/day (mix): Cost = $14.80/month, Margin = 50.7%
- If user uses 50 batches/day (all complex): Cost = $111/month, Margin = -270%

**Note:** Premium tier is designed for power users. Most will use 10-20 batches/day with a mix of simple and complex batches, maintaining profitability. Heavy users who consistently use 50+ complex batches/day may need custom enterprise pricing.

---

### 4.5 Annual Plans (Discount)

All tiers offer **20% discount** when paid annually:

- **Starter Annual:** $47.90/year (vs $59.88/monthly)
- **Pro Annual:** $143.90/year (vs $179.88/monthly)
- **Premium Annual:** $287.90/year (vs $359.88/monthly)

---

## 5. Credit Purchase & Top-Up

### 5.1 One-Time Credit Packs

For users who exceed their monthly allocation:

| Credit Pack | Price | Credits | Price per Credit |
|------------|-------|---------|------------------|
| Small Pack | $4.99 | 500 | $0.00998 |
| Medium Pack | $9.99 | 1,200 | $0.00833 |
| Large Pack | $19.99 | 2,500 | $0.00800 |
| Mega Pack | $39.99 | 5,500 | $0.00727 |

**Rationale:** Bulk discounts encourage larger purchases. Price per credit decreases with pack size.

### 5.2 Auto-Recharge

Users can enable **auto-recharge** to automatically purchase credits when balance falls below a threshold:

- **Threshold:** User-configurable (default: 100 credits)
- **Recharge Amount:** User-configurable (default: 500 credits)
- **Payment Method:** Stored credit card (PCI-compliant)

---

## 6. Credit Management System

### 6.1 Credit Balance Tracking

**Storage:** Firebase Firestore collection `user_credits`

**Document Structure:**
```typescript
{
  userId: string;
  balance: number; // Current credit balance
  totalEarned: number; // Lifetime credits earned
  totalSpent: number; // Lifetime credits spent
  lastResetDate: string; // ISO date string
  subscriptionTier: 'free' | 'starter' | 'pro' | 'premium';
  subscriptionEndDate: string; // ISO date string (null for free tier)
  autoRechargeEnabled: boolean;
  autoRechargeThreshold: number;
  autoRechargeAmount: number;
}
```

### 6.2 Credit Transactions

**Storage:** Firebase Firestore collection `credit_transactions`

**Document Structure:**
```typescript
{
  transactionId: string;
  userId: string;
  type: 'earned' | 'spent' | 'purchased' | 'refunded' | 'expired';
  amount: number; // Positive for earned/purchased, negative for spent
  balanceBefore: number;
  balanceAfter: number;
  description: string; // Human-readable description
  metadata: {
    batchId?: string; // If spent on a batch
    purchaseId?: string; // If from a purchase
    subscriptionId?: string; // If from subscription
  };
  timestamp: string; // ISO date string
}
```

### 6.3 Credit Reset Logic

**Free Tier:**
- Daily reset at midnight UTC
- Credits reset to 40 credits (1 batch worth)
- Unused credits do NOT roll over

**Paid Tiers:**
- Monthly reset on billing date
- Credits reset to tier allocation
- Unused credits do NOT roll over (encourages usage)

**Implementation:**
- Cron job runs daily at midnight UTC
- Checks all users' `lastResetDate`
- Resets credits based on tier
- Creates transaction record for reset

### 6.4 Credit Expiration

**Policy:** Credits expire after 90 days of inactivity (for purchased credits only)
- Subscription credits: Expire at end of billing period if unused
- Purchased credit packs: Expire 90 days after purchase if unused
- Free tier credits: Reset daily (no expiration needed)

---

## 7. Cost Tracking & Analytics

### 7.1 Per-Batch Cost Tracking

Track actual costs for each batch operation:

**Storage:** Firebase Firestore collection `batch_costs`

**Document Structure:**
```typescript
{
  batchId: string;
  userId: string;
  timestamp: string;
  costs: {
    supadata: {
      creditsUsed: number;
      costUSD: number;
    };
    qwen: {
      model: string; // 'qwen-flash' | 'qwen-plus' | 'qwen-max'
      inputTokens: number;
      outputTokens: number;
      preCondenseTokens?: {
        input: number;
        output: number;
      };
      costUSD: number;
    };
    firebase: {
      writes: number;
      reads: number;
      storageBytes: number;
      costUSD: number;
    };
    totalCostUSD: number;
  };
  creditsCharged: number;
  margin: number; // (creditsCharged * 0.001 - totalCostUSD) / totalCostUSD
}
```

### 7.2 Margin Monitoring

**Dashboard Metrics:**
- Average margin per batch
- Average margin per user tier
- Total cost vs revenue
- Credit utilization rates
- Most expensive operations

**Alerts:**
- Margin drops below 40% (target: 50%)
- Cost per batch exceeds expected range
- Credit utilization exceeds 80% for any tier

---

## 8. Pricing Strategy Adjustments

### 8.1 Dynamic Pricing (Future)

Consider implementing dynamic pricing based on:
- Video length (longer videos cost more)
- Video count (bulk discounts)
- Time of day (off-peak discounts)
- User tier (premium users get better rates)

### 8.2 Promotional Credits

**New User Bonus:**
- Free tier: 40 credits on signup (1 free batch)
- Paid tiers: 200 bonus credits on first subscription

**Referral Program:**
- Referrer: 100 credits per successful referral
- Referee: 50 credits on signup

**Seasonal Promotions:**
- Holiday bonuses
- Limited-time credit multipliers

---

## 9. Implementation Requirements

### 9.1 Backend Changes

1. **Credit Service (`src/services/credit.service.ts`):**
   - `checkCreditBalance(userId): Promise<number>`
   - `deductCredits(userId, amount, metadata): Promise<void>`
   - `addCredits(userId, amount, type, metadata): Promise<void>`
   - `resetDailyCredits(userId): Promise<void>`
   - `resetMonthlyCredits(userId): Promise<void>`

2. **Cost Tracking Service (`src/services/cost-tracking.service.ts`):**
   - `trackBatchCost(batchId, costs): Promise<void>`
   - `calculateBatchCost(transcriptCount, aiTokens, firebaseOps): CostBreakdown`
   - `getMarginReport(startDate, endDate): Promise<MarginReport>`

3. **Credit Middleware (`src/middleware/credit-check.middleware.ts`):**
   - Check credit balance before processing batch
   - Deduct credits after successful batch
   - Return appropriate error if insufficient credits

4. **Cron Jobs (`src/jobs/credit-reset.job.ts`):**
   - Daily reset for free tier (midnight UTC)
   - Monthly reset for paid tiers (on billing date)

### 9.2 Frontend Changes

1. **Credit Balance Display:**
   - Show current balance in header
   - Show credits needed for current batch
   - Warn if insufficient credits

2. **Credit Purchase UI:**
   - Credit pack selection
   - Auto-recharge settings
   - Transaction history

3. **Pricing Page:**
   - Clear tier comparison
   - Credit costs per operation
   - Usage calculator

### 9.3 Database Schema

**Collections:**
- `user_credits` (as defined above)
- `credit_transactions` (as defined above)
- `batch_costs` (as defined above)
- `subscriptions` (existing, may need updates)

---

## 10. Migration Plan

### 10.1 Existing Users

**Free Tier Users:**
- Grant 120 credits immediately
- Set daily reset schedule
- No action required

**Paid Tier Users (if any):**
- Convert existing subscription to credit-based
- Grant credits based on tier
- Set monthly reset schedule

### 10.2 Data Migration

1. Create `user_credits` documents for all existing users
2. Initialize balances based on tier
3. Create initial transaction records
4. Set up cron jobs for resets

---

## 11. Success Metrics

### 11.1 Financial Metrics

- **Average Margin:** Target 50%, alert if < 40%
- **Revenue per User:** Track by tier
- **Credit Utilization:** Average % of credits used per user
- **Churn Rate:** Users canceling subscriptions

### 11.2 Usage Metrics

- **Batches per User:** Average per tier
- **Videos per Batch:** Average per tier
- **Credit Purchase Rate:** % of users purchasing additional credits
- **Auto-Recharge Adoption:** % of users enabling auto-recharge

### 11.3 Cost Metrics

- **Cost per Batch:** Track by tier and video count
- **Cost per User:** Average monthly cost per user
- **Most Expensive Operations:** Identify optimization opportunities

---

## 12. Risk Mitigation

### 12.1 Cost Overruns

**Mitigation:**
- Set hard limits on batch size
- Implement rate limiting per user
- Monitor costs in real-time
- Auto-pause processing if costs exceed threshold

### 12.2 Credit Abuse

**Mitigation:**
- Rate limiting per IP/user
- Fraud detection for credit purchases
- Monitor for unusual patterns
- Require email verification for free tier

### 12.3 Margin Erosion

**Mitigation:**
- Regular cost reviews (monthly)
- Adjust pricing if costs increase
- Optimize AI usage (cache, batch processing)
- Negotiate better rates with providers as volume grows

---

## 13. Future Enhancements

### 13.1 Credit Marketplace

Allow users to:
- Gift credits to other users
- Transfer credits between accounts
- Sell unused credits (with platform fee)

### 13.2 Credit Rewards

- Daily login bonus: 5 credits
- Completing tutorials: 20 credits
- Providing feedback: 10 credits
- Bug reports: 50 credits

### 13.3 Enterprise Tier

- Custom pricing based on volume
- Dedicated support
- SLA guarantees
- Custom integrations

---

## 14. Appendix: Cost Calculation Examples

### Example 1: Free Tier - 3 Average Videos

**Operations:**
- 3 transcript fetches
- 1 final summary (qwen-plus)

**Costs:**
- Supadata: 3 × $0.0057 = $0.0171
- Qwen: (8,300 × $0.000114) + (1,300 × $0.000286) = $0.001318
- Firebase: $0.00001
- **Total: $0.0184**

**Credits Charged:** 40 credits = $0.04
**Margin:** ($0.04 - $0.0184) / $0.0184 = **117.4%**

---

### Example 2: Pro Tier - 10 Videos (5 Long)

**Operations:**
- 10 transcript fetches
- 5 pre-condensing operations (qwen-flash)
- 1 final summary (qwen-plus)

**Costs:**
- Supadata: 10 × $0.0057 = $0.057
- Pre-condensing: (52,000 × $0.000021) + (26,000 × $0.000214) = $0.006656
- Final summary: (39,500 × $0.000114) + (2,600 × $0.000286) = $0.005307
- Firebase: $0.00001
- **Total: $0.069**

**Credits Charged:** 120 credits = $0.12
**Margin:** ($0.12 - $0.069) / $0.069 = **73.9%**

---

### Example 3: Premium Tier - 10 Videos (qwen-max)

**Operations:**
- 10 transcript fetches
- 5 pre-condensing operations (qwen-flash)
- 1 final summary (qwen-max)

**Costs:**
- Supadata: 10 × $0.0057 = $0.057
- Pre-condensing: (52,000 × $0.000021) + (26,000 × $0.000214) = $0.006656
- Final summary: (39,500 × $0.000228) + (2,600 × $0.000572) = $0.010493
- Firebase: $0.00001
- **Total: $0.074**

**Credits Charged:** 120 credits = $0.12
**Margin:** ($0.12 - $0.074) / $0.074 = **62.2%**

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Status:** Draft - Ready for Review  
**Next Steps:** Review cost calculations, adjust pricing tiers, implement credit system

