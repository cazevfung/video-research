# Credit System Migration Plan: From Hardcoded to Dynamic

## Executive Summary

**Problem**: The application currently uses a hardcoded `credits_remaining` field in the user document, which leads to:
- Race conditions during concurrent requests
- No audit trail of credit transactions
- Stale data when displayed across multiple sessions
- Difficulty in reconciling credit usage
- No way to track credit history or disputes

**Solution**: Migrate to a fully transactional credit system using the existing infrastructure in `credit.service.ts`, deprecate the hardcoded field, and ensure all credit operations are atomic and auditable.

**Status**: The new credit system already exists but is running in parallel with the legacy system. Frontend still reads from the legacy hardcoded field.

---

## Current State Analysis

### Dual Credit Systems

We currently have TWO credit systems running simultaneously:

#### 1. Legacy System (quota.service.ts)
- **Storage**: `users` collection → `credits_remaining` field (hardcoded)
- **Operations**: Direct field updates via `updateUser()`
- **Issues**:
  - ❌ No atomic operations
  - ❌ No audit trail
  - ❌ Race conditions possible
  - ❌ Can become stale/out-of-sync
  - ❌ No transaction history

```typescript
// Example from quota.service.ts (LINE 64)
await updateUser(userId, {
  credits_remaining: user.credits_remaining - 1,  // ❌ Not atomic!
});
```

#### 2. New System (credit.service.ts)
- **Storage**: 
  - `user_credits` collection → balance, totalEarned, totalSpent
  - `credit_transactions` collection → audit trail
- **Operations**: Firestore transactions for atomicity
- **Benefits**:
  - ✅ Atomic operations via Firestore transactions
  - ✅ Full audit trail
  - ✅ Prevents race conditions
  - ✅ Supports refunds, adjustments
  - ✅ Transaction history tracking

```typescript
// Example from credit.service.ts (LINE 157)
await db.runTransaction(async (transaction: Transaction) => {
  // Atomic read-modify-write
  const creditDoc = await transaction.get(creditRef);
  const newBalance = currentBalance - amount;
  transaction.update(creditRef, { balance: newBalance });
  transaction.set(transactionRef, transactionRecord);  // ✅ Audit trail
});
```

### Problem Areas

#### Backend
1. **summary.service.ts** (LINE 1057): Uses new `deductCredits()` but frontend reads legacy field
2. **quota.service.ts** (LINE 64, 138): Still uses legacy `credits_remaining`
3. **User.ts** (LINE 19, 186): Defines `credits_remaining` field
4. **auth.controller.ts** (LINE 162): Initializes hardcoded field

#### Frontend
1. **useUserData.ts**: Fetches `/api/user/quota` which returns legacy field
2. **CreditBadge.tsx** (LINE 48): Displays `quota.credits_remaining`
3. **UserMenu.tsx** (LINE 64): Shows `quota.credits_remaining`
4. **CreditBalanceCard.tsx** (LINE 57): Uses `quota.credits_remaining`

---

## Migration Strategy

### Phase 1: Database Schema Changes

#### 1.1 Create New Collections (Already Exists ✅)
- ✅ `user_credits` collection
- ✅ `credit_transactions` collection

#### 1.2 Add Migration Flag to Users
Add temporary field to track migration status:

```typescript
interface User {
  // ... existing fields
  credit_system_migrated?: boolean;  // NEW: Track migration status
  legacy_credits_remaining?: number;  // NEW: Backup of old value
}
```

### Phase 2: Backend Service Layer Updates

#### 2.1 Create Unified Credit Service
Create new `credit-facade.service.ts` that:
- Checks `credit_system_migrated` flag
- Routes to appropriate service (legacy vs new)
- Handles gradual migration

```typescript
// backend/src/services/credit-facade.service.ts
export async function getCreditBalance(userId: string): Promise<number> {
  const user = await getUserById(userId);
  
  if (user?.credit_system_migrated) {
    // Use new system
    return await checkCreditBalance(userId);
  } else {
    // Use legacy system (fallback)
    return user?.credits_remaining || 0;
  }
}

export async function deductCreditsFacade(
  userId: string, 
  amount: number,
  metadata: any
): Promise<void> {
  const user = await getUserById(userId);
  
  if (user?.credit_system_migrated) {
    // Use new transactional system
    await deductCredits(userId, amount, metadata);
  } else {
    // Use legacy system and trigger migration
    await deductCredit(userId);  // Legacy
    await migrateUserToNewCreditSystem(userId);  // Auto-migrate
  }
}
```

