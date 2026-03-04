/**
 * Initialize pricing configuration in Firestore
 * 
 * This script creates the initial pricing_config document in Firestore
 * with default values from the PRD.
 * 
 * Usage:
 *   npx ts-node scripts/init-pricing-config.ts
 */

import db from '../src/config/database';
import { doc, setDoc, getDoc } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { PricingConfig } from '../src/types/credit.types';
import { getSystemConfig } from '../src/config';

/**
 * Default pricing configuration matching PRD requirements
 */
const defaultPricingConfig: Omit<PricingConfig, 'lastUpdated' | 'lastUpdatedBy'> = {
  version: 1,
  tiers: {
    free: {
      credits: 120, // Monthly credits (daily reset gives 40/day)
      resetFrequency: 'daily',
    },
    starter: {
      credits: 500,
      resetFrequency: 'monthly',
    },
    pro: {
      credits: 2000,
      resetFrequency: 'monthly',
    },
    premium: {
      credits: 5000,
      resetFrequency: 'monthly',
    },
  },
  creditRates: {
    transcriptPerVideo: 10, // 10 credits per video transcript
    aiInputPer1kTokens: 0.1, // 0.1 credits per 1k input tokens
    aiOutputPer1kTokens: {
      free: 0.3, // 0.3 credits per 1k output tokens (free tier)
      premium: 0.6, // 0.6 credits per 1k output tokens (premium tier)
    },
    preCondenseInputPer1kTokens: 0.1, // 0.1 credits per 1k input tokens
    preCondenseOutputPer1kTokens: 0.5, // 0.5 credits per 1k output tokens
  },
  batchPricing: {
    '1': 20, // 1 video = 20 credits
    '2': 30, // 2 videos = 30 credits
    '3': 40, // 3 videos = 40 credits
    '4-5': 60, // 4-5 videos = 60 credits
    '6-10': 120, // 6-10 videos = 120 credits
  },
};

/**
 * Initialize pricing configuration in Firestore
 */
async function initPricingConfig(): Promise<void> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    console.log('⚠️  Local storage mode enabled - skipping Firestore initialization');
    console.log('ℹ️  Pricing config will use default values from code');
    return;
  }

  if (!db) {
    throw new Error('Database not initialized. Make sure Firebase is properly configured.');
  }

  try {
    // Check if pricing config already exists
    const docRef = doc(db, 'pricing_config', 'current');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const existing = docSnap.data() as PricingConfig;
      console.log('⚠️  Pricing configuration already exists in Firestore');
      console.log(`   Version: ${existing.version}`);
      console.log(`   Last Updated: ${existing.lastUpdated.toDate().toISOString()}`);
      console.log(`   Last Updated By: ${existing.lastUpdatedBy}`);
      console.log('\n   To update, delete the existing document first or use update script.');
      return;
    }

    // Create new pricing config
    const pricingConfig: PricingConfig = {
      ...defaultPricingConfig,
      lastUpdated: Timestamp.now(),
      lastUpdatedBy: 'system',
    };

    await setDoc(docRef, pricingConfig);

    console.log('✅ Pricing configuration initialized successfully');
    console.log('\n📋 Configuration Summary:');
    console.log(`   Version: ${pricingConfig.version}`);
    console.log(`   Free Tier: ${pricingConfig.tiers.free.credits} credits (${pricingConfig.tiers.free.resetFrequency} reset)`);
    console.log(`   Starter Tier: ${pricingConfig.tiers.starter.credits} credits (${pricingConfig.tiers.starter.resetFrequency} reset)`);
    console.log(`   Pro Tier: ${pricingConfig.tiers.pro.credits} credits (${pricingConfig.tiers.pro.resetFrequency} reset)`);
    console.log(`   Premium Tier: ${pricingConfig.tiers.premium.credits} credits (${pricingConfig.tiers.premium.resetFrequency} reset)`);
    console.log('\n💰 Batch Pricing:');
    console.log(`   1 video: ${pricingConfig.batchPricing['1']} credits`);
    console.log(`   2 videos: ${pricingConfig.batchPricing['2']} credits`);
    console.log(`   3 videos: ${pricingConfig.batchPricing['3']} credits`);
    console.log(`   4-5 videos: ${pricingConfig.batchPricing['4-5']} credits`);
    console.log(`   6-10 videos: ${pricingConfig.batchPricing['6-10']} credits`);
    console.log('\n💳 Credit Rates:');
    console.log(`   Transcript per video: ${pricingConfig.creditRates.transcriptPerVideo} credits`);
    console.log(`   AI input per 1k tokens: ${pricingConfig.creditRates.aiInputPer1kTokens} credits`);
    console.log(`   AI output per 1k tokens (free): ${pricingConfig.creditRates.aiOutputPer1kTokens.free} credits`);
    console.log(`   AI output per 1k tokens (premium): ${pricingConfig.creditRates.aiOutputPer1kTokens.premium} credits`);
    console.log(`   Pre-condense input per 1k tokens: ${pricingConfig.creditRates.preCondenseInputPer1kTokens} credits`);
    console.log(`   Pre-condense output per 1k tokens: ${pricingConfig.creditRates.preCondenseOutputPer1kTokens} credits`);
  } catch (error) {
    console.error('❌ Failed to initialize pricing configuration:', error);
    throw error;
  }
}

// Run initialization
if (require.main === module) {
  initPricingConfig()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { initPricingConfig };


