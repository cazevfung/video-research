#!/usr/bin/env ts-node
/**
 * Development Setup Script
 * 
 * Initializes local development environment by:
 * - Creating required data directories
 * - Validating configuration
 * - Providing helpful setup instructions
 * 
 * Usage: npm run dev:setup
 */

import fs from 'fs/promises';
import path from 'path';
import { getSummariesDirectory, getUsersDirectory, getSystemConfig, validateLocalDevConfig, useLocalStorage } from '../src/config';
import env from '../src/config/env';

async function setupLocalDev() {
  console.log('\n🚀 Setting up local development environment...\n');

  try {
    // Get centralized directory paths
    const summariesDir = getSummariesDirectory();
    const usersDir = getUsersDirectory();
    const systemConfig = getSystemConfig();

    // Create data directories
    const dataDirs = [
      { path: summariesDir, name: 'summaries' },
      { path: usersDir, name: 'users' },
    ];

    console.log('📁 Creating data directories...');
    for (const dir of dataDirs) {
      try {
        await fs.mkdir(dir.path, { recursive: true });
        console.log(`✅ Created directory: ${dir.path}`);
      } catch (error) {
        console.error(`❌ Failed to create directory ${dir.path}:`, error);
        throw error;
      }
    }

    // Validate local development configuration
    console.log('\n🔍 Validating configuration...');
    try {
      validateLocalDevConfig();
      console.log('✅ Configuration validation passed');
    } catch (error) {
      console.warn('⚠️  Configuration validation warnings:', error);
    }

    // Display current configuration
    console.log('\n📋 Current Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const useLocalStorageValue = useLocalStorage();
    console.log(`Storage Mode: ${useLocalStorageValue ? 'LOCAL FILE STORAGE' : 'FIRESTORE'}`);
    if (useLocalStorageValue) {
      console.log(`  Summaries Directory: ${summariesDir}`);
      console.log(`  Users Directory: ${usersDir}`);
    }
    
    console.log(`Auth Enabled: ${env.AUTH_ENABLED ? 'YES' : 'NO'}`);
    if (!env.AUTH_ENABLED) {
      console.log(`  Dev User ID: ${env.DEV_USER_ID}`);
      console.log(`  Dev User Email: ${env.DEV_USER_EMAIL}`);
      console.log(`  Dev User Name: ${env.DEV_USER_NAME}`);
    }
    
    console.log(`Development Mode: ${env.NODE_ENV === 'development' ? 'YES' : 'NO'}`);
    console.log(`Port: ${env.PORT}`);
    console.log(`Frontend URL: ${env.FRONTEND_URL}`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check for recommendations
    console.log('\n💡 Recommendations:');
    const recommendations: string[] = [];
    
    if (useLocalStorageValue && env.AUTH_ENABLED) {
      recommendations.push('⚠️  AUTH_ENABLED=true with local storage may cause user ID mismatches');
      recommendations.push('   Consider setting AUTH_ENABLED=false for local development');
    }
    
    if (useLocalStorageValue && env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credsPath = env.GOOGLE_APPLICATION_CREDENTIALS;
      try {
        const credsExists = await fs.access(credsPath).then(() => true).catch(() => false);
        if (credsExists) {
          recommendations.push('⚠️  Firebase credentials detected but using LOCAL STORAGE mode');
          recommendations.push('   This is fine for development, but ensure production uses Firestore');
        }
      } catch {
        // Credentials path doesn't exist, which is fine
      }
    }
    
    if (recommendations.length === 0) {
      console.log('✅ Configuration looks good!');
    } else {
      recommendations.forEach(rec => console.log(rec));
    }

    console.log('\n✅ Local development environment ready!');
    console.log('\n📝 Next steps:');
    console.log('1. Ensure backend/.env has:');
    console.log('   - USE_LOCAL_STORAGE=true (or set in config.yaml: system.use_local_storage: true)');
    console.log('   - AUTH_ENABLED=false (recommended for local dev)');
    console.log('   - DEV_USER_ID (optional, defaults to "dev-user-id")');
    console.log('2. Ensure frontend/.env.local has:');
    console.log('   - NEXT_PUBLIC_SKIP_AUTH=true');
    console.log('   - NEXT_PUBLIC_API_URL=http://localhost:5000');
    console.log('3. Run: npm run dev (backend) and npm run dev (frontend)');
    console.log('4. Use npm run dev:seed to add sample test data');
    console.log('5. Use npm run dev:validate to check configuration anytime\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupLocalDev().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


