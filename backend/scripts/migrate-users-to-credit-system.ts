/**
 * Migration script: Migrate existing users to new credit system
 * 
 * This script:
 * 1. Queries all existing users from 'users' collection
 * 2. Creates 'user_credits' documents for each user
 * 3. Initializes balances based on current tier
 * 4. Sets up reset schedules
 * 5. Creates initial transaction records
 * 
 * Usage:
 *   npx ts-node scripts/migrate-users-to-credit-system.ts
 */

import db from '../src/config/database';
import { collection, getDocs, doc, setDoc, getDoc, Timestamp } from 'firebase-admin/firestore';
import { UserCredits, CreditTransaction, UserTier } from '../src/types/credit.types';
import { getTierCredits } from '../src/services/pricing.service';
import { getSystemConfig } from '../src/config';
import logger from '../src/utils/logger';

const USERS_COLLECTION = 'users';
const USER_CREDITS_COLLECTION = 'user_credits';
const CREDIT_TRANSACTIONS_COLLECTION = 'credit_transactions';

/**
 * Migrate a single user to new credit system
 */
async function migrateUser(userId: string, userData: any): Promise<void> {
  try {
    // Check if user_credits document already exists
    const creditRef = doc(db, USER_CREDITS_COLLECTION, userId);
    const creditDoc = await getDoc(creditRef);

    if (creditDoc.exists()) {
      console.log(`  ⏭️  User ${userId} already has credits document, skipping`);
      return;
    }

    // Determine tier (map old 'premium' to new tier system)
    // Old system: 'free' | 'premium'
    // New system: 'free' | 'starter' | 'pro' | 'premium'
    let tier: UserTier = 'free';
    if (userData.tier === 'premium') {
      // For now, map old 'premium' to new 'premium'
      // You can adjust this mapping as needed
      tier = 'premium';
    } else {
      tier = 'free';
    }

    // Get default credits for tier
    const defaultCredits = await getTierCredits(tier);
    
    // Get current credits_remaining from old system
    const oldCredits = userData.credits_remaining || 0;
    
    // For free tier, use daily amount (40) if migrating
    // For paid tiers, use full monthly allocation
    const initialBalance = tier === 'free' 
      ? Math.max(40, oldCredits) // Use daily amount or current balance, whichever is higher
      : Math.max(defaultCredits, oldCredits); // Use tier allocation or current balance, whichever is higher

    // Create user_credits document
    const userCredits: UserCredits = {
      userId,
      balance: initialBalance,
      totalEarned: defaultCredits,
      totalSpent: defaultCredits - initialBalance, // Estimate based on difference
      lastResetDate: userData.last_reset 
        ? (userData.last_reset instanceof Timestamp 
            ? userData.last_reset 
            : Timestamp.fromDate(new Date(userData.last_reset)))
        : Timestamp.now(),
      tier,
      tierUnlockedAt: tier !== 'free' ? Timestamp.now() : null,
      tierUnlockedBy: tier !== 'free' ? userData.email : null,
    };

    await setDoc(creditRef, userCredits);

    // Create initial transaction record
    const transactionRef = doc(collection(db, CREDIT_TRANSACTIONS_COLLECTION));
    const transaction: CreditTransaction = {
      transactionId: transactionRef.id,
      userId,
      type: 'reset',
      amount: initialBalance,
      balanceBefore: 0,
      balanceAfter: initialBalance,
      description: 'Initial migration from old credit system',
      metadata: {
        tierUpgrade: tier,
      },
      timestamp: Timestamp.now(),
    };
    await setDoc(transactionRef, transaction);

    console.log(`  ✅ Migrated user ${userId}`, {
      email: userData.email,
      tier,
      balance: initialBalance,
      oldCredits,
    });
  } catch (error) {
    console.error(`  ❌ Failed to migrate user ${userId}:`, error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function migrateUsers(): Promise<void> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    console.log('⚠️  Local storage mode enabled - skipping Firestore migration');
    console.log('ℹ️  Users will use default credit values from code');
    return;
  }

  if (!db) {
    throw new Error('Database not initialized. Make sure Firebase is properly configured.');
  }

  try {
    console.log('🔄 Starting user migration to new credit system...\n');

    // Get all users
    const usersRef = collection(db, USERS_COLLECTION);
    const usersSnapshot = await getDocs(usersRef);

    if (usersSnapshot.empty) {
      console.log('ℹ️  No users found to migrate');
      return;
    }

    console.log(`📊 Found ${usersSnapshot.size} users to migrate\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Migrate each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        await migrateUser(userDoc.id, userData);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error migrating user ${userDoc.id}:`, error);
        // Continue with next user
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Total users: ${usersSnapshot.size}`);
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ⏭️  Skipped (already migrated): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review the errors above.');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrateUsers()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { migrateUsers };


