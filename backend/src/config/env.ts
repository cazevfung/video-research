import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variable schema with validation
 * Uses Zod for type-safe environment variable validation
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('5000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  // Additional frontend URLs for CORS (comma-separated, for production domains)
  FRONTEND_URLS: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [];
      return val.split(',').map((url) => url.trim()).filter((url) => url.length > 0);
    })
    .default(''),

  // Authentication (Optional)
  // Auto-enables in production (NODE_ENV=production), defaults to false in development
  AUTH_ENABLED: z
    .string()
    .optional()
    .transform((val) => {
      // If explicitly set, use that value
      if (val !== undefined) return val === 'true';
      // Otherwise, auto-enable in production
      return process.env.NODE_ENV === 'production';
    }),

  // Firebase Authentication (Feature flag)
  // Auto-enables in production (NODE_ENV=production), defaults to false in development
  USE_FIREBASE_AUTH: z
    .string()
    .optional()
    .transform((val) => {
      // If explicitly set, use that value
      if (val !== undefined) return val === 'true';
      // Otherwise, auto-enable in production
      return process.env.NODE_ENV === 'production';
    }),

  // Google OAuth (Only required if AUTH_ENABLED=true and USE_FIREBASE_AUTH=false)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  JWT_SECRET: z.string().optional(),

  // Database (Firebase Firestore)
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // External APIs
  SUPADATA_API_KEY: z.string().min(1, 'SUPADATA_API_KEY is required'),
  DASHSCOPE_BEIJING_API_KEY: z.string().min(1, 'DASHSCOPE_BEIJING_API_KEY is required'),
  // YouTube Data API keys (comma-separated, will be rotated on failure)
  // Note: No default keys for security. Must be provided via environment variables.
  YOUTUBE_API_KEYS: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [];
      return val.split(',').map((key) => key.trim()).filter((key) => key.length > 0);
    })
    .default(''),

  // Optional
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug'])
    .default('info'),

  // Local Development Configuration
  USE_LOCAL_STORAGE: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default('false'),
  
  // Development User Configuration (for local dev when AUTH_ENABLED=false)
  DEV_USER_ID: z.string().optional().default('dev-user-id'),
  DEV_USER_EMAIL: z.string().email().optional().default('dev@example.com'),
  DEV_USER_NAME: z.string().optional().default('Development User'),
  DEV_USER_PASSWORD: z.string().optional().default('dev12345'), // Password for dev user login (min 8 chars)

  // Guest Access Configuration
  GUEST_SESSION_EXPIRY_HOURS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 24))
    .default('24'),
  GUEST_RATE_LIMIT_PER_IP: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 5))
    .default('5'),
  GUEST_RATE_LIMIT_WINDOW_HOURS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .default('1'),
  USE_REDIS_FOR_GUESTS: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default('false'),

  // Phase 5: Share feature configuration
  SHARE_RATE_LIMIT_PER_USER: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .default('10'),
  SHARE_RATE_LIMIT_WINDOW_HOURS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .default('1'),
  SHARE_ACCESS_RATE_LIMIT_PER_IP: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 100))
    .default('100'),
  SHARE_ACCESS_RATE_LIMIT_WINDOW_HOURS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .default('1'),
  SHARE_ABUSE_DETECTION_THRESHOLD: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1000))
    .default('1000'), // 1000+ accesses in 1 hour triggers abuse detection
  SHARE_ABUSE_DETECTION_WINDOW_HOURS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .default('1'),
  SHARE_CACHE_TTL_SECONDS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 300))
    .default('300'), // 5 minutes cache TTL for frequently accessed shares
  SHARE_ENABLE_CAPTCHA: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default('false'),
});

/**
 * Validates and returns environment variables
 * Throws error with clear messages if validation fails
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `Environment variable validation failed:\n${missingVars}\n\n` +
          'Please check your .env file and ensure all required variables are set.'
      );
    }
    throw error;
  }
}

// Validate and export environment variables
const env = validateEnv();

// Additional validation: If AUTH_ENABLED=true and not using Firebase Auth
if (env.AUTH_ENABLED && !env.USE_FIREBASE_AUTH) {
  // JWT_SECRET is always required for JWT-based auth
  if (!env.JWT_SECRET) {
    throw new Error(
      'When AUTH_ENABLED=true and USE_FIREBASE_AUTH=false, JWT_SECRET is required.'
    );
  }
  
  // Google OAuth credentials are only required if using OAuth (not for simple dev login)
  // In localhost development with local storage, we can use simple email/password login
  const isLocalDev = env.NODE_ENV === 'development' && 
    (process.env.USE_LOCAL_STORAGE === 'true' || !process.env.GOOGLE_APPLICATION_CREDENTIALS);
  
  if (!isLocalDev && (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)) {
    throw new Error(
      'When AUTH_ENABLED=true and USE_FIREBASE_AUTH=false in production, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for OAuth.'
    );
  }
}

// Additional validation: If USE_FIREBASE_AUTH=true, either service account credentials or Workload Identity must be configured
// Note: With Workload Identity (Cloud Run default), GOOGLE_APPLICATION_CREDENTIALS is not needed
// The applicationDefault() credentials will be used automatically
if (env.USE_FIREBASE_AUTH && !env.GOOGLE_APPLICATION_CREDENTIALS) {
  // This is OK - Workload Identity will be used via applicationDefault()
  // Only log a warning in development, not an error
  if (env.NODE_ENV === 'development') {
    console.warn(
      'USE_FIREBASE_AUTH=true but GOOGLE_APPLICATION_CREDENTIALS not set. ' +
      'Will use Workload Identity (applicationDefault) if available.'
    );
  }
}

// Export computed values for convenience
export const DEV_MODE = env.NODE_ENV === 'development';

export default env;