#### 2.2 Update API Endpoints

**Current**: `/api/user/quota` returns:
```json
{
  "credits_remaining": 3,  // ❌ From user.credits_remaining
  "tier": "premium",
  "daily_limit": 50
}
```

**New**: `/api/user/quota` should return:
```json
{
  "credits_remaining": 3,  // ✅ From user_credits.balance
  "tier": "premium",
  "daily_limit": 50,
  "last_reset": "2026-01-09T00:00:00Z",
  "system": "transactional"  // Indicator for debugging
}
```

**Implementation**:
```typescript
// backend/src/controllers/user.controller.ts
export async function getQuota(req: Request, res: Response) {
  const userId = req.user!.id;
  
  // Use facade to get balance from appropriate system
  const balance = await getCreditBalance(userId);
  const user = await getUserById(userId);
  const tierConfig = getTierConfig(user.tier);
  
  res.json({
    credits_remaining: balance,  // ✅ Dynamic, not hardcoded
    tier: user.tier,
    daily_limit: tierConfig.daily_limit,
    max_videos_per_batch: tierConfig.max_videos_per_batch,
    reset_time: calculateResetTime(user),
  });
}
```

#### 2.3 Add New Endpoint for Credit History
```typescript
// GET /api/user/credits/transactions
export async function getCreditTransactionHistory(req: Request, res: Response) {
  const userId = req.user!.id;
  const { limit = 50, offset = 0 } = req.query;
  
  const transactions = await getCreditTransactions(userId, limit, offset);
  
  res.json({
    transactions: transactions.map(t => ({
      id: t.transactionId,
      type: t.type,
      amount: t.amount,
      balance_before: t.balanceBefore,
      balance_after: t.balanceAfter,
      description: t.description,
      timestamp: t.timestamp,
      metadata: t.metadata,
    })),
  });
}
```

### Phase 3: Frontend Updates

#### 3.1 Update API Types
```typescript
// frontend/src/types/user.ts
export interface QuotaInfo {
  credits_remaining: number;  // Keep name for compatibility
  tier: UserTier;
  daily_limit: number;
  max_videos_per_batch: number;
  reset_time: string;
  system?: 'legacy' | 'transactional';  // For debugging
}

// NEW: Credit transaction history
export interface CreditTransaction {
  id: string;
  type: 'spent' | 'earned' | 'reset' | 'refund' | 'adjustment';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  timestamp: string;
  metadata?: {
    batchId?: string;
    tierUpgrade?: string;
  };
}
```

#### 3.2 Update useUserData Hook
```typescript
// frontend/src/hooks/useUserData.ts
export function useUserData() {
  // ... existing code
  
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  
  const fetchQuota = useCallback(async () => {
    // This now returns dynamic balance, not hardcoded
    const response = await fetch('/api/user/quota', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setQuota(data);  // ✅ Now uses real-time balance
  }, [token]);
  
  const fetchTransactionHistory = useCallback(async () => {
    const response = await fetch('/api/user/credits/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setTransactions(data.transactions);
  }, [token]);
  
  return {
    user,
    quota,  // ✅ Dynamic balance
    transactions,  // NEW: Transaction history
    fetchTransactionHistory,
    // ... rest
  };
}
```

#### 3.3 Update Credit Display Components
No changes needed! Since we're keeping the `credits_remaining` field name in the API response, components like `CreditBadge`, `UserMenu`, and `CreditBalanceCard` will automatically display the dynamic value.

#### 3.4 Add Transaction History UI
Create new component to display credit history:

