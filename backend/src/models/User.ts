import logger from '../utils/logger';
import { getFreemiumConfig, useLocalStorage } from '../config';
import * as localStorage from '../storage/local-user.storage';
import { UserTier } from '../types/credit.types';
import { validateLanguagePreference } from '../utils/validators';
import { UserSettings, defaultUserSettings } from '../types/user-settings';

// Re-export UserTier for backward compatibility
export type { UserTier };

/**
 * User interface matching Firestore document structure
 */
export interface User {
  id?: string; // Firestore document ID or local storage ID
  email: string;
  uid?: string; // Firebase Auth UID (new - for Firebase Authentication)
  googleId?: string; // Optional - only if authenticated via Google (kept for migration)
  name: string;
  tier: UserTier;
  
  /**
   * @deprecated Use getUserCredits() from credit.service instead
   * This field is deprecated and will be removed in v2.0.
   * All credit operations should use the transactional credit system.
   * Will be removed in v2.0
   */
  credits_remaining?: number;
  
  created_at: Date | string; // Support both Date and ISO string (for local storage compatibility)
  last_reset?: Date | string; // Last time credits were reset
  
  /**
   * @deprecated Migration tracking - no longer needed after Phase 5
   * Will be removed in v2.0
   */
  credit_system_migrated?: boolean;
  
  /**
   * @deprecated Legacy backup - no longer needed after Phase 5
   * Will be removed in v2.0
   */
  legacy_credits_remaining?: number;
  
  /**
   * User's preferred language (ISO 639-1 language code)
   * Examples: 'en', 'es', 'fr', 'de', 'zh', 'zh-tw', 'ja', 'ko', 'pt', 'it', 'ru', 'ar'
   * Defaults to 'en' if not set
   */
  language_preference?: string;
  
  /**
   * User settings (theme, notifications, privacy, preferences)
   * Stored as a nested object in the user document
   */
  settings?: UserSettings;
}

/**
 * User creation data (without auto-generated fields)
 */
export interface UserCreateData {
  id?: string; // Optional - for dev users or when specific ID is needed
  email: string;
  uid?: string; // Firebase Auth UID (new)
  googleId?: string; // Optional - kept for migration
  name: string;
  tier?: UserTier; // Defaults to 'free'
}

/**
 * User update data (partial)
 */
export interface UserUpdateData {
  email?: string;
  uid?: string; // Firebase Auth UID (new)
  googleId?: string; // Optional - kept for migration
  name?: string;
  tier?: UserTier;
  
  /**
   * @deprecated Use credit.service instead
   * Will be removed in v2.0
   */
  credits_remaining?: number;
  
  last_reset?: Date | string;
  
  /**
   * @deprecated Migration tracking - no longer needed after Phase 5
   * Will be removed in v2.0
   */
  credit_system_migrated?: boolean;
  
  /**
   * @deprecated Legacy backup - no longer needed after Phase 5
   * Will be removed in v2.0
   */
  legacy_credits_remaining?: number;
  
  /**
   * User's preferred language (ISO 639-1 language code)
   * Examples: 'en', 'es', 'fr', 'de', 'zh', 'zh-tw', 'ja', 'ko', 'pt', 'it', 'ru', 'ar'
   * Defaults to 'en' if not set
   */
  language_preference?: string;
  
  /**
   * User settings (theme, notifications, privacy, preferences)
   * Stored as a nested object in the user document
   */
  settings?: UserSettings;
}

const USERS_COLLECTION = 'users';

// Check if we should use local storage (for testing) or Firestore (production)
// Auto-detects based on NODE_ENV: production → Firestore, development → local storage
const USE_LOCAL_STORAGE = useLocalStorage();

if (USE_LOCAL_STORAGE) {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📁 LOCAL STORAGE MODE ENABLED - Users will be saved to /data directory');
  logger.info('📂 Data location: backend/data/users/');
  logger.info('ℹ️  To use Firestore, set NODE_ENV=production or USE_LOCAL_STORAGE=false');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.getUserByEmail(email);
  }

  // Firestore implementation - requires Firebase to be initialized
  const db = (await import('../config/database')).default;
  const { Timestamp } = await import('firebase-admin/firestore');

  try {
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as User;
  } catch (error) {
    logger.error('Error getting user by email', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve user by email: ${errorMessage}`);
  }
}

/**
 * Get user by Google ID
 */
export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.getUserByGoogleId(googleId);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .where('googleId', '==', googleId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as User;
  } catch (error) {
    logger.error('Error getting user by Google ID', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve user by Google ID: ${errorMessage}`);
  }
}

/**
 * Get user by document ID
 */
