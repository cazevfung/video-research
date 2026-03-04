/**
 * User controller
 * Handles user-related endpoints including quota information
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/firebase-auth.middleware';
import { getUserById, updateUser, getUserSettings, updateUserSettings } from '../models/User';
import { getQuotaInfo } from '../services/quota.service';
import { getCreditBalance } from '../services/credit-facade.service';
import { getFreemiumConfig, getTasksConfig } from '../config';
import { validateLanguagePreference } from '../utils/validators';
import logger from '../utils/logger';
import { UserSettings } from '../types/user-settings';

/**
 * Get quota information for current user
 * GET /api/user/quota
 * Returns dynamic credit balance from transactional credit system (Phase 5)
 */
export async function getQuota(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const userId = req.user.id;
    
    // Get user to check tier
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // Get quota info (which now uses dynamic balance via facade)
    const quota = await getQuotaInfo(userId);
    
    // Get tier config for additional info
    const freemiumConfig = getFreemiumConfig();
    const tierConfig =
      user.tier === 'premium'
        ? freemiumConfig.premium_tier
        : freemiumConfig.free_tier;

    // Get task limits from config (Phase 2: Multiple simultaneous tasks)
    const tasksConfig = getTasksConfig();
    const maxSimultaneousTasks = user.tier === 'premium' 
      ? tasksConfig.limits.premium 
      : tasksConfig.limits.free;

    // Return quota information
    // Phase 5: Always uses transactional credit system
    res.json({
      credits_remaining: quota.credits_remaining, // ✅ Dynamic, from transactional credit system
      tier: quota.tier,
      daily_limit: quota.daily_limit,
      max_videos_per_batch: quota.max_videos_per_batch,
      reset_time: quota.reset_time.toISOString(),
      system: 'transactional', // Phase 5: Always transactional
      max_simultaneous_tasks: maxSimultaneousTasks, // Phase 2: Task limits from config
    });
  } catch (error) {
    logger.error('Error getting quota', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get quota information',
      },
    });
  }
}

/**
 * Update user profile
 * PATCH /api/user/profile
 * Allows updating name, email, and language_preference
 */
export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const userId = req.user.id;
    const { name, email, language_preference, ...otherFields } = req.body;

    // Validate that only allowed fields are being updated
    const allowedFields = ['name', 'email', 'language_preference'];
    const invalidFields = Object.keys(otherFields).filter(
      field => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: `Invalid fields: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`,
        },
      });
      return;
    }

    // Validate language preference if provided
    if (language_preference !== undefined) {
      const validation = validateLanguagePreference(language_preference);
      if (!validation.valid) {
        res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: validation.errors[0].message,
          },
        });
        return;
      }
    }

    // Build update data object
    const updateData: {
      name?: string;
      email?: string;
      language_preference?: string;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (language_preference !== undefined) {
      updateData.language_preference = language_preference.toLowerCase().trim();
    }

    // Update user
    const updatedUser = await updateUser(userId, updateData);

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        tier: updatedUser.tier,
        language_preference: updatedUser.language_preference || 'en',
      },
    });
  } catch (error) {
    logger.error('Error updating user profile', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update user profile',
      },
    });
  }
}

/**
 * Get user settings
 * GET /api/user/settings
 * Returns user settings or default settings if not set
 */
export async function getSettings(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const userId = req.user.id;
    const settings = await getUserSettings(userId);

    res.json({
      settings,
    });
  } catch (error) {
    logger.error('Error getting user settings', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get user settings',
      },
    });
  }
}

/**
 * Update user settings
 * PATCH /api/user/settings
 * Updates user settings (partial update supported)
 */
export async function updateSettings(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const userId = req.user.id;
    const settingsUpdate: Partial<UserSettings> = req.body;

    // Language preference is now managed separately via /api/user/language endpoint
    // Remove any language-related fields from settings update if accidentally included
    if ('language' in settingsUpdate) {
      delete settingsUpdate.language;
    }
    if (settingsUpdate.preferences && 'defaultLanguage' in settingsUpdate.preferences) {
      delete settingsUpdate.preferences.defaultLanguage;
    }

    const updatedSettings = await updateUserSettings(userId, settingsUpdate);

    res.json({
      settings: updatedSettings,
    });
  } catch (error) {
    logger.error('Error updating user settings', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update user settings',
      },
    });
  }
}

/**
 * Update user language preference
 * PATCH /api/user/language
 * Updates user.language_preference (single source of truth for language)
 * This is the dedicated endpoint for language changes as part of Phase 1 unification
 */
export async function updateLanguagePreference(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const { language } = req.body;
    
    // Validate language
    const validation = validateLanguagePreference(language);
    if (!validation.valid) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: validation.errors[0].message,
        },
      });
      return;
    }

    // Normalize and update
    const normalizedLanguage = language.toLowerCase().trim();
    const updatedUser = await updateUser(req.user.id, {
      language_preference: normalizedLanguage,
    });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name || '',
        tier: updatedUser.tier,
        language_preference: updatedUser.language_preference || 'en',
      },
    });
  } catch (error) {
    logger.error('Error updating language preference', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update language preference',
      },
    });
  }
}

