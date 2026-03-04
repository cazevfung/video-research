#!/usr/bin/env node

/**
 * Safe Production Build Script
 * 
 * Ensures .env.local doesn't interfere with production builds by:
 * 1. Temporarily renaming .env.local if it exists
 * 2. Running the production build
 * 3. Restoring .env.local after build
 * 
 * This prevents .env.local values from being baked into production builds.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();
const envLocalPath = path.join(projectRoot, '.env.local');
const envLocalBackupPath = path.join(projectRoot, '.env.local.backup');
const envProductionPath = path.join(projectRoot, '.env.production');

let envLocalExists = false;
let envLocalBackedUp = false;

/** Load .env.production into process.env so the build uses production config only. */
function loadEnvProduction() {
  if (!fs.existsSync(envProductionPath)) return;
  const content = fs.readFileSync(envProductionPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    process.env[key] = value;
  });
}

console.log('🔒 Starting safe production build...\n');

// Step 1: Check if .env.local exists
if (fs.existsSync(envLocalPath)) {
  envLocalExists = true;
  console.log('⚠️  Found .env.local - this will override .env.production!');
  console.log('   Temporarily renaming it...\n');
  
  // Rename .env.local out of the way (avoids EPERM on Windows when file is open)
  fs.renameSync(envLocalPath, envLocalBackupPath);
  envLocalBackedUp = true;
  console.log('✅ .env.local temporarily removed for production build\n');
}

// Step 2: Verify .env.production exists
if (!fs.existsSync(envProductionPath)) {
  console.error('❌ ERROR: .env.production not found!');
  console.error('   Production builds require .env.production file.');
  console.error('   Please create it with production environment variables.\n');
  
  // Restore .env.local if we backed it up
  if (envLocalBackedUp) {
    fs.renameSync(envLocalBackupPath, envLocalPath);
    console.log('✅ .env.local restored');
  }
  
  process.exit(1);
}

console.log('✅ .env.production found');

// Load production env so build and child processes use it (not .env or any local overrides)
loadEnvProduction();
process.env.NODE_ENV = 'production';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
if (apiUrl) {
  const safeUrl = apiUrl.includes('localhost') ? '(localhost - INVALID FOR PRODUCTION)' : apiUrl;
  console.log(`   NEXT_PUBLIC_API_URL: ${safeUrl}`);
}
if (projectId) console.log(`   NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${projectId}`);
console.log('\n🔍 Validating environment variables...\n');

// Step 3: Run validation script
try {
  execSync('node scripts/validate-env.js', { stdio: 'inherit' });
} catch (error) {
  console.error('\n❌ Environment validation failed!');
  
  // Restore .env.local if we backed it up
  if (envLocalBackedUp) {
    fs.renameSync(envLocalBackupPath, envLocalPath);
    console.log('✅ .env.local restored');
  }
  
  process.exit(1);
}

// Step 4: Run type check
console.log('\n🔍 Running type check...\n');
try {
  execSync('npm run type-check:prod', { stdio: 'inherit' });
} catch (error) {
  console.error('\n❌ Type check failed!');
  
  // Restore .env.local if we backed it up
  if (envLocalBackedUp) {
    fs.renameSync(envLocalBackupPath, envLocalPath);
    console.log('✅ .env.local restored');
  }
  
  process.exit(1);
}

// Step 5: Run production build (explicit NODE_ENV and env so only production config is used)
console.log('\n🏗️  Building production bundle...\n');
try {
  execSync('next build --webpack', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
  console.log('\n✅ Production build completed successfully!');
} catch (error) {
  console.error('\n❌ Build failed!');
  
  // Restore .env.local if we backed it up
  if (envLocalBackedUp) {
    fs.renameSync(envLocalBackupPath, envLocalPath);
    console.log('✅ .env.local restored');
  }
  
  process.exit(1);
}

// Step 6: Restore .env.local if we backed it up
if (envLocalBackedUp) {
  fs.renameSync(envLocalBackupPath, envLocalPath);
  console.log('\n✅ .env.local restored');
}

console.log('\n🎉 Safe production build complete!');
console.log('   Build output is in: out/');
console.log('   Ready for Firebase deployment: npm run deploy:firebase\n');
