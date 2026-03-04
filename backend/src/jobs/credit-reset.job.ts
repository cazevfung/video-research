/**
 * Credit reset jobs
 * 
 * - Daily reset for free tier (midnight UTC)
 * - Monthly reset for paid tiers (first day of month, midnight UTC)
 */

import cron from 'node-cron';
import db from '../config/database';
import { resetDailyCredits, resetMonthlyCredits } from '../services/credit.service';
import logger from '../utils/logger';
import { getSystemConfig } from '../config';

/**
 * Daily reset job for free tier
 * Runs at midnight UTC every day
 * Resets credits to 40 (daily allocation for free tier)
 */
const dailyResetJob = cron.schedule('0 0 * * *', async () => {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    logger.debug('Local storage mode - skipping daily credit reset job');
    return;
  }

  if (!db) {
    logger.error('Database not initialized - cannot run daily credit reset');
    return;
  }

  logger.info('Starting daily credit reset for free tier users');

  try {
    const snapshot = await db
      .collection('user_credits')
      .where('tier', '==', 'free')
      .get();

    logger.info(`Found ${snapshot.size} free tier users to reset`);

    let successCount = 0;
    let errorCount = 0;

    for (const doc of snapshot.docs) {
      try {
        await resetDailyCredits(doc.id);
        successCount++;
      } catch (error) {
        errorCount++;
        logger.error(`Failed to reset credits for user ${doc.id}`, error);
      }
    }

    logger.info('Daily credit reset completed', {
      total: snapshot.size,
      success: successCount,
      errors: errorCount,
    });
  } catch (error) {
    logger.error('Error in daily credit reset job', error);
  }
}, {
  timezone: 'UTC',
});

/**
 * Monthly reset job for paid tiers (starter, pro, premium)
 * Runs on the first day of each month at midnight UTC
 * Resets credits to tier's monthly allocation
 */
const monthlyResetJob = cron.schedule('0 0 1 * *', async () => {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    logger.debug('Local storage mode - skipping monthly credit reset job');
    return;
  }

  if (!db) {
    logger.error('Database not initialized - cannot run monthly credit reset');
    return;
  }

  logger.info('Starting monthly credit reset for paid tier users');

  try {
    const snapshot = await db
      .collection('user_credits')
      .where('tier', 'in', ['starter', 'pro', 'premium'])
      .get();

    logger.info(`Found ${snapshot.size} paid tier users to reset`);

    let successCount = 0;
    let errorCount = 0;

    for (const doc of snapshot.docs) {
      try {
        await resetMonthlyCredits(doc.id);
        successCount++;
      } catch (error) {
        errorCount++;
        logger.error(`Failed to reset credits for user ${doc.id}`, error);
      }
    }

    logger.info('Monthly credit reset completed', {
      total: snapshot.size,
      success: successCount,
      errors: errorCount,
    });
  } catch (error) {
    logger.error('Error in monthly credit reset job', error);
  }
}, {
  timezone: 'UTC',
});

/**
 * Start credit reset jobs
 * Called from server.ts on startup
 */
export function startCreditResetJobs(): void {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    logger.info('Local storage mode - credit reset jobs will not run');
    return;
  }

  logger.info('Starting credit reset jobs');
  dailyResetJob.start();
  monthlyResetJob.start();
  logger.info('Credit reset jobs started', {
    daily: '0 0 * * * (midnight UTC daily)',
    monthly: '0 0 1 * * (first day of month, midnight UTC)',
  });
}

/**
 * Stop credit reset jobs
 * Called on server shutdown
 */
export function stopCreditResetJobs(): void {
  logger.info('Stopping credit reset jobs');
  dailyResetJob.stop();
  monthlyResetJob.stop();
  logger.info('Credit reset jobs stopped');
}

