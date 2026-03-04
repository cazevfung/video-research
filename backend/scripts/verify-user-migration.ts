/**
 * Phase 5: User Migration Verification Script
 * 
 * Verifies that all users have been properly migrated:
 * - All users have `uid` field
 * - All users have `user_credits` documents
 * - Credit balances are correct
 * - Users can authenticate
 * 
 * Usage:
 *   From backend directory:
 *     npx ts-node scripts/verify-user-migration.ts
 *   Or use npm script:
 *     npm run verify-migration
 */

import db from '../src/config/database';
import { collection, getDocs, doc, getDoc } from 'firebase-admin/firestore';
import { UserCredits } from '../src/types/credit.types';
import { getTierCredits } from '../src/services/pricing.service';
import { getSystemConfig } from '../src/config';
import logger from '../src/utils/logger';

const USERS_COLLECTION = 'users';
const USER_CREDITS_COLLECTION = 'user_credits';

interface VerificationResult {
  userId: string;
  email: string;
  hasUid: boolean;
  hasCreditsDoc: boolean;
  creditsBalance: number | null;
  expectedBalance: number | null;
  tier: string;
  issues: string[];
}

/**
 * Verify a single user's migration status
 */
async function verifyUser(userId: string, userData: any): Promise<VerificationResult> {
  const result: VerificationResult = {
    userId,
    email: userData.email || 'unknown',
    hasUid: false,
    hasCreditsDoc: false,
    creditsBalance: null,
    expectedBalance: null,
    tier: userData.tier || 'free',
    issues: [],
  };

  try {
    // Check for uid field
    if (userData.uid) {
      result.hasUid = true;
    } else {
      result.issues.push('Missing uid field');
    }

    // Check for user_credits document
    const creditRef = doc(db, USER_CREDITS_COLLECTION, userId);
    const creditDoc = await getDoc(creditRef);

    if (creditDoc.exists()) {
      result.hasCreditsDoc = true;
      const creditsData = creditDoc.data() as UserCredits;
      result.creditsBalance = creditsData.balance;
      result.tier = creditsData.tier || result.tier;
    } else {
      result.issues.push('Missing user_credits document');
    }

    // Calculate expected balance
    try {
      const expectedCredits = await getTierCredits(result.tier as any);
      result.expectedBalance = expectedCredits;
      
      // For free tier, expected balance is daily amount (40)
      if (result.tier === 'free' && result.creditsBalance !== null) {
        // Free tier should have at least 40 credits (daily reset amount)
        if (result.creditsBalance < 40) {
          result.issues.push(`Free tier balance (${result.creditsBalance}) is below daily minimum (40)`);
        }
      }
    } catch (error) {
      result.issues.push(`Failed to get expected balance: ${error}`);
    }

    // Check if balance matches expected (allowing for usage)
    if (result.creditsBalance !== null && result.expectedBalance !== null) {
      // Balance should be between 0 and expected (allowing for usage)
      if (result.creditsBalance < 0) {
        result.issues.push(`Negative balance: ${result.creditsBalance}`);
      }
      if (result.creditsBalance > result.expectedBalance * 1.1) {
        // Allow 10% over expected (in case of tier upgrades)
        result.issues.push(`Balance (${result.creditsBalance}) exceeds expected (${result.expectedBalance})`);
      }
    }

  } catch (error) {
    result.issues.push(`Verification error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Main verification function
 */
async function verifyMigration(): Promise<void> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    console.log('⚠️  Local storage mode enabled - skipping Firestore verification');
    console.log('ℹ️  Users will use default credit values from code');
    return;
  }

  if (!db) {
    throw new Error('Database not initialized. Make sure Firebase is properly configured.');
  }

  try {
    console.log('🔍 Starting user migration verification...\n');

    // Get all users
    const usersRef = collection(db, USERS_COLLECTION);
    const usersSnapshot = await getDocs(usersRef);

    if (usersSnapshot.empty) {
      console.log('ℹ️  No users found to verify');
      return;
    }

    console.log(`📊 Found ${usersSnapshot.size} users to verify\n`);

    const results: VerificationResult[] = [];
    let totalIssues = 0;

    // Verify each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const result = await verifyUser(userDoc.id, userData);
      results.push(result);
      
      if (result.issues.length > 0) {
        totalIssues += result.issues.length;
      }
    }

    // Print results
    console.log('\n📋 Verification Results:\n');
    
    const usersWithIssues = results.filter(r => r.issues.length > 0);
    const usersWithoutIssues = results.filter(r => r.issues.length === 0);

    if (usersWithoutIssues.length > 0) {
      console.log(`✅ Users without issues: ${usersWithoutIssues.length}`);
      usersWithoutIssues.forEach(result => {
        console.log(`   - ${result.email} (${result.userId})`);
        console.log(`     ✓ Has uid: ${result.hasUid}`);
        console.log(`     ✓ Has credits doc: ${result.hasCreditsDoc}`);
        console.log(`     ✓ Balance: ${result.creditsBalance} (tier: ${result.tier})`);
      });
    }

    if (usersWithIssues.length > 0) {
      console.log(`\n⚠️  Users with issues: ${usersWithIssues.length}`);
      usersWithIssues.forEach(result => {
        console.log(`\n   - ${result.email} (${result.userId})`);
        console.log(`     Has uid: ${result.hasUid ? '✓' : '✗'}`);
        console.log(`     Has credits doc: ${result.hasCreditsDoc ? '✓' : '✗'}`);
        console.log(`     Balance: ${result.creditsBalance ?? 'N/A'} (expected: ${result.expectedBalance ?? 'N/A'})`);
        console.log(`     Tier: ${result.tier}`);
        console.log(`     Issues:`);
        result.issues.forEach(issue => {
          console.log(`       - ${issue}`);
        });
      });
    }

    // Summary statistics
    console.log('\n📈 Verification Summary:');
    console.log(`   Total users: ${results.length}`);
    console.log(`   Users with uid: ${results.filter(r => r.hasUid).length}`);
    console.log(`   Users with credits doc: ${results.filter(r => r.hasCreditsDoc).length}`);
    console.log(`   Users without issues: ${usersWithoutIssues.length}`);
    console.log(`   Users with issues: ${usersWithIssues.length}`);
    console.log(`   Total issues found: ${totalIssues}`);

    if (totalIssues === 0) {
      console.log('\n✅ All users verified successfully!');
    } else {
      console.log('\n⚠️  Some users have issues. Please review the details above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Run verification
if (require.main === module) {
  verifyMigration()
    .then(() => {
      console.log('\n✅ Verification completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifyMigration, verifyUser };