```typescript
// frontend/src/components/account/CreditTransactionHistory.tsx
export function CreditTransactionHistory() {
  const { transactions, fetchTransactionHistory } = useUserData();
  
  useEffect(() => {
    fetchTransactionHistory();
  }, []);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your credit usage and earnings</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(t => (
              <TableRow key={t.id}>
                <TableCell>{formatDate(t.timestamp)}</TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell className={t.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                  {t.amount > 0 ? '+' : ''}{t.amount}
                </TableCell>
                <TableCell>{t.balance_after}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

### Phase 4: Data Migration

#### 4.1 Migration Script
Create script to migrate existing users:

```typescript
// backend/scripts/migrate-credit-system.ts
import { getAllUsers } from '../models/User';
import { initializeUserCredits } from '../services/credit.service';
import { updateUser } from '../models/User';

async function migrateAllUsers() {
  const users = await getAllUsers();
  
  for (const user of users) {
    if (user.credit_system_migrated) {
      console.log(`User ${user.id} already migrated, skipping...`);
      continue;
    }
    
    try {
      // 1. Check if user_credits already exists
      const existingCredits = await getUserCredits(user.id);
      
      if (!existingCredits) {
        // 2. Initialize new credit system with current balance
        await initializeUserCredits(user.id, user.tier);
        
        // 3. If they have different balance than default, adjust it
        if (user.credits_remaining !== undefined) {
          const defaultCredits = await getTierCredits(user.tier);
          const difference = user.credits_remaining - defaultCredits;
          
          if (difference !== 0) {
            await addCredits(
              user.id,
              Math.abs(difference),
              difference > 0 ? 'earned' : 'adjustment',
              { description: 'Migration adjustment from legacy system' }
            );
          }
        }
      }
      
      // 4. Mark user as migrated
      await updateUser(user.id, {
        credit_system_migrated: true,
        legacy_credits_remaining: user.credits_remaining,
      });
      
      console.log(`✅ Migrated user ${user.id}`);
    } catch (error) {
      console.error(`❌ Failed to migrate user ${user.id}:`, error);
    }
  }
}
```

#### 4.2 Incremental Migration Strategy
Instead of migrating all users at once, use lazy migration:

```typescript
// Automatically migrate users when they make their first request
async function autoMigrateOnAccess(userId: string) {
  const user = await getUserById(userId);
  
  if (!user.credit_system_migrated) {
    await migrateUserToNewCreditSystem(userId);
  }
}

// Call this in authentication middleware
export async function authMiddleware(req, res, next) {
  // ... existing auth logic
  
  // Auto-migrate on access
  await autoMigrateOnAccess(req.user.id);
  
  next();
}
```

### Phase 5: Deprecation & Cleanup

#### 5.1 Deprecate Legacy Fields (After 100% Migration)
```typescript
// backend/src/models/User.ts
export interface User {
  id?: string;
  email: string;
  uid?: string;
  name: string;
  tier: UserTier;
  
  // ⚠️ DEPRECATED: Use credit.service instead
  // Will be removed in v2.0
  /** @deprecated Use getUserCredits() from credit.service */
  credits_remaining?: number;
  
  created_at: Date | string;
  last_reset?: Date | string;
  
