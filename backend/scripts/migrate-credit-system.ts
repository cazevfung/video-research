/**
 * Migration script: Migrate users from legacy credit system to new transactional system
 * 
 * This script:
 * 1. Queries all existing users from 'users' collection
 * 2. Migrates each user using the credit-facade service
 * 3. Sets migration flags (credit_system_migrated, legacy_credits_remaining)
 * 4. Preserves current credit balance
 * 
 * Usage:
 *   npx ts-node scripts/migrate-credit-system.ts
 * 
 * This script uses the migrateUserToNewCreditSystem function from credit-facade.service.ts
 * which ensures proper migration logic and flag setting.
 */

import db from '../src/config/database';
import { collection, getDocs } from 'firebase-admin/firestore';
import { getUserById } from '../src/models/User';
import { migrateUserToNewCreditSystem } from '../src/services/credit-facade.service';
import { getSystemConfig } from '../src/config';
import logger from '../src/utils/logger';

const USERS_COLLECTION = 'users';

/**
 * Main migration function
 */
async function migrateAllUsers(): Promise<void> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    console.log('⚠️  Local storage mode enabled - skipping Firestore migration');
    console.log('ℹ️  Users will be migrated automatically on first access');
    return;
  }

  if (!db) {
    throw new Error('Database not initialized. Make sure Firebase is properly configured.');
  }

  try {
    console.log('🔄 Starting credit system migration...\n');

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
      const userId = userDoc.id;
      try {
        // Check if user is already migrated
        const user = await getUserById(userId);
        if (!user) {
          console.log(`  ⚠️  User ${userId} not found, skipping`);
          skippedCount++;
          continue;
        }

        if (user.credit_system_migrated) {
          console.log(`  ⏭️  User ${userId} (${user.email}) already migrated, skipping`);
          skippedCount++;
          continue;
        }

        // Migrate user using facade service
        await migrateUserToNewCreditSystem(userId);
        console.log(`  ✅ Migrated user ${userId} (${user.email})`, {
          tier: user.tier,
          legacyBalance: user.credits_remaining,
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Failed to migrate user ${userId}:`, error);
        logger.error(`Failed to migrate user ${userId}`, error);
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
    logger.error('Credit system migration failed', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrateAllUsers()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { migrateAllUsers };