export async function getUserById(id: string): Promise<User | null> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.getUserById(id);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    const doc = await db.collection(USERS_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as User;
  } catch (error) {
    logger.error('Error getting user by ID', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve user by ID: ${errorMessage}`);
  }
}

/**
 * Create a new user
 */
export async function createUser(data: UserCreateData): Promise<User> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.createUser(data);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;
  const { Timestamp } = await import('firebase-admin/firestore');

  try {
    const freemiumConfig = getFreemiumConfig();
    const tier = data.tier || 'free';
    const defaultCredits =
      tier === 'premium'
        ? freemiumConfig.premium_tier.default_credits
        : freemiumConfig.free_tier.default_credits;

    const userData = {
      email: data.email,
      uid: data.uid || null,
      googleId: data.googleId || null,
      name: data.name,
      tier,
      // credits_remaining is deprecated - credits are now managed by credit.service
      // Initialize credits via credit.service after user creation
      created_at: Timestamp.now(),
      last_reset: Timestamp.now(),
    };

    // Use uid as document ID if available (prevents duplicates, stable identifier)
    let docRef: FirebaseFirestore.DocumentReference;
    if (data.uid) {
      docRef = db.collection(USERS_COLLECTION).doc(data.uid);
      
      // Check if document already exists (atomic operation to prevent race conditions)
      const existing = await docRef.get();
      if (existing.exists) {
        // User already exists, return it instead of overwriting
        logger.info(`User already exists with uid as document ID: ${data.email}`, { 
          userId: data.uid, 
          tier 
        });
        return {
          id: existing.id,
          ...existing.data(),
        } as User;
      }
      
      // Create with specific document ID
      await docRef.set(userData);
      logger.info(`Created new user with uid as document ID: ${data.email}`, { 
        userId: data.uid, 
        tier 
      });
    } else {
      // Fallback for non-Firebase users (e.g., OAuth users without uid)
      docRef = await db.collection(USERS_COLLECTION).add(userData);
      logger.info(`Created new user with auto-generated ID: ${data.email}`, { 
        userId: docRef.id, 
        tier 
      });
    }

    const doc = await docRef.get();

    return {
      id: doc.id,
      ...doc.data(),
    } as User;
  } catch (error) {
    logger.error('Error creating user', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create user: ${errorMessage}`);
  }
}

/**
 * Update user data
 */