  // Migration tracking
  credit_system_migrated?: boolean;
  legacy_credits_remaining?: number;
}
```

#### 5.2 Remove Legacy Service (v2.0)
After all users are migrated:
1. Remove `quota.service.ts` entirely
2. Remove `credits_remaining` field from User interface
3. Update all imports to use `credit.service.ts` directly
4. Remove migration flags

---

## Implementation Checklist

### Week 1: Backend Foundation
- [ ] Create `credit-facade.service.ts`
- [ ] Update `/api/user/quota` endpoint to use dynamic balance
- [ ] Add `/api/user/credits/transactions` endpoint
- [ ] Add migration flag to User interface
- [ ] Create migration script
- [ ] Test with local storage mode

### Week 2: Frontend Updates
- [ ] Update `useUserData` hook to support new endpoints
- [ ] Create `CreditTransactionHistory` component
- [ ] Add transaction history to Account page
- [ ] Test all credit display components
- [ ] Update types in `types/user.ts`

### Week 3: Migration & Testing
- [ ] Run migration script for test users
- [ ] Monitor logs for migration errors
- [ ] Test concurrent credit deduction (race conditions)
- [ ] Verify audit trail in Firestore
- [ ] Load test with multiple simultaneous requests

### Week 4: Rollout & Monitoring
- [ ] Enable lazy migration in production
- [ ] Monitor migration progress
- [ ] Watch for credit balance discrepancies
- [ ] Collect user feedback
- [ ] Fix any edge cases discovered

### Week 5: Deprecation
- [ ] Mark legacy fields as deprecated
- [ ] Update documentation
- [ ] Plan for v2.0 cleanup

---

## Benefits After Migration

### Technical Benefits
1. **Atomicity**: All credit operations are atomic via Firestore transactions
2. **Audit Trail**: Full history of every credit change
3. **Real-time**: Credits always reflect current state (no stale data)
4. **Scalability**: No race conditions, safe for concurrent operations
5. **Debugging**: Transaction history makes it easy to debug issues

### Business Benefits
1. **Customer Support**: Can see exactly when/how credits were used
2. **Dispute Resolution**: Clear audit trail for billing disputes
3. **Analytics**: Track credit usage patterns
4. **Flexibility**: Easy to implement refunds, adjustments, promotions
5. **Trust**: Users can see their own transaction history

### User Experience Benefits
1. **Transparency**: Users can see credit history
2. **Accuracy**: Always shows correct balance
3. **Consistency**: Same balance across all devices/sessions
4. **Trust**: Clear record of all transactions

---

## Risk Mitigation

### Risk 1: Migration Errors
**Mitigation**:
- Incremental lazy migration (not all at once)
- Keep legacy field as backup during transition
- Log all migration attempts
- Manual verification for high-value users

### Risk 2: Performance Impact
**Mitigation**:
- Use Firestore transactions efficiently
- Cache credit balance in frontend (with TTL)
- Monitor transaction read/write costs
- Consider batch operations for admin actions

### Risk 3: Data Inconsistency During Transition
**Mitigation**:
- Facade service ensures single source of truth
- Migration flag prevents double-billing
- Legacy field kept as backup
- Rollback plan if issues detected

### Risk 4: Frontend Breaking Changes
**Mitigation**:
- Keep API response format identical
- `credits_remaining` name unchanged
- Gradual rollout with feature flags
- Monitor error logs

---

## Testing Strategy

### Unit Tests
```typescript
describe('Credit Facade Service', () => {
  it('should route to new system for migrated users', async () => {
    const user = { id: '123', credit_system_migrated: true };
    const balance = await getCreditBalance(user.id);
    // Assert balance comes from user_credits collection
  });
  
  it('should route to legacy system for non-migrated users', async () => {
    const user = { id: '456', credit_system_migrated: false };
    const balance = await getCreditBalance(user.id);
    // Assert balance comes from user.credits_remaining
  });
  
  it('should auto-migrate on first deduction', async () => {
    const user = { id: '789', credit_system_migrated: false };
    await deductCreditsFacade(user.id, 1, {});
    // Assert user.credit_system_migrated is now true
  });
});
```

### Integration Tests
```typescript
describe('Credit System Integration', () => {
  it('should prevent race conditions', async () => {
    const userId = 'test-user';
    
    // Simulate 5 concurrent credit deductions
    const promises = Array(5).fill(null).map(() => 
      deductCredits(userId, 1, { description: 'Test' })
    );
    
    await Promise.all(promises);
    
    // Verify balance decreased by exactly 5
    const balance = await checkCreditBalance(userId);
    expect(balance).toBe(initialBalance - 5);
  });
  
  it('should maintain audit trail', async () => {
    const userId = 'test-user';
    
    await deductCredits(userId, 3, { batchId: 'test-batch' });
    
    const transactions = await getCreditTransactions(userId);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toBe(-3);
    expect(transactions[0].metadata.batchId).toBe('test-batch');
  });
});
```

### Load Tests
```typescript
// Test concurrent operations
async function loadTest() {
  const users = generateTestUsers(100);
  const concurrentRequests = 1000;
  
  const startTime = Date.now();
  
  const promises = Array(concurrentRequests).fill(null).map(() => {
    const user = users[Math.floor(Math.random() * users.length)];
    return deductCredits(user.id, 1, { description: 'Load test' });
  });
  
  await Promise.all(promises);
  
  const duration = Date.now() - startTime;
  console.log(`Completed ${concurrentRequests} requests in ${duration}ms`);
  
  // Verify no credit inconsistencies
  for (const user of users) {
    const balance = await checkCreditBalance(user.id);
    const transactions = await getCreditTransactions(user.id);
    const calculatedBalance = initialBalance - transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    expect(balance).toBe(calculatedBalance);
  }
}
```

---

## Monitoring & Observability

### Metrics to Track
1. **Migration Progress**
   - % of users migrated
   - Migration success/failure rate
   - Average migration time

2. **Credit Operations**
   - Credit deductions per second
   - Failed deductions (insufficient credits)
   - Transaction creation rate

3. **Performance**
   - Credit balance fetch latency
   - Transaction write latency
   - Firestore read/write costs

4. **Data Integrity**
   - Credit balance discrepancies
   - Failed transactions
   - Rollback attempts

### Logging
```typescript
logger.info('Credit operation', {
  userId,
  operation: 'deduct',
  amount,
  balanceBefore,
  balanceAfter,
  system: 'transactional',
  transactionId,
  duration: Date.now() - startTime,
});
```

### Alerts
- Alert if migration failure rate > 1%
- Alert if credit balance goes negative
- Alert if transaction write fails
- Alert if balance fetch latency > 500ms

---

## Success Criteria

### Phase 1 Success (Week 1)
- ✅ All API endpoints return dynamic balance
- ✅ Migration script runs without errors
- ✅ Test users successfully migrated

### Phase 2 Success (Week 2)
- ✅ Frontend displays dynamic balance
- ✅ Transaction history visible to users
- ✅ No breaking changes for existing users

### Phase 3 Success (Week 3)
- ✅ 90%+ users auto-migrated
- ✅ Zero credit balance discrepancies
- ✅ Load tests pass (1000 concurrent requests)

### Phase 4 Success (Week 4)
- ✅ 100% users migrated
- ✅ Legacy system disabled
- ✅ Zero production incidents

---

## Rollback Plan

If critical issues are discovered:

1. **Immediate**: Disable lazy migration in auth middleware
2. **Revert API**: Return API endpoints to legacy field
3. **Database**: Keep both systems running (no data loss)
4. **Investigation**: Analyze logs to identify root cause
5. **Fix**: Address issues in development environment
6. **Retry**: Re-enable migration after fixes verified

---

## Appendix: Database Schema

### Current (Legacy)
```
users/{userId}
  ├─ email: string
  ├─ name: string
  ├─ tier: "free" | "starter" | "pro" | "premium"
  ├─ credits_remaining: number  ❌ HARDCODED
  ├─ created_at: timestamp
  └─ last_reset: timestamp
