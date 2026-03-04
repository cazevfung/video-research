import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import env from './env';
import logger from '../utils/logger';

/**
 * Initialize Firebase Admin SDK for authentication
 * This is separate from the Firestore database initialization
 * and is used specifically for verifying Firebase Auth tokens
 */
function initializeFirebaseAdmin(): admin.app.App | null {
  // Only initialize if Firebase Auth is enabled
  if (!env.USE_FIREBASE_AUTH) {
    logger.info('Firebase Auth is disabled - skipping Firebase Admin SDK initialization');
    return null;
  }

  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      logger.info('Firebase Admin SDK already initialized');
      return admin.app();
    }

    // Check if using Workload Identity (no GOOGLE_APPLICATION_CREDENTIALS) or service account file
    if (env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use service account JSON file
      const serviceAccountPath = path.isAbsolute(env.GOOGLE_APPLICATION_CREDENTIALS)
        ? env.GOOGLE_APPLICATION_CREDENTIALS
        : path.join(process.cwd(), env.GOOGLE_APPLICATION_CREDENTIALS);

      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(
          `Service account file not found at ${serviceAccountPath}. Please check GOOGLE_APPLICATION_CREDENTIALS path.`
        );
      }

      // Load service account credentials
      const serviceAccount = require(serviceAccountPath);

      // Initialize Firebase Admin SDK with service account file
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
      
      logger.info('Firebase Admin SDK initialized with service account file');
    } else {
      // Use Workload Identity (applicationDefault credentials)
      // This works when Cloud Run service account has proper permissions
      logger.info('No GOOGLE_APPLICATION_CREDENTIALS set - using Workload Identity (applicationDefault)');
      
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        logger.info('Firebase Admin SDK initialized with Workload Identity');
      } catch (error) {
        logger.error('Failed to initialize with applicationDefault credentials', error);
        throw new Error(
          'Failed to initialize Firebase Admin SDK. ' +
          'Either set GOOGLE_APPLICATION_CREDENTIALS or ensure Cloud Run service account has Firebase Admin permissions.'
        );
      }
    }

    logger.info('Firebase Admin SDK initialized successfully for authentication');
    return admin.app();
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', error);
    throw new Error(
      `Firebase Admin SDK initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Initialize and export admin instance
const firebaseAdmin = initializeFirebaseAdmin();

export default admin;
export { firebaseAdmin };