export async function updateUser(
  userId: string,
  data: UserUpdateData
): Promise<User> {
  if (USE_LOCAL_STORAGE) {
    return localStorage.updateUser(userId, data);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;
  const { Timestamp } = await import('firebase-admin/firestore');

  try {
    // Validate language preference if provided
    if (data.language_preference !== undefined) {
      const validation = validateLanguagePreference(data.language_preference);
      if (!validation.valid) {
        throw new Error(validation.errors[0].message);
      }
      // Normalize to lowercase
      data.language_preference = data.language_preference.toLowerCase().trim();
    }

    const updateData = {
      ...data,
      ...(data.last_reset && {
        last_reset:
          data.last_reset instanceof Date
            ? Timestamp.fromDate(data.last_reset)
            : data.last_reset,
      }),
    };

    await db.collection(USERS_COLLECTION).doc(userId).update(updateData);

    const updatedDoc = await db.collection(USERS_COLLECTION).doc(userId).get();

    if (!updatedDoc.exists) {
      throw new Error('User not found after update');
    }

    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as User;
  } catch (error) {
    logger.error('Error updating user', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update user: ${errorMessage}`);
  }
}

/**
 * Reset daily credits for a user based on their tier
 */
export async function resetDailyCredits(userId: string): Promise<void> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const freemiumConfig = getFreemiumConfig();
    const defaultCredits =
      user.tier === 'premium'
        ? freemiumConfig.premium_tier.default_credits
        : freemiumConfig.free_tier.default_credits;

    // Note: credits_remaining is deprecated
    // Use credit.service.resetDailyCredits() or credit.service.resetMonthlyCredits() instead
    // This function is kept for backward compatibility but should not be used for credit management
    if (USE_LOCAL_STORAGE) {
      await updateUser(userId, {
        last_reset: new Date(),
      });
    } else {
      const { Timestamp } = await import('firebase-admin/firestore');
      await updateUser(userId, {
        last_reset: Timestamp.now() as any,
      });
    }
    
    // Use credit service for actual credit reset
    const { resetDailyCredits, resetMonthlyCredits } = await import('../services/credit.service');
    const pricingConfig = await import('../services/pricing.service').then(m => m.getPricingConfig());
    const tierConfig = pricingConfig.tiers[user.tier];
    
    if (tierConfig.resetFrequency === 'daily') {
      await resetDailyCredits(userId);
    } else {
      await resetMonthlyCredits(userId);
    }

    logger.info(`Reset credits for user: ${userId}`, {
      userId,
      tier: user.tier,
      credits: defaultCredits,
    });
  } catch (error) {
    logger.error('Error resetting daily credits', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to reset daily credits: ${errorMessage}`);
  }
}

/**
 * Get user by Firebase UID
 */
export async function getUserByUid(uid: string): Promise<User | null> {
  if (USE_LOCAL_STORAGE) {
    // For local storage, search by uid field
    return localStorage.getUserByUid(uid);
  }

  // Firestore implementation
  const db = (await import('../config/database')).default;

  try {
    // First, try to get user by uid as document ID (most efficient, no index needed)
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    const doc = await docRef.get();
    
    if (doc.exists) {
      return {
        id: doc.id,
        ...doc.data(),
      } as User;
    }

    // Fallback: query by uid field (requires index)
    // This handles legacy users created before uid-as-doc-id change
    try {
      const snapshot = await db
        .collection(USERS_COLLECTION)
        .where('uid', '==', uid)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const legacyDoc = snapshot.docs[0];
        return {
          id: legacyDoc.id,
          ...legacyDoc.data(),
        } as User;
      }
    } catch (queryError) {
      // Check if error is about missing index
      const errorMessage = queryError instanceof Error ? queryError.message : String(queryError);
      if (errorMessage.includes('index') || errorMessage.includes('Index')) {
        logger.warn('Missing Firestore index on uid field', {
          uid,
          error: errorMessage,
          hint: 'Create index: Collection: users, Field: uid (Ascending). Using uid as document ID is recommended instead.',
        });
        // Index error is not fatal - we already tried direct document access
      } else {
        // Re-throw non-index errors
        throw queryError;
      }
    }

    return null;
  } catch (error) {
    logger.error('Error getting user by UID', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve user by UID: ${errorMessage}`);
  }
}

/**
 * Get or create user by Firebase UID (for Firebase Auth flow)
 * Uses Firestore transaction to prevent race conditions
 */
export async function getOrCreateUserByUid(
  uid: string,
  email: string,
  name: string
): Promise<User> {
  if (USE_LOCAL_STORAGE) {
    // Local storage doesn't support transactions, use simple check-and-create
    try {
      let user = await getUserByUid(uid);
      if (user) {
        if (user.email !== email || user.name !== name) {
          user = await updateUser(user.id!, { email, name });
        }
        return user;
      }
      user = await getUserByEmail(email);
      if (user) {
        user = await updateUser(user.id!, { uid, name });
        return user;
      }
      return await createUser({ uid, email, name, tier: 'free' });
    } catch (error) {
      logger.error('Error in getOrCreateUserByUid (local storage)', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get or create user by UID: ${errorMessage}`);
    }
  }

  // Firestore implementation with transaction for atomicity
  const db = (await import('../config/database')).default;
  const { Timestamp } = await import('firebase-admin/firestore');

  try {
    // Use transaction to prevent race conditions
    return await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      // Try to find by Firebase UID first (using direct document access)
      const docRef = db.collection(USERS_COLLECTION).doc(uid);
      const doc = await transaction.get(docRef) as unknown as FirebaseFirestore.DocumentSnapshot;

      if (doc.exists) {
        const docData = doc.data();
        const user = { 
          id: doc.id, 
          ...docData,
          created_at: docData?.created_at instanceof Timestamp ? docData.created_at.toDate() : docData?.created_at,
          last_reset: docData?.last_reset instanceof Timestamp ? docData.last_reset.toDate() : docData?.last_reset,
        } as User;
        
        // Update email/name in case they changed (outside transaction for simplicity)
        // The transaction ensures we found the right user atomically
        if (user.email !== email || user.name !== name) {
          // Note: We can't update inside the transaction if we're returning,
          // so we'll update after the transaction completes
          // This is safe because we've already verified the user exists
        }
        
        return user;
      }

      // Try to find by email (in case user already exists but doesn't have uid)
      // Note: Queries in transactions are read-only, so we use a query
      const emailQuery = db.collection(USERS_COLLECTION)
        .where('email', '==', email)
        .limit(1);
      const emailSnapshot = await transaction.get(emailQuery) as unknown as FirebaseFirestore.QuerySnapshot;

      if (!emailSnapshot.empty) {
        const userDoc = emailSnapshot.docs[0];
        const docData = userDoc.data();
        const user = { 
          id: userDoc.id, 
          ...docData,
          created_at: docData?.created_at instanceof Timestamp ? docData.created_at.toDate() : docData?.created_at,
          last_reset: docData?.last_reset instanceof Timestamp ? docData.last_reset.toDate() : docData?.last_reset,
        } as User;
        
        // Link Firebase UID to existing user (update after transaction)
        return user;
      }

      // User doesn't exist, create it
      // Use uid as document ID to prevent duplicates
      const now = Timestamp.now();
      const userData = {
        email,
        uid,
        googleId: undefined,
        name,
        tier: 'free' as UserTier,
        // credits_remaining is deprecated - credits are now managed by credit.service
        // Initialize credits via credit.service after user creation
        created_at: now,
        last_reset: now,
      };

      // Set the document (transaction ensures atomicity)
      transaction.set(docRef, userData);

      // Return user with flag indicating it's newly created
      // Convert Timestamp to Date for the return value
      return { 
        id: docRef.id, 
        ...userData, 
        created_at: now.toDate(),
        last_reset: now.toDate(),
        _isNewUser: true 
      } as User & { _isNewUser?: boolean };
    }).then(async (user: User & { _isNewUser?: boolean }) => {
      // After transaction completes, handle updates and credit initialization
      const isNewUser = (user as any)._isNewUser === true;
      // Remove the flag before returning
      delete (user as any)._isNewUser;
      
      // Update email/name if needed (for existing users)
      if (user.email !== email || user.name !== name) {
        user = await updateUser(user.id!, { email, name });
      }
      
      // If user was found by email but doesn't have uid, link it
      if (!user.uid && user.email === email) {
        user = await updateUser(user.id!, { uid, name });
      }

      // Initialize credits for new users only
      if (isNewUser) {
        try {
          const { initializeUserCredits } = await import('../services/credit.service');
          await initializeUserCredits(user.id!, 'free');
          logger.info('Initialized credits for new user', {
            userId: user.id,
            email: user.email,
          });
        } catch (creditError) {
          // Log error but don't fail user creation
          logger.warn('Failed to initialize credits for new user (will be created on first access)', {
            userId: user.id,
            error: creditError instanceof Error ? creditError.message : String(creditError),
          });
        }
      }

      return user;
    });
  } catch (error) {
    logger.error('Error in getOrCreateUserByUid', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get or create user by UID: ${errorMessage}`);
  }
}

/**
 * Get or create user (for OAuth flow - Passport.js)
 */
export async function getOrCreateUser(
  googleId: string,
  email: string,
  name: string
): Promise<User> {
  try {
    // Try to find by Google ID first
    let user = await getUserByGoogleId(googleId);

    if (user) {
      // Update email/name in case they changed
      if (user.email !== email || user.name !== name) {
        user = await updateUser(user.id!, {
          email,
          name,
        });
      }
      return user;
    }

    // Try to find by email (in case Google ID changed or user already exists)
    user = await getUserByEmail(email);
    if (user) {
      // Link Google ID to existing user
      user = await updateUser(user.id!, {
        googleId,
        name,
      });
      return user;
    }

    // Create new user
    return await createUser({
      googleId,
      email,
      name,
      tier: 'free',
    });
  } catch (error) {
    logger.error('Error in getOrCreateUser', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get or create user: ${errorMessage}`);
  }
}

