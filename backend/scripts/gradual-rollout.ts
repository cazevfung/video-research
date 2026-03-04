/**
 * Phase 5: Gradual Rollout Utility
 * 
 * Enables Firebase Auth for a percentage of users based on email hash.
 * This allows gradual rollout: 10% → 50% → 100%
 * 
 * Usage:
 *   From backend directory:
 *     npx ts-node scripts/gradual-rollout.ts --percentage=10
 *     npm run rollout:check -- --percentage=10
 *   Or use npm script:
 *     npm run rollout:check -- --percentage=10
 */

import { getSystemConfig } from '../src/config';
import logger from '../src/utils/logger';

/**
 * Calculate hash of email for consistent user selection
 */
function hashEmail(email: string): number {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Determine if user should use Firebase Auth based on percentage rollout
 */
export function shouldUseFirebaseAuth(email: string, percentage: number): boolean {
  if (percentage >= 100) {
    return true;
  }
  if (percentage <= 0) {
    return false;
  }
  
  const hash = hashEmail(email);
  const bucket = hash % 100;
  
  return bucket < percentage;
}

/**
 * Get rollout status for a user
 */
export function getRolloutStatus(email: string, percentage: number): {
  useFirebaseAuth: boolean;
  bucket: number;
  percentage: number;
} {
  const hash = hashEmail(email);
  const bucket = hash % 100;
  const useFirebaseAuth = bucket < percentage;
  
  return {
    useFirebaseAuth,
    bucket,
    percentage,
  };
}

/**
 * Main function to check rollout status
 */
async function checkRolloutStatus(): Promise<void> {
  const args = process.argv.slice(2);
  const percentageArg = args.find(arg => arg.startsWith('--percentage='));
  const percentage = percentageArg 
    ? parseInt(percentageArg.split('=')[1], 10)
    : 0;

  if (isNaN(percentage) || percentage < 0 || percentage > 100) {
    console.error('Invalid percentage. Must be between 0 and 100.');
    console.log('Usage: npx ts-node scripts/gradual-rollout.ts --percentage=10');
    process.exit(1);
  }

  console.log(`\n📊 Gradual Rollout Status Check\n`);
  console.log(`Target Percentage: ${percentage}%\n`);

  // Test with sample emails
  const testEmails = [
    'user1@example.com',
    'user2@example.com',
    'user3@example.com',
    'admin@example.com',
    'test@example.com',
  ];

  console.log('Sample User Rollout Status:');
  console.log('─'.repeat(60));
  
  let enabledCount = 0;
  for (const email of testEmails) {
    const status = getRolloutStatus(email, percentage);
    const statusIcon = status.useFirebaseAuth ? '✅' : '⏸️';
    console.log(`${statusIcon} ${email.padEnd(30)} | Bucket: ${status.bucket.toString().padStart(3)} | Firebase Auth: ${status.useFirebaseAuth ? 'ENABLED' : 'DISABLED'}`);
    if (status.useFirebaseAuth) {
      enabledCount++;
    }
  }

  console.log('─'.repeat(60));
  console.log(`\nSummary:`);
  console.log(`  Sample users enabled: ${enabledCount}/${testEmails.length} (${Math.round(enabledCount / testEmails.length * 100)}%)`);
  console.log(`  Target percentage: ${percentage}%`);
  console.log(`\n💡 To enable Firebase Auth for ${percentage}% of users:`);
  console.log(`   Set USE_FIREBASE_AUTH_PERCENTAGE=${percentage} in environment variables`);
  console.log(`   Frontend will check this value and enable Firebase Auth accordingly\n`);
}

// Run if called directly
if (require.main === module) {
  checkRolloutStatus()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { checkRolloutStatus };

