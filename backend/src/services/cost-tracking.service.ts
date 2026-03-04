import db from '../config/database';
import { Timestamp, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { BatchCost, CostBreakdown, MarginReport } from '../types/credit.types';
import logger from '../utils/logger';
import { getSystemConfig } from '../config';

const BATCH_COSTS_COLLECTION = 'batch_costs';

/**
 * Cost calculation constants (from PRD)
 * These represent actual service provider costs
 */
const COST_CONSTANTS = {
  // Supadata costs (using Pro tier pricing)
  SUPADATA_COST_PER_CREDIT: 0.0057, // $0.0057 per Supadata credit
  
  // Qwen/DashScope costs (in USD, converted from CNY at ~7 CNY = $1)
  QWEN_PLUS_INPUT_PER_1K: 0.000114, // $0.000114 per 1k input tokens
  QWEN_PLUS_OUTPUT_PER_1K: 0.000286, // $0.000286 per 1k output tokens
  QWEN_FLASH_INPUT_PER_1K: 0.000021, // $0.000021 per 1k input tokens
  QWEN_FLASH_OUTPUT_PER_1K: 0.000214, // $0.000214 per 1k output tokens
  QWEN_MAX_INPUT_PER_1K: 0.000228, // $0.000228 per 1k input tokens (estimated 2x qwen-plus)
  QWEN_MAX_OUTPUT_PER_1K: 0.000572, // $0.000572 per 1k output tokens (estimated 2x qwen-plus)
  
  // Firebase costs (negligible for typical usage, but tracked for completeness)
  FIREBASE_WRITE_COST: 0.0000018, // ~$0.0000018 per write
  FIREBASE_READ_COST: 0.0000006, // ~$0.0000006 per read
  FIREBASE_STORAGE_COST_PER_BYTE: 0.00000000018, // ~$0.18/GiB/month = ~$0.00000000018 per byte
};

/**
 * Track batch costs and store in Firestore
 * 
 * @param batchId Batch ID
 * @param userId User ID
 * @param costs Cost breakdown
 * @param creditsCharged Credits charged to user
 */
export async function trackBatchCost(
  batchId: string,
  userId: string,
  costs: CostBreakdown,
  creditsCharged: number
): Promise<void> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    // For local storage mode, just log
    logger.debug('Local storage mode - skipping cost tracking', {
      batchId,
      userId,
      totalCostUSD: costs.totalCostUSD,
      creditsCharged,
    });
    return;
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // Calculate margin: (creditsCharged * 0.001 - totalCostUSD) / totalCostUSD
    // 1 credit = $0.001 USD
    const revenueUSD = creditsCharged * 0.001;
    const margin = costs.totalCostUSD > 0 
      ? ((revenueUSD - costs.totalCostUSD) / costs.totalCostUSD) * 100
      : 0;

    const batchCost: BatchCost = {
      batchId,
      userId,
      timestamp: Timestamp.now(),
      costs,
      creditsCharged,
      margin,
    };

    const costRef = db.collection(BATCH_COSTS_COLLECTION).doc(batchId);
    await costRef.set(batchCost);

    logger.info('Batch cost tracked', {
      batchId,
      userId,
      totalCostUSD: costs.totalCostUSD,
      creditsCharged,
      revenueUSD,
      margin: `${margin.toFixed(2)}%`,
    });
  } catch (error) {
    logger.error('Error tracking batch cost', error);
    // Don't throw - cost tracking failure shouldn't break batch processing
    logger.warn('Continuing without cost tracking', { batchId, userId });
  }
}

/**
 * Calculate batch cost breakdown
 * 
 * @param transcriptCount Number of transcripts fetched
 * @param aiTokens AI token usage (input/output)
 * @param firebaseOps Firebase operations (writes, reads, storage)
 * @param model AI model used ('qwen-plus', 'qwen-max', 'qwen-flash')
 * @param preCondenseTokens Optional pre-condensing token usage
 * @returns Cost breakdown
 */