/**
 * Get user settings
 * Returns user settings or default settings if not set
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Return user settings if they exist, otherwise return defaults
  if (user.settings) {
    // Merge with defaults to ensure all fields are present
    return {
      ...defaultUserSettings,
      ...user.settings,
      notifications: {
        ...defaultUserSettings.notifications,
        ...user.settings.notifications,
      },
      privacy: {
        ...defaultUserSettings.privacy,
        ...user.settings.privacy,
      },
      preferences: {
        ...defaultUserSettings.preferences,
        ...user.settings.preferences,
      },
    };
  }
  
  return defaultUserSettings;
}

/**
 * Update user settings
 * Performs a partial update (merges with existing settings)
 */
export async function updateUserSettings(
  userId: string,
  settingsUpdate: Partial<UserSettings>
): Promise<UserSettings> {
  // Get current settings
  const currentSettings = await getUserSettings(userId);
  
  // Merge with updates
  const updatedSettings: UserSettings = {
    ...currentSettings,
    ...settingsUpdate,
    notifications: {
      ...currentSettings.notifications,
      ...(settingsUpdate.notifications || {}),
    },
    privacy: {
      ...currentSettings.privacy,
      ...(settingsUpdate.privacy || {}),
    },
    preferences: {
      ...currentSettings.preferences,
      ...(settingsUpdate.preferences || {}),
    },
  };
  
  // Update user document
  await updateUser(userId, { settings: updatedSettings });
  
  return updatedSettings;
}

