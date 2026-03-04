#!/usr/bin/env ts-node
/**
 * Development Validation Script
 * 
 * Validates local development configuration and checks for common issues.
 * 
 * Usage: npm run dev:validate
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import {
  getSummariesDirectory,
  getUsersDirectory,
  getSystemConfig,
  validateLocalDevConfig,
  useLocalStorage,
} from '../src/config';
import env from '../src/config/env';

interface ValidationResult {
  category: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }>;
}

async function checkDirectory(dir: string, name: string): Promise<{ exists: boolean; readable: boolean; writable: boolean; fileCount: number }> {
  try {
    await fs.access(dir, fsSync.constants.F_OK | fsSync.constants.R_OK | fsSync.constants.W_OK);
    const files = await fs.readdir(dir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    return {
      exists: true,
      readable: true,
      writable: true,
      fileCount: jsonFiles.length,
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    return {
      exists: err.code !== 'ENOENT',
      readable: false,
      writable: false,
      fileCount: 0,
    };
  }
}

async function checkConfigFile(): Promise<boolean> {
  try {
    const configPath = path.join(process.cwd(), 'config.yaml');
    await fs.access(configPath, fsSync.constants.F_OK | fsSync.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function checkEnvFile(): Promise<boolean> {
  try {
    const envPath = path.join(process.cwd(), '.env');
    await fs.access(envPath, fsSync.constants.F_OK | fsSync.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function validateConfig(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Storage Configuration
  const storageResults: ValidationResult = {
    category: 'Storage Configuration',
    checks: [],
  };

  const useLocalStorageValue = useLocalStorage();
  storageResults.checks.push({
    name: 'Storage Mode',
    status: 'pass',
    message: `Storage mode: ${useLocalStorageValue ? 'LOCAL FILE STORAGE' : 'FIRESTORE'}`,
  });

  if (useLocalStorageValue) {
    const summariesDir = getSummariesDirectory();
    const usersDir = getUsersDirectory();

    storageResults.checks.push({
      name: 'Summaries Directory Path',
      status: 'pass',
      message: `Summaries directory: ${summariesDir}`,
    });

    storageResults.checks.push({
      name: 'Users Directory Path',
      status: 'pass',
      message: `Users directory: ${usersDir}`,
    });

    // Check directories
    const summariesCheck = await checkDirectory(summariesDir, 'summaries');
    const usersCheck = await checkDirectory(usersDir, 'users');

    if (!summariesCheck.exists) {
      storageResults.checks.push({
        name: 'Summaries Directory Exists',
        status: 'fail',
        message: `Summaries directory does not exist: ${summariesDir}`,
      });
    } else {
      storageResults.checks.push({
        name: 'Summaries Directory Exists',
        status: 'pass',
        message: `Summaries directory exists (${summariesCheck.fileCount} JSON files)`,
      });

      if (!summariesCheck.readable) {
        storageResults.checks.push({
          name: 'Summaries Directory Readable',
          status: 'fail',
          message: 'Summaries directory is not readable',
        });
      }

      if (!summariesCheck.writable) {
        storageResults.checks.push({
          name: 'Summaries Directory Writable',
          status: 'fail',
          message: 'Summaries directory is not writable',
        });
      }
    }

    if (!usersCheck.exists) {
      storageResults.checks.push({
        name: 'Users Directory Exists',
        status: 'fail',
        message: `Users directory does not exist: ${usersDir}`,
      });
    } else {
      storageResults.checks.push({
        name: 'Users Directory Exists',
        status: 'pass',
        message: `Users directory exists (${usersCheck.fileCount} JSON files)`,
      });

      if (!usersCheck.readable) {
        storageResults.checks.push({
          name: 'Users Directory Readable',
          status: 'fail',
          message: 'Users directory is not readable',
        });
      }

      if (!usersCheck.writable) {
        storageResults.checks.push({
          name: 'Users Directory Writable',
          status: 'fail',
          message: 'Users directory is not writable',
        });
      }
    }
  } else {
    // Check Firestore configuration
    if (!env.GOOGLE_APPLICATION_CREDENTIALS && !env.FIRESTORE_EMULATOR_HOST) {
      storageResults.checks.push({
        name: 'Firebase Configuration',
        status: 'warning',
        message: 'No Firebase credentials or emulator host configured',
      });
    } else {
      storageResults.checks.push({
        name: 'Firebase Configuration',
        status: 'pass',
        message: env.FIRESTORE_EMULATOR_HOST
          ? `Using Firestore emulator: ${env.FIRESTORE_EMULATOR_HOST}`
          : `Using Firebase credentials: ${env.GOOGLE_APPLICATION_CREDENTIALS}`,
      });
    }
  }

  results.push(storageResults);

  // Authentication Configuration
  const authResults: ValidationResult = {
    category: 'Authentication Configuration',
    checks: [],
  };

  authResults.checks.push({
    name: 'Auth Enabled',
    status: env.AUTH_ENABLED ? 'pass' : 'pass',
    message: `Authentication: ${env.AUTH_ENABLED ? 'ENABLED' : 'DISABLED'}`,
  });

  if (!env.AUTH_ENABLED) {
    authResults.checks.push({
      name: 'Dev User ID',
      status: 'pass',
      message: `Dev User ID: ${env.DEV_USER_ID}`,
    });

    authResults.checks.push({
      name: 'Dev User Email',
      status: 'pass',
      message: `Dev User Email: ${env.DEV_USER_EMAIL}`,
    });

    authResults.checks.push({
      name: 'Dev User Name',
      status: 'pass',
      message: `Dev User Name: ${env.DEV_USER_NAME}`,
    });
  } else {
    if (useLocalStorageValue) {
      authResults.checks.push({
        name: 'Auth with Local Storage',
        status: 'warning',
        message: 'AUTH_ENABLED=true with local storage may cause user ID mismatches',
      });
    }
  }

  results.push(authResults);

  // Configuration Files
  const configResults: ValidationResult = {
    category: 'Configuration Files',
    checks: [],
  };

  const configExists = await checkConfigFile();
  configResults.checks.push({
    name: 'config.yaml',
    status: configExists ? 'pass' : 'fail',
    message: configExists ? 'config.yaml exists' : 'config.yaml not found',
  });

  const envExists = await checkEnvFile();
  configResults.checks.push({
    name: '.env file',
    status: envExists ? 'pass' : 'warning',
    message: envExists ? '.env file exists' : '.env file not found (using defaults)',
  });

  results.push(configResults);

  // System Configuration
  const systemResults: ValidationResult = {
    category: 'System Configuration',
    checks: [],
  };

  const systemConfig = getSystemConfig();
  
  systemResults.checks.push({
    name: 'Node Environment',
    status: 'pass',
    message: `NODE_ENV: ${env.NODE_ENV}`,
  });

  systemResults.checks.push({
    name: 'Port',
    status: 'pass',
    message: `Port: ${env.PORT}`,
  });

  systemResults.checks.push({
    name: 'Frontend URL',
    status: 'pass',
    message: `Frontend URL: ${env.FRONTEND_URL}`,
  });

  systemResults.checks.push({
    name: 'Max Concurrent Jobs',
    status: 'pass',
    message: `Max concurrent jobs: ${systemConfig.max_concurrent_jobs}`,
  });

  systemResults.checks.push({
    name: 'Dev Mode Credits',
    status: 'pass',
    message: `Dev mode credits: ${systemConfig.dev_mode_credits}`,
  });

  results.push(systemResults);

  // Configuration Consistency
  const consistencyResults: ValidationResult = {
    category: 'Configuration Consistency',
    checks: [],
  };

  if (useLocalStorageValue && env.AUTH_ENABLED) {
    consistencyResults.checks.push({
      name: 'Local Storage + Auth',
      status: 'warning',
      message: 'Using local storage with AUTH_ENABLED=true may cause user ID mismatches',
    });
  } else {
    consistencyResults.checks.push({
      name: 'Storage + Auth Consistency',
      status: 'pass',
      message: 'Storage and auth configuration are consistent',
    });
  }

  if (useLocalStorageValue && env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      await fs.access(env.GOOGLE_APPLICATION_CREDENTIALS, fs.constants.F_OK);
      consistencyResults.checks.push({
        name: 'Firebase Credentials with Local Storage',
        status: 'warning',
        message: 'Firebase credentials exist but using local storage (fine for dev, ensure production uses Firestore)',
      });
    } catch {
      // Credentials file doesn't exist, which is fine
      consistencyResults.checks.push({
        name: 'Firebase Credentials',
        status: 'pass',
        message: 'Firebase credentials path configured but file not found (expected for local storage)',
      });
    }
  }

  results.push(consistencyResults);

  return results;
}

function printResults(results: ValidationResult[]) {
  console.log('\n🔍 Validation Results\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let totalPassed = 0;
  let totalWarnings = 0;
  let totalFailed = 0;

  for (const result of results) {
    console.log(`\n📋 ${result.category}`);
    console.log('─'.repeat(70));

    for (const check of result.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
      console.log(`  ${icon} ${check.name}: ${check.message}`);

      if (check.status === 'pass') totalPassed++;
      else if (check.status === 'warning') totalWarnings++;
      else totalFailed++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Summary:');
  console.log(`   ✅ Passed: ${totalPassed}`);
  console.log(`   ⚠️  Warnings: ${totalWarnings}`);
  console.log(`   ❌ Failed: ${totalFailed}`);

  if (totalFailed === 0 && totalWarnings === 0) {
    console.log('\n✅ All checks passed! Your local development environment is ready.\n');
  } else if (totalFailed === 0) {
    console.log('\n⚠️  Some warnings found. Review the output above.\n');
  } else {
    console.log('\n❌ Some checks failed. Please fix the issues above.\n');
    process.exit(1);
  }
}

async function main() {
  try {
    // Run validation function from config
    console.log('🔍 Running configuration validation...');
    try {
      validateLocalDevConfig();
      console.log('✅ Configuration validation passed\n');
    } catch (error) {
      console.warn('⚠️  Configuration validation warnings:', error);
    }

    // Run custom validation checks
    const results = await validateConfig();
    printResults(results);

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