```

### New (Transactional)
```
users/{userId}
  ├─ email: string
  ├─ name: string
  ├─ tier: "free" | "starter" | "pro" | "premium"
  ├─ created_at: timestamp
  ├─ credit_system_migrated: boolean  🆕
  └─ legacy_credits_remaining: number  🆕 (backup)

user_credits/{userId}  🆕
  ├─ balance: number  ✅ DYNAMIC
  ├─ totalEarned: number
  ├─ totalSpent: number
  ├─ lastResetDate: timestamp
  ├─ tier: string
  ├─ tierUnlockedAt: timestamp | null
  └─ tierUnlockedBy: string | null

credit_transactions/{transactionId}  🆕
  ├─ userId: string
  ├─ type: "spent" | "earned" | "reset" | "refund" | "adjustment"
  ├─ amount: number  (negative for deductions)
  ├─ balanceBefore: number
  ├─ balanceAfter: number
  ├─ description: string
  ├─ metadata: object
  └─ timestamp: timestamp
```

---

## Summary

This migration plan transitions the credit system from hardcoded values to a fully transactional, auditable system. The key insight is that we already have the new system built - we just need to route all operations through it and deprecate the legacy field.

**Key Principles:**
1. **Gradual Migration**: Users migrate automatically on access
2. **Zero Downtime**: Both systems run during transition
3. **Data Safety**: Legacy field kept as backup
4. **User Transparency**: Transaction history visible to users
5. **Developer Experience**: Facade service abstracts complexity

**Timeline**: 4-5 weeks from start to 100% migration.

**Effort**: Medium - Most infrastructure already exists, mainly routing and migration logic needed.