export function calculateBatchCost(
  transcriptCount: number,
  aiTokens: {
    input: number;
    output: number;
  },
  firebaseOps: {
    writes: number;
    reads: number;
    storageBytes: number;
  },
  model: 'qwen-plus' | 'qwen-max' | 'qwen-flash' = 'qwen-plus',
  preCondenseTokens?: {
    input: number;
    output: number;
  }
): CostBreakdown {
  // Calculate Supadata costs
  const supadataCreditsUsed = transcriptCount; // 1 credit per transcript
  const supadataCostUSD = supadataCreditsUsed * COST_CONSTANTS.SUPADATA_COST_PER_CREDIT;

  // Calculate Qwen costs
  let qwenInputCost = 0;
  let qwenOutputCost = 0;

  // Pre-condensing costs (if applicable)
  if (preCondenseTokens) {
    qwenInputCost += (preCondenseTokens.input / 1000) * COST_CONSTANTS.QWEN_FLASH_INPUT_PER_1K;
    qwenOutputCost += (preCondenseTokens.output / 1000) * COST_CONSTANTS.QWEN_FLASH_OUTPUT_PER_1K;
  }

  // Final summary generation costs
  switch (model) {
    case 'qwen-plus':
      qwenInputCost += (aiTokens.input / 1000) * COST_CONSTANTS.QWEN_PLUS_INPUT_PER_1K;
      qwenOutputCost += (aiTokens.output / 1000) * COST_CONSTANTS.QWEN_PLUS_OUTPUT_PER_1K;
      break;
    case 'qwen-max':
      qwenInputCost += (aiTokens.input / 1000) * COST_CONSTANTS.QWEN_MAX_INPUT_PER_1K;
      qwenOutputCost += (aiTokens.output / 1000) * COST_CONSTANTS.QWEN_MAX_OUTPUT_PER_1K;
      break;
    case 'qwen-flash':
      qwenInputCost += (aiTokens.input / 1000) * COST_CONSTANTS.QWEN_FLASH_INPUT_PER_1K;
      qwenOutputCost += (aiTokens.output / 1000) * COST_CONSTANTS.QWEN_FLASH_OUTPUT_PER_1K;
      break;
  }

  const qwenCostUSD = qwenInputCost + qwenOutputCost;

  // Calculate Firebase costs
  const firebaseWriteCost = firebaseOps.writes * COST_CONSTANTS.FIREBASE_WRITE_COST;
  const firebaseReadCost = firebaseOps.reads * COST_CONSTANTS.FIREBASE_READ_COST;
  const firebaseStorageCost = firebaseOps.storageBytes * COST_CONSTANTS.FIREBASE_STORAGE_COST_PER_BYTE;
  const firebaseCostUSD = firebaseWriteCost + firebaseReadCost + firebaseStorageCost;

  // Total cost
  const totalCostUSD = supadataCostUSD + qwenCostUSD + firebaseCostUSD;

  return {
    supadata: {
      creditsUsed: supadataCreditsUsed,
      costUSD: supadataCostUSD,
    },
    qwen: {
      model,
      inputTokens: aiTokens.input + (preCondenseTokens?.input || 0),
      outputTokens: aiTokens.output + (preCondenseTokens?.output || 0),
      preCondenseTokens: preCondenseTokens,
      costUSD: qwenCostUSD,
    },
    firebase: {
      writes: firebaseOps.writes,
      reads: firebaseOps.reads,
      storageBytes: firebaseOps.storageBytes,
      costUSD: firebaseCostUSD,
    },
    totalCostUSD,
  };
}

/**
 * Get margin report for a date range
 * 
 * @param startDate Start date
 * @param endDate End date
 * @returns Margin report
 */
export async function getMarginReport(
  startDate: Date,
  endDate: Date
): Promise<MarginReport> {
  const systemConfig = getSystemConfig();
  
  if (systemConfig.use_local_storage) {
    // Return empty report for local storage mode
    return {
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      totalBatches: 0,
      totalCostUSD: 0,
      totalCreditsCharged: 0,
      totalRevenueUSD: 0,
      averageMargin: 0,
      batches: [],
    };
  }

  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const snapshot = await db
      .collection(BATCH_COSTS_COLLECTION)
      .where('timestamp', '>=', startTimestamp)
      .where('timestamp', '<=', endTimestamp)
      .orderBy('timestamp', 'desc')
      .get();
    
    const batches: BatchCost[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      batchId: doc.id,
      ...doc.data(),
    })) as BatchCost[];

    // Calculate totals
    const totalBatches = batches.length;
    const totalCostUSD = batches.reduce((sum, batch) => sum + batch.costs.totalCostUSD, 0);
    const totalCreditsCharged = batches.reduce((sum, batch) => sum + batch.creditsCharged, 0);
    const totalRevenueUSD = totalCreditsCharged * 0.001; // 1 credit = $0.001
    const averageMargin = totalCostUSD > 0 
      ? ((totalRevenueUSD - totalCostUSD) / totalCostUSD) * 100
      : 0;

    return {
      startDate: startTimestamp,
      endDate: endTimestamp,
      totalBatches,
      totalCostUSD,
      totalCreditsCharged,
      totalRevenueUSD,
      averageMargin,
      batches: batches.map((batch) => ({
        batchId: batch.batchId,
        userId: batch.userId,
        costUSD: batch.costs.totalCostUSD,
        creditsCharged: batch.creditsCharged,
        margin: batch.margin,
        timestamp: batch.timestamp,
      })),
    };
  } catch (error) {
    logger.error('Error getting margin report', error);
    throw new Error(`Failed to get margin report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

