#!/usr/bin/env node

/**
 * Validate environment variables before build
 * Ensures production builds have required variables set
 * 
 * This script reads from .env.production automatically when NODE_ENV=production
 * Next.js loads .env.production automatically, so variables are already in process.env
 */

const fs = require('fs');
const path = require('path');

// Load .env.production file if it exists
function loadEnvProduction() {
  const envPath = path.join(process.cwd(), '.env.production');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = cleanValue;
          }
        }
      }
    });
  }
}

const requiredEnvVars = {
  production: [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ],
  development: [], // No required vars for dev
};

function validateEnv() {
  // Check if .env.local exists - it will override .env.production!
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const hasLocalEnv = fs.existsSync(envLocalPath);
  
  // Load .env.production if it exists
  loadEnvProduction();
  
  // Next.js automatically sets NODE_ENV=production during build
  // Check NODE_ENV or if we're being called as part of a build process
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  // If NODE_ENV is not explicitly set, check if .env.production exists
  // This helps when the script is run standalone before build
  const envProductionPath = path.join(process.cwd(), '.env.production');
  const hasProductionEnv = fs.existsSync(envProductionPath);
  
  // If we have .env.production, assume production build even if NODE_ENV is not set
  if (hasProductionEnv && !isProduction) {
    console.log('⚠️  .env.production exists but NODE_ENV is not "production"');
    console.log('   Assuming production build context...');
    // Continue with validation as if it's production
  } else if (!isProduction && !hasProductionEnv) {
    console.log('✅ Development mode - skipping validation');
    return true;
  }
  
  // CRITICAL: Warn if .env.local exists during production build
  // .env.local has HIGHEST priority and will override .env.production!
  if (hasLocalEnv && (isProduction || hasProductionEnv)) {
    console.error('\n❌ CRITICAL: .env.local exists and will override .env.production!');
    console.error('   Next.js loads .env.local with HIGHEST priority, even during production builds.');
    console.error('   This can cause production builds to use development settings.');
    console.error('\n   Solutions:');
    console.error('   1. Temporarily rename .env.local before building:');
    console.error('      mv .env.local .env.local.backup');
    console.error('      npm run build:production');
    console.error('      mv .env.local.backup .env.local');
    console.error('   2. Or delete .env.local if you don\'t need it for production builds');
    console.error('   3. Or use environment variables directly: NEXT_PUBLIC_*=value npm run build:production');
    console.error('\n   Current .env.local will override these production values:');
    
    // Check for problematic variables in .env.local
    try {
      const localContent = fs.readFileSync(envLocalPath, 'utf8');
      const problematicVars = [
        'NEXT_PUBLIC_SKIP_AUTH',
        'NEXT_PUBLIC_API_URL',
        'NEXT_PUBLIC_USE_FIREBASE_AUTH',
      ];
      
      problematicVars.forEach(varName => {
        const regex = new RegExp(`^${varName}=(.+)$`, 'm');
        const match = localContent.match(regex);
        if (match) {
          console.error(`      ${varName}=${match[1]}`);
        }
      });
    } catch (err) {
      // Ignore read errors
    }
    
    console.error('\n   ⚠️  Build will continue, but may use incorrect values from .env.local!\n');
    
    // In CI/CD, we should fail the build
    if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
      console.error('   ❌ Failing build in CI/CD environment to prevent deployment issues.');
      process.exit(1);
    }
  }

  console.log('🔍 Validating production environment variables...');

  const required = requiredEnvVars.production;
  const missing = required.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Tip: Make sure .env.production exists and contains all required variables.');
    console.error('   See .env.example for a template.');
    process.exit(1);
  }

  // Validate API URL is not localhost in production
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
    console.error('❌ NEXT_PUBLIC_API_URL cannot be localhost in production!');
    console.error(`   Current value: ${apiUrl}`);
    console.error('\n💡 Tip: Update .env.production with your Cloud Run URL:');
    console.error('   NEXT_PUBLIC_API_URL=https://your-cloud-run-url.run.app');
    process.exit(1);
  }

  // Validate API URL looks like a valid production URL
  if (apiUrl && !apiUrl.startsWith('https://')) {
    console.error('❌ NEXT_PUBLIC_API_URL must use HTTPS in production!');
    console.error(`   Current value: ${apiUrl}`);
    process.exit(1);
  }

  // Validate SKIP_AUTH is false in production
  if (process.env.NEXT_PUBLIC_SKIP_AUTH === 'true') {
    console.error('❌ NEXT_PUBLIC_SKIP_AUTH cannot be true in production!');
    console.error('   This is a security risk. Set it to false in .env.production');
    process.exit(1);
  }

  console.log('✅ All environment variables validated');
  console.log(`   API URL: ${apiUrl}`);
  console.log(`   Firebase Auth: ${process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === 'true' ? 'Enabled' : 'Disabled'}`);
  return true;
}

validateEnv();

