import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import env from './config/env';
import { getSystemConfig, validateLocalDevConfig, useLocalStorage, getSummariesDirectory } from './config';
import logger from './utils/logger';
import db from './config/database';
import './config/passport'; // Initialize Passport (conditional)
import './config/firebase-admin'; // Initialize Firebase Admin SDK (conditional)
import { registerAuthRoutes } from './routes/auth.routes';
import summarizeRoutes from './routes/summarize.routes';
import statusRoutes from './routes/status.routes';
import historyRoutes, { summaryAliasRouter } from './routes/history.routes';
import configRoutes from './routes/config.routes';
import tierRoutes from './routes/tier.routes';
import creditsRoutes from './routes/credits.routes';
import userRoutes from './routes/user.routes';
import taskRoutes from './routes/task.routes';
import guestRoutes from './routes/guest.routes';
import testRoutes from './routes/test.routes';
import researchRoutes from './routes/research.routes';
import shareRoutes from './routes/share.routes';
import { shutdown as shutdownJobService } from './services/job.service';
import './jobs/resetCredits.job'; // Legacy credit reset cron job (kept for backward compatibility)
import { startCreditResetJobs, stopCreditResetJobs } from './jobs/credit-reset.job'; // New credit reset jobs (Phase 3)
import { startResearchCleanupService, stopResearchCleanupService } from './services/research-cleanup.service';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { generalRateLimiter } from './middleware/rateLimit.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import helmet from 'helmet';

// Initialize Express app
const app: Express = express();

// Trust proxy - needed for correct IP address extraction (especially for IPv6)
// This is safe even in development as it only affects req.ip, req.ips, req.protocol
app.set('trust proxy', true);

// CORS Configuration - Support multiple origins for production
// All origins must be configured via environment variables (no hardcoded values)
const getAllowedOrigins = (): string[] => {
  const origins = [env.FRONTEND_URL];
  // Add additional frontend URLs from environment (for production domains)
  // FRONTEND_URLS should include all production domains (comma-separated)
  if (env.FRONTEND_URLS && env.FRONTEND_URLS.length > 0) {
    origins.push(...env.FRONTEND_URLS);
  }
  return origins;
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = getAllowedOrigins();
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept', // Required for SSE requests (text/event-stream)
    'Cache-Control', // Automatically added by fetch API
    'Pragma', // Cache control header
    'Expires', // Cache control header
    'x-guest-session-id', // Guest session header (browsers send headers in lowercase)
  ],
  exposedHeaders: ['X-Request-ID'], // Expose custom headers to client
};

app.use(cors(corsOptions));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API (frontend handles this)
}));

// Request ID middleware (must be before logging)
app.use(requestIdMiddleware);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport session middleware (if auth enabled)
if (env.AUTH_ENABLED) {
  const systemConfig = getSystemConfig();
  app.use(
    session({
      secret: env.JWT_SECRET || 'temp-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: systemConfig.session_max_age_hours * 60 * 60 * 1000, // From config
      },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
}

// Apply general rate limiting to all routes
app.use(generalRateLimiter);

// Request logging middleware (after request ID middleware)
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const useLocalStorageValue = useLocalStorage();
    
    // Check database connection
    // In local storage mode, db is null but the system is still healthy
    const dbStatus = useLocalStorageValue ? 'local_storage' : (db ? 'connected' : 'disconnected');

    // System is healthy if database is connected OR if using local storage
    const isHealthy = dbStatus === 'connected' || dbStatus === 'local_storage';

    // Build health check response with storage and auth information
    const healthStatus: any = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
      },
      storage: {
        mode: useLocalStorageValue ? 'local' : 'firestore',
        enabled: useLocalStorageValue,
      },
      auth: {
        enabled: env.AUTH_ENABLED,
        mode: env.USE_FIREBASE_AUTH ? 'firebase' : 'jwt',
      },
      version: '1.0.0',
    };

    // Add local storage details if using local storage (using centralized config)
    if (useLocalStorageValue) {
      try {
        const summariesDir = getSummariesDirectory();
        if (fs.existsSync(summariesDir)) {
          const files = fs.readdirSync(summariesDir);
          healthStatus.storage.fileCount = files.filter((f: string) => f.endsWith('.json')).length;
          healthStatus.storage.dataDirectory = summariesDir;
          healthStatus.storage.directoryExists = true;
        } else {
          healthStatus.storage.directoryExists = false;
          healthStatus.storage.warning = 'Data directory does not exist';
        }
      } catch (error) {
        healthStatus.storage.error = 'Cannot read data directory';
        healthStatus.storage.errorDetails = error instanceof Error ? error.message : String(error);
      }
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Authentication routes
app.use('/auth', registerAuthRoutes());

// Summary routes
app.use('/api/summarize', summarizeRoutes);

// Research routes (includes share creation endpoint)
app.use('/api/research', researchRoutes);

// Share routes (public shared research access)
// GET /api/shared/:shareId - Get shared research (public)
app.use('/api/shared', shareRoutes);

// Guest routes
app.use('/api/guest', guestRoutes);

// Status routes (SSE)
app.use('/api/status', statusRoutes);

// Task routes
app.use('/api/tasks', taskRoutes);

// History routes
app.use('/api/history', historyRoutes);

// Config routes (frontend configuration)
app.use('/api/config', configRoutes);

// Tier routes (tier upgrade requests)
app.use('/api/tier', tierRoutes);

// Credits routes (credit balance and transactions)
app.use('/api/credits', creditsRoutes);

// User routes (quota, etc.)
app.use('/api/user', userRoutes);

// Summary alias routes (alternative endpoint for consistency)
app.use('/api/summary', summaryAliasRouter);

// Test routes (development only)
if (env.NODE_ENV !== 'production') {
  app.use('/api/test', testRoutes);
  // Also serve test page at /test (without /api prefix for cleaner URL)
  app.use('/test', testRoutes);
}

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'YouTube Batch Summary Service API',
    version: '1.0.0',
    status: 'running',
  });
});

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  const systemConfig = getSystemConfig();

  // Stop credit reset jobs
  stopCreditResetJobs();

  // Stop research cleanup service
  stopResearchCleanupService();
  
  // Shutdown job service
  shutdownJobService();

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after configured timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, systemConfig.graceful_shutdown_timeout_seconds * 1000);
}

// Validate local development configuration before starting server
try {
  validateLocalDevConfig();
} catch (error) {
  logger.error('Configuration validation failed', error);
  process.exit(1);
}

// Start server with error handling
const PORT = env.PORT || 5000;
let server: ReturnType<typeof app.listen>;

try {
  server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Frontend URL: ${env.FRONTEND_URL}`);
    logger.info(`Auth enabled: ${env.AUTH_ENABLED}`);
    logger.info(`Firebase Auth enabled: ${env.USE_FIREBASE_AUTH}`);
    
    // Start Phase 3 credit reset jobs
    startCreditResetJobs();

    // Start research approval job cleanup service (Phase 2)
    startResearchCleanupService();
  });

  // Handle server errors
  server.on('error', (error: Error) => {
    logger.error('Server error:', error);
    process.exit(1);
  });
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', reason);
  gracefulShutdown('unhandledRejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', error);
  gracefulShutdown('uncaughtException');
});

export default app;
