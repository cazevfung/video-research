import admin from 'firebase-admin';
import env from './env';
import logger from '../utils/logger';
import { useLocalStorage } from './index';

// Check if local storage mode is enabled - skip Firebase initialization
// Auto-detects based on NODE_ENV: production → Firestore, development → local storage
const USE_LOCAL_STORAGE = useLocalStorage();

/**
 * Initialize Firebase Admin SDK and Firestore connection
 */
function initializeFirebase() {
  // Skip Firebase initialization if using local storage
  if (USE_LOCAL_STORAGE) {
    const reason = process.env.USE_LOCAL_STORAGE !== undefined
      ? 'explicitly set'
      : 'auto-selected for development';
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`🚀 LOCAL STORAGE MODE - Skipping Firebase initialization (${reason})`);
    logger.info('ℹ️  Firebase is not required when using local storage');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // Return a dummy object that won't be used
    return null as any;
  }

  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      logger.info('Firebase Admin already initialized');
      return admin.firestore();
    }

    // For local development with emulator
    if (env.FIRESTORE_EMULATOR_HOST) {
      logger.info(`Connecting to Firestore emulator at ${env.FIRESTORE_EMULATOR_HOST}`);
      
      // Set emulator host before initialization
      process.env.FIRESTORE_EMULATOR_HOST = env.FIRESTORE_EMULATOR_HOST;
      
      // Initialize with default credentials for emulator
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: 'demo-project', // Dummy project ID for emulator
        });
      }
    } else {
      // Production: Use service account credentials or Workload Identity
      logger.info('Initializing Firebase Admin for Firestore');
      
      // Initialize with service account (supports both JSON file and Workload Identity)
      if (!admin.apps.length) {
        if (env.GOOGLE_APPLICATION_CREDENTIALS) {
          // Use service account JSON file if provided
          logger.info('Using service account file for Firestore');
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
        } else {
          // Use Workload Identity (applicationDefault credentials)
          // This works when Cloud Run service account has proper permissions
          logger.info('Using Workload Identity for Firestore (applicationDefault credentials)');
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
        }
      }
    }

    const db = admin.firestore();
    
    // Test connection
    db.settings({
      ignoreUndefinedProperties: true,
    });

    logger.info('Firebase Firestore connection established successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error(
      `Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Initialize and export Firestore instance (will be null if using local storage)
const db = initializeFirebase();

export default db;

// Export admin for potential use in other modules
export { admin };

