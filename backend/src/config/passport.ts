import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import passport from 'passport';
import env from './env';
import { getOrCreateUser } from '../models/User';
import logger from '../utils/logger';

/**
 * Check if authentication is enabled
 */
export function isAuthEnabled(): boolean {
  return env.AUTH_ENABLED;
}

/**
 * Initialize Passport strategies
 * Only initializes if AUTH_ENABLED=true
 */
export function initializePassport(): void {
  if (!env.AUTH_ENABLED) {
    logger.info('Authentication disabled - skipping Passport initialization');
    return;
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Google OAuth credentials are required when AUTH_ENABLED=true'
    );
  }

  // Serialize user to session (we use JWT, but Passport requires this)
  passport.serializeUser((user: Express.User, done) => {
    done(null, user);
  });

  // Deserialize user from session
  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          logger.info('Google OAuth callback received', {
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
          });

          if (!profile.emails || !profile.emails[0]) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          const email = profile.emails[0].value;
          const name = profile.displayName || profile.name?.givenName || email;
          const googleId = profile.id;

          // Get or create user in database
          const user = await getOrCreateUser(googleId, email, name);

          logger.info('User authenticated successfully', {
            userId: user.id,
            email: user.email,
          });

          // Ensure user has an ID (should always be present after getOrCreateUser)
          if (!user.id) {
            throw new Error('User ID is missing after authentication');
          }

          // Return user object (will be used to create JWT)
          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            tier: user.tier,
          });
        } catch (error) {
          logger.error('Error in Google OAuth strategy', error);
          return done(error, undefined);
        }
      }
    )
  );

  logger.info('Passport Google OAuth strategy initialized');
}

// Initialize Passport on module load (will be called when server.ts imports this)
if (env.AUTH_ENABLED) {
  try {
    initializePassport();
  } catch (error) {
    logger.warn('Failed to initialize Passport on module load', error);
    // Don't throw - initialization will be retried or handled elsewhere
  }
}

export default passport;

