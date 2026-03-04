import { UserTier } from './credit.types';

/**
 * User information stored in JWT token and req.user
 */
export interface AuthenticatedUser {
  id: string;
  uid?: string; // Firebase Auth UID (stable identifier)
  email: string;
  name: string;
  tier: UserTier;
  /**
   * User's preferred language (ISO 639-1 language code)
   * Examples: 'en', 'es', 'fr', 'de', 'zh', 'zh-tw', 'ja', 'ko', 'pt', 'it', 'ru', 'ar'
   * Defaults to 'en' if not set
   */
  language_preference?: string;
}

/**
 * JWT payload structure
 */
export interface JWTPayload extends AuthenticatedUser {
  iat?: number;
  exp?: number;
}

/**
 * Extended Express Request with user property
 */
declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

