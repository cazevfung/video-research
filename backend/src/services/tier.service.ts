import db from '../config/database';
import { Timestamp } from 'firebase-admin/firestore';
import { TierRequest, TierRequestStatus } from '../types/credit.types';
import logger from '../utils/logger';
import { getSystemConfig } from '../config';
import { getUserCredits, addCredits } from './credit.service';
import { getTierCredits } from './pricing.service';

const TIER_REQUESTS_COLLECTION = 'tier_requests';
const USER_CREDITS_COLLECTION = 'user_credits';

/**
 * Admin email for tier upgrade requests
 * From PRD: cazevfung@gmail.com
 */
const ADMIN_EMAIL = 'cazevfung@gmail.com';

/**
 * Request tier upgrade
 * Creates a tier request document in Firestore
 * Sends email notification to admin (placeholder - email service to be implemented)
 * 
 * @param userId User ID
 * @param requestedTier Requested tier (starter, pro, premium)
 * @param userEmail User email address
 * @returns Tier request ID
 */
export async function requestTierUpgrade(
  userId: string,
  requestedTier: 'starter' | 'pro' | 'premium',
  userEmail: string
): Promise<string> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    logger.debug('Local storage mode - skipping tier upgrade request', {
      userId,
      requestedTier,
      userEmail,
    });
    // Return mock request ID for local storage mode
    return `mock-request-${Date.now()}`;
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // Check if user already has a pending request
    const pendingSnapshot = await db
      .collection(TIER_REQUESTS_COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!pendingSnapshot.empty) {
      const existingRequest = pendingSnapshot.docs[0].data() as TierRequest;
      throw new Error(`You already have a pending tier upgrade request for ${existingRequest.requestedTier} tier`);
    }

    // Check current tier
    const userCredits = await getUserCredits(userId);
    if (userCredits && userCredits.tier === requestedTier) {
      throw new Error(`You are already on the ${requestedTier} tier`);
    }

    // Create tier request
    const requestRef = db.collection(TIER_REQUESTS_COLLECTION).doc();
    const tierRequest: TierRequest = {
      requestId: requestRef.id,
      userId,
      userEmail,
      requestedTier,
      status: 'pending',
      requestedAt: Timestamp.now(),
      processedAt: null,
      processedBy: null,
      notes: null,
    };

    await requestRef.set(tierRequest);

    logger.info('Tier upgrade request created', {
      requestId: requestRef.id,
      userId,
      requestedTier,
      userEmail,
    });

    // TODO: Send email notification to admin
    // For now, just log the request
    logger.info('Tier upgrade request notification (email to be implemented)', {
      adminEmail: ADMIN_EMAIL,
      userEmail,
      requestedTier,
      requestId: requestRef.id,
    });

    return requestRef.id;
  } catch (error) {
    logger.error('Error creating tier upgrade request', error);
    throw new Error(`Failed to create tier upgrade request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Approve tier upgrade request
 * Updates user's tier in user_credits collection
 * Resets credits based on new tier
 * Creates transaction record for tier upgrade
 * Updates tier request status to 'approved'
 * 
 * @param requestId Tier request ID
 * @param adminEmail Admin email who approved the request
 * @param notes Optional notes
 */
export async function approveTierUpgrade(
  requestId: string,
  adminEmail: string,
  notes?: string
): Promise<void> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    logger.debug('Local storage mode - skipping tier upgrade approval', {
      requestId,
      adminEmail,
    });
    return;
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // Get tier request
    const requestRef = db.collection(TIER_REQUESTS_COLLECTION).doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      throw new Error('Tier request not found');
    }

    const tierRequest = requestDoc.data() as TierRequest;

    if (tierRequest.status !== 'pending') {
      throw new Error(`Tier request is already ${tierRequest.status}`);
    }

    // Update user's tier
    const userCreditsRef = db.collection(USER_CREDITS_COLLECTION).doc(tierRequest.userId);
    const userCreditsDoc = await userCreditsRef.get();

    if (!userCreditsDoc.exists) {
      throw new Error('User credits not found');
    }

    const userCredits = userCreditsDoc.data() as any;

    // Get new tier credits
    const newTierCredits = await getTierCredits(tierRequest.requestedTier);

    // Update user credits
    await userCreditsRef.update({
      tier: tierRequest.requestedTier,
      balance: newTierCredits, // Reset to new tier's allocation
      lastResetDate: Timestamp.now(),
      tierUnlockedAt: Timestamp.now(),
      tierUnlockedBy: tierRequest.userEmail,
    });

    // Create credit transaction for tier upgrade
    await addCredits(
      tierRequest.userId,
      newTierCredits - (userCredits.balance || 0), // Net credit change
      'tier_upgrade',
      {
        description: `Tier upgraded to ${tierRequest.requestedTier}`,
        tierUpgrade: tierRequest.requestedTier,
      }
    );

    // Update tier request status
    await requestRef.update({
      status: 'approved' as TierRequestStatus,
      processedAt: Timestamp.now(),
      processedBy: adminEmail,
      notes: notes || null,
    });

    logger.info('Tier upgrade approved', {
      requestId,
      userId: tierRequest.userId,
      oldTier: userCredits.tier,
      newTier: tierRequest.requestedTier,
      adminEmail,
    });

    // TODO: Send confirmation email to user
    logger.info('Tier upgrade confirmation email (to be implemented)', {
      userEmail: tierRequest.userEmail,
      newTier: tierRequest.requestedTier,
    });
  } catch (error) {
    logger.error('Error approving tier upgrade', error);
    throw new Error(`Failed to approve tier upgrade: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reject tier upgrade request
 * 
 * @param requestId Tier request ID
 * @param adminEmail Admin email who rejected the request
 * @param notes Optional rejection notes
 */
export async function rejectTierUpgrade(
  requestId: string,
  adminEmail: string,
  notes?: string
): Promise<void> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    logger.debug('Local storage mode - skipping tier upgrade rejection', {
      requestId,
      adminEmail,
    });
    return;
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const requestRef = db.collection(TIER_REQUESTS_COLLECTION).doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      throw new Error('Tier request not found');
    }

    const tierRequest = requestDoc.data() as TierRequest;

    if (tierRequest.status !== 'pending') {
      throw new Error(`Tier request is already ${tierRequest.status}`);
    }

    // Update tier request status
    await requestRef.update({
      status: 'rejected' as TierRequestStatus,
      processedAt: Timestamp.now(),
      processedBy: adminEmail,
      notes: notes || null,
    });

    logger.info('Tier upgrade rejected', {
      requestId,
      userId: tierRequest.userId,
      adminEmail,
      notes,
    });

    // TODO: Send rejection email to user
    logger.info('Tier upgrade rejection email (to be implemented)', {
      userEmail: tierRequest.userEmail,
      requestedTier: tierRequest.requestedTier,
    });
  } catch (error) {
    logger.error('Error rejecting tier upgrade', error);
    throw new Error(`Failed to reject tier upgrade: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get tier request status for a user
 * 
 * @param userId User ID
 * @returns Tier request or null if no pending request
 */
export async function getTierRequestStatus(userId: string): Promise<TierRequest | null> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    return null;
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const snapshot = await db
      .collection(TIER_REQUESTS_COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as TierRequest;
  } catch (error) {
    logger.error('Error getting tier request status', error);
    throw new Error(`Failed to get tier request status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

