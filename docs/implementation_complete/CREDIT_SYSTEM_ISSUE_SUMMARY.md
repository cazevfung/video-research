# Credit System Issue: Hardcoded vs. Dynamic Balance

## Quick Summary

**Issue Identified**: The user's credit balance shown in the UI (3 credits remaining) is stored as a hardcoded value in the Firestore user document. This creates multiple problems including race conditions, no audit trail, and data inconsistency.

**Impact**: High - Affects billing accuracy, user trust, and system reliability.

**Status**: New transactional credit system already exists but is not fully utilized.

---

## The Problem (Visual Explanation)

### What User Sees
```
┌─────────────────────────────┐
│  Account Page               │
│  ┌─────────────────────┐   │
│  │  Credit Balance     │   │
│  │                     │   │
│  │       3             │   │  ← This number is HARDCODED
│  │  of 50 credits      │   │     in Firestore!
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### What's in Firestore (Current)
```
users/Ayil1pydGOIngE8DerfpEtaNCk2 {
  name: "Cazev Fung",
  email: "cazevfung@gmail.com",
  tier: "premium",
  credits_remaining: 3,  ❌ HARDCODED VALUE
  created_at: "January 9, 2026",
  last_reset: "January 9, 2026"
}
```

### Why This is Bad

**Scenario: Race Condition**
```
Time    User Request A                User Request B
────────────────────────────────────────────────────────
0ms     Read credits: 3               
1ms     Check: 3 > 0 ✓               Read credits: 3
2ms     Process video...              Check: 3 > 0 ✓
3ms                                   Process video...
4ms     Deduct: 3 → 2                
5ms     Write to DB: credits=2        Deduct: 3 → 2
6ms                                   Write to DB: credits=2
────────────────────────────────────────────────────────
Result: User processed 2 videos but only got charged for 1!
        Lost revenue + data corruption
```

**Scenario: No Audit Trail**
```
User: "I had 10 credits yesterday, now I have 3. What happened?"
Support: "Let me check... uh... I can't see any transaction history."
User: "So you just took my credits and can't tell me where they went?"
Support: "..." 😬
```

**Scenario: Stale Data**
```
User on Phone                    User on Laptop
─────────────────                ─────────────────
Shows: 5 credits                 Shows: 3 credits
Process 1 video                  
Now shows: 4 credits             Still shows: 3 credits (!!)
                                 User confused why balance differs
```

---

## Current Architecture (Dual System)

We have TWO credit systems running:

### 1. Legacy System ❌ (Currently Used by Frontend)
```
users/{userId}
  └─ credits_remaining: 3  ← HARDCODED

When user processes video:
1. Read user document
2. Check credits_remaining > 0
3. Process video
4. Update credits_remaining -= 1

Problems:
- Not atomic (race conditions)
- No transaction record
- No way to audit changes
- Direct field mutation
```

### 2. New Transactional System ✅ (Exists but Underutilized)
```
user_credits/{userId}
  ├─ balance: 3  ← CALCULATED DYNAMICALLY
  ├─ totalEarned: 120
  ├─ totalSpent: 117
  └─ lastResetDate: "2026-01-09"

credit_transactions/{transactionId}
  ├─ userId
  ├─ type: "spent"
  ├─ amount: -1
  ├─ balanceBefore: 4
  ├─ balanceAfter: 3
  ├─ description: "Batch processing: 1 video"
  ├─ metadata: { batchId: "xyz123" }
  └─ timestamp: "2026-01-09T10:30:00Z"

When user processes video:
1. Start Firestore transaction
2. Read user_credits (locked)
3. Check balance > 0
4. Process video
5. Update balance atomically
6. Create transaction record
7. Commit (all or nothing)

Benefits:
- Atomic operations (no race conditions)
- Full audit trail
- Can see transaction history
- Can implement refunds
- Can track usage patterns
```

---

## Code Evidence

### Backend: Dual System in Action

**summary.service.ts** (LINE 1057) - Uses new system:
```typescript
// Deduct credits using new credit service
await deductCredits(userId, creditCost, {
  batchId: summary.id || jobId,
  description: `Batch processing: ${request.urls.length} video(s)`,
});
```

**quota.service.ts** (LINE 64) - Uses legacy system:
```typescript
// ❌ Direct field update (not atomic)
await updateUser(userId, {
  credits_remaining: user.credits_remaining - 1,
});
```

**Frontend reads legacy field** - CreditBadge.tsx (LINE 48):
```typescript
const creditsRemaining = quota.credits_remaining;  // ❌ Hardcoded value
```

### The Disconnect

```
Backend Processing     Backend API Endpoint     Frontend Display
─────────────────     ────────────────────     ────────────────
New System ✅          Legacy System ❌         Shows Legacy ❌
(deductCredits)       (quota.credits_           (quota.credits_
                       remaining)                remaining)

