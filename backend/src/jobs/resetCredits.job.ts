import cron from 'node-cron';
import { getUserById, resetDailyCredits } from '../models/User';
import db from '../config/database';
import env from '../config/env';
import { getAuthConfig } from '../config';
import logger from '../utils/logger';

/**
 * Reset daily credits for all users
 * Runs at midnight UTC every day
 * Only runs if AUTH_ENABLED=true
 */
async function resetAllUsersCredits(): Promise<void> {
  if (!env.AUTH_ENABLED) {
    logger.debug('Auth disabled - skipping credit reset job');
    return;
  }

  try {
    logger.info('Starting daily credit reset job');

    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      logger.info('No users found for credit reset');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Reset credits for each user
    const resetPromises = usersSnapshot.docs.map(async (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      try {
        await resetDailyCredits(doc.id);
        successCount++;
      } catch (error) {
        logger.error(`Failed to reset credits for user ${doc.id}`, error);
        errorCount++;
      }
    });

    await Promise.all(resetPromises);

    logger.info('Daily credit reset job completed', {
      total: usersSnapshot.size,
      success: successCount,
      errors: errorCount,
    });
  } catch (error) {
    logger.error('Error in daily credit reset job', error);
  }
}

/**
 * Initialize and start the daily credit reset cron job
 * Only starts if AUTH_ENABLED=true
 */
export function startCreditResetJob(): void {
  if (!env.AUTH_ENABLED) {
    logger.info('Authentication disabled - credit reset job will not run');
    return;
  }

  // Get cron schedule from config
  const authConfig = getAuthConfig();
  const cronSchedule = authConfig.credit_reset_cron;

  logger.info('Starting daily credit reset cron job', {
    schedule: 'Daily credit reset',
    cron: cronSchedule,
  });

  cron.schedule(cronSchedule, async () => {
    await resetAllUsersCredits();
  });

  logger.info('Daily credit reset cron job scheduled successfully');
}

// Auto-start job when module is loaded
startCreditResetJob();

