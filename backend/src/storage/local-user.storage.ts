import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';
import type { User, UserTier } from '../models/User';
import { getFreemiumConfig, getUsersDirectory } from '../config';
import { validateLanguagePreference } from '../utils/validators';

// Get centralized directory path
const USERS_DIR = getUsersDirectory();

/**
 * Ensure data directories exist with proper error handling
 * @throws Error if directories cannot be created
 */
async function ensureDataDirs(): Promise<void> {
  try {
    await fs.mkdir(USERS_DIR, { recursive: true });
    logger.debug('User storage directory ready', { usersDir: USERS_DIR });
  } catch (error) {
    logger.error('Failed to create user data directories', {
      error,
      usersDir: USERS_DIR,
    });
    throw new Error(
      `Cannot initialize user local storage directory: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Initialize on module load
ensureDataDirs().catch((error) => {
  logger.error('Failed to initialize user data directories on module load', error);
});

/**
 * Generate a simple ID
 */
function generateId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get all user files
 */
async function getAllUsers(): Promise<User[]> {
  try {
    await ensureDataDirs();
    const files = await fs.readdir(USERS_DIR);
    const users: User[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(USERS_DIR, file);
        const data = await fs.readFile(filePath, 'utf-8');
        users.push(JSON.parse(data) as User);
      }
    }

    return users;
  } catch (error) {
    logger.error('Error reading all users from local storage', error);
    return [];
  }
}

/**
 * Get user by email (local file storage)
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const users = await getAllUsers();
    return users.find((u) => u.email === email) || null;
  } catch (error) {
    logger.error('Error getting user by email from local storage', error);
    return null;
  }
}

/**
 * Get user by Google ID (local file storage)
 */
export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  try {
    const users = await getAllUsers();
    return users.find((u) => u.googleId === googleId) || null;
  } catch (error) {
    logger.error('Error getting user by Google ID from local storage', error);
    return null;
  }
}

/**
 * Get user by Firebase UID (local file storage)
 */
export async function getUserByUid(uid: string): Promise<User | null> {
  try {
    const users = await getAllUsers();
    return users.find((u) => u.uid === uid) || null;
  } catch (error) {
    logger.error('Error getting user by UID from local storage', error);
    return null;
  }
}

/**
 * Get user by document ID (local file storage)
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const filePath = path.join(USERS_DIR, `${id}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as User;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null; // File not found
    }
    logger.error('Error getting user by ID from local storage', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve user (local storage): ${errorMessage}`);
  }
}

/**
 * Create a new user (local file storage)
 */
export async function createUser(
  data: {
    id?: string; // Optional - for dev users or when specific ID is needed
    email: string;
    uid?: string;
    googleId?: string;
    name: string;
    tier?: UserTier;
  }
): Promise<User> {
  try {
    await ensureDataDirs();

    // Use provided ID if available (e.g., for dev users), otherwise generate one
    const id = data.id || generateId();
    const now = new Date();
    
    // Check if user with this ID already exists
    if (data.id) {
      const existing = await getUserById(data.id);
      if (existing) {
        logger.info('User already exists with provided ID, returning existing user', {
          id: data.id,
          email: data.email,
        });
        return existing;
      }
    }

    const freemiumConfig = getFreemiumConfig();
    const tier = data.tier || 'free';
    const defaultCredits =
      tier === 'premium'
        ? freemiumConfig.premium_tier.default_credits
        : freemiumConfig.free_tier.default_credits;

    const user: User = {
      id,
      email: data.email,
      uid: data.uid,
      googleId: data.googleId,
      name: data.name,
      tier,
      credits_remaining: defaultCredits,
      created_at: now,
      last_reset: now,
    };

    const filePath = path.join(USERS_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(user, null, 2), 'utf-8');

    logger.info('User created in local storage', {
      id,
      email: data.email,
      tier,
      filePath,
    });

    return user;
  } catch (error) {
    logger.error('Error creating user in local storage', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create user (local storage): ${errorMessage}`);
  }
}

/**
 * Update user data (local file storage)
 */
export async function updateUser(
  id: string,
  updates: {
    email?: string;
    uid?: string;
    googleId?: string;
    name?: string;
    tier?: UserTier;
    credits_remaining?: number;
    last_reset?: Date | string;
    password?: string; // For dev user password storage
    language_preference?: string;
  }
): Promise<User> {
  try {
    // Validate language preference if provided
    if (updates.language_preference !== undefined) {
      const validation = validateLanguagePreference(updates.language_preference);
      if (!validation.valid) {
        throw new Error(validation.errors[0].message);
      }
      // Normalize to lowercase
      updates.language_preference = updates.language_preference.toLowerCase().trim();
    }

    const filePath = path.join(USERS_DIR, `${id}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    const user = JSON.parse(data) as any; // Use any to allow password field

    const updatedUser: any = {
      ...user,
      ...updates,
    };

    await fs.writeFile(filePath, JSON.stringify(updatedUser, null, 2), 'utf-8');

    logger.info('User updated in local storage', { id, updates: Object.keys(updates) });

    return updatedUser;
  } catch (error) {
    logger.error('Error updating user in local storage', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update user (local storage): ${errorMessage}`);
  }
}