Transaction recorded   No transaction data      User sees stale value
in audit trail        in response              
```

---

## Real-World Impact

### Impact on Business
1. **Revenue Loss**: Race conditions mean users can consume more than they paid for
2. **Support Burden**: Can't resolve disputes without transaction history
3. **Trust Issues**: Users can't verify their credit usage
4. **Scaling Risk**: Race conditions get worse with more concurrent users

### Impact on Users
1. **Confusion**: Balance differs across devices
2. **Frustration**: Can't see where credits went
3. **Distrust**: No transparency in billing
4. **Poor UX**: Balance may not update immediately

### Impact on Developers
1. **Debug Difficulty**: Can't trace credit issues
2. **Data Integrity**: Credits can become incorrect
3. **Feature Limitations**: Can't implement refunds, promotions
4. **Technical Debt**: Maintaining two systems

---

## The Solution (High-Level)

### 1. Use Existing Transactional System Everywhere
- Backend already has it built (credit.service.ts)
- Just need to route all operations through it
- Frontend needs to read from it instead of legacy field

### 2. Migration Strategy
```
Phase 1: Update API endpoints to return dynamic balance
         └─ Frontend shows correct balance immediately
         
Phase 2: Migrate user data to new system
         └─ Lazy migration: users migrate on first access
         
Phase 3: Add transaction history to frontend
         └─ Users can see credit usage history
         
Phase 4: Deprecate legacy field
         └─ Remove hardcoded credits_remaining
```

### 3. Result After Migration
```
┌─────────────────────────────────────┐
│  Account Page                       │
│  ┌───────────────────────────────┐ │
│  │  Credit Balance               │ │
│  │                               │ │
│  │       3                       │ │ ← Dynamic from user_credits
│  │  of 50 credits                │ │
│  └───────────────────────────────┘ │
│                                     │
│  Transaction History                │
│  ┌───────────────────────────────┐ │
│  │ Jan 9  Batch processing   -1  │ │ ← Full audit trail
│  │ Jan 9  Daily reset        +40 │ │
│  │ Jan 8  Batch processing   -2  │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Why We Didn't Notice This Before

1. **Low Concurrency**: In development/testing, users don't process videos simultaneously
2. **Small User Base**: Race conditions are rare with few users
3. **It "Works"**: The hardcoded system does function for basic use cases
4. **Two Systems**: Backend was already using new system for deductions, but API/frontend still reading legacy

---

## Documents Available

### 📄 credit_system_migration_plan.md
**Purpose**: Comprehensive implementation plan
**Contains**:
- Detailed migration strategy (4-week timeline)
- Code examples for every component
- Database schema changes
- Testing strategy
- Risk mitigation
- Rollback plan

**Use this document when**: Ready to implement the fix

### 📄 CREDIT_SYSTEM_ISSUE_SUMMARY.md (This Document)
**Purpose**: Explain the problem and why it matters
**Contains**:
- Visual explanation of the issue
- Real-world impact
- Current architecture
- High-level solution

**Use this document when**: Explaining the issue to stakeholders

---

## Immediate Next Steps

### Option A: Quick Fix (1-2 days)
Update API endpoint to return dynamic balance:
```typescript
// backend/src/controllers/user.controller.ts
const balance = await checkCreditBalance(userId);  // From new system
res.json({ credits_remaining: balance, ... });     // Frontend shows correct value
```
**Pros**: Frontend immediately shows accurate balance
**Cons**: Doesn't fix race conditions or add audit trail

### Option B: Full Migration (4 weeks)
Follow the comprehensive plan in `credit_system_migration_plan.md`
**Pros**: Fixes all issues, adds features, future-proof
**Cons**: Takes longer

### Recommendation
**Start with Option A** (quick fix for visible bug), then **proceed with Option B** (full migration) for long-term stability.

---

## Questions & Answers

**Q: Why not just use Firestore transactions on the legacy field?**  
A: We could, but the new system already exists with better architecture. Migration is actually easier than retrofitting.

**Q: Will this break existing users?**  
A: No - migration is designed to be backward compatible with zero downtime.

**Q: How long until we see benefits?**  
A: Week 1 = API shows dynamic balance. Week 3 = Full audit trail. Week 4 = 100% migrated.

**Q: What if we do nothing?**  
A: Race conditions will get worse as user base grows. Credit disputes will be impossible to resolve. Revenue loss from race conditions will increase.

**Q: Is this really high priority?**  
A: Yes - it affects billing accuracy, which directly impacts revenue and user trust. The longer we wait, the more difficult migration becomes.

---

## Related Files

- `backend/src/services/credit.service.ts` - New transactional system (✅ good)
- `backend/src/services/quota.service.ts` - Legacy system (❌ to be deprecated)
- `backend/src/models/User.ts` - Defines hardcoded field
- `frontend/src/hooks/useUserData.ts` - Fetches legacy data
- `docs/credit_system_migration_plan.md` - Full implementation plan

---

## Conclusion

The credit system needs to migrate from hardcoded values to dynamic calculation with transactional guarantees. The good news is that the new system already exists - we just need to route all operations through it and deprecate the legacy field.

**Bottom Line**: This is a **high-priority architectural fix** that prevents revenue loss, enables better user experience, and provides foundation for future features like refunds and promotions.

