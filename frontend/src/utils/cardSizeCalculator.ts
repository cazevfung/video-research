import { SummaryListItem } from '@/types';
import { getDaysSince } from '@/utils/date';

export type CardSize = 'small' | 'medium' | 'wide' | 'tall';

/**
 * Calculate card size based on content and position
 * Pinterest/Bloomberg-style: natural variation with subtle differences
 */
export function calculateCardSize(
  summary: SummaryListItem,
  index: number,
  previousSizes: CardSize[] = []
): CardSize {
  const videoCount = summary.video_count;
  const titleLength = summary.batch_title.length;
  const daysSinceCreated = getDaysSince(summary.created_at);

  // Priority scoring - more granular for better variety
  let score = 0;

  // Video count (more videos = might need more space)
  if (videoCount >= 5) score += 18;
  else if (videoCount >= 4) score += 14;
  else if (videoCount >= 3) score += 10;
  else if (videoCount >= 2) score += 6;
  else score += 2;

  // Recency (newer = slightly more prominent)
  if (daysSinceCreated <= 1) score += 12;
  else if (daysSinceCreated <= 3) score += 9;
  else if (daysSinceCreated <= 7) score += 6;
  else if (daysSinceCreated <= 14) score += 4;
  else if (daysSinceCreated <= 30) score += 2;

  // Title length (longer titles get slightly more space)
  if (titleLength > 100) score += 10;
  else if (titleLength > 80) score += 8;
  else if (titleLength > 60) score += 6;
  else if (titleLength > 40) score += 4;
  else score += 2;

  // Pattern-based adjustment for visual rhythm
  const patternModifier = getPatternModifier(index);
  score += patternModifier;

  // Check adjacency rules to prevent clustering
  const adjacencyPenalty = getAdjacencyPenalty(index, previousSizes);
  score -= adjacencyPenalty;

  // Determine size with natural distribution (lowered thresholds for more variety)
  // tall (4 rows high): rare, only exceptional content
  if (score >= 32) return 'tall';
  // wide (2 columns): moderate frequency for visual variety
  if (score >= 22) return 'wide';
  // medium (3 rows): common for good content
  if (score >= 12) return 'medium';
  // small (2 rows): base size
  return 'small';
}

// getDaysSince is now imported from @/utils/date for safe date handling

/**
 * Pattern modifier to create natural visual rhythm
 * Pinterest-style: organic spacing of larger cards
 */
function getPatternModifier(index: number): number {
  // Create natural visual rhythm with variation
  if (index === 0) return 12;       // First card prominent
  if (index % 11 === 0) return 14;  // Every 11th = tall
  if (index % 7 === 0) return 10;   // Every 7th = wide
  if (index % 5 === 0) return 7;    // Every 5th = medium
  if (index % 3 === 0) return 4;    // Every 3rd = slight boost
  
  // Add subtle randomness based on index
  const pseudoRandom = (index * 7) % 5;
  return pseudoRandom;
}

/**
 * Penalty for adjacency to prevent clustering of larger cards
 * Ensures natural distribution without too many big cards together
 */
function getAdjacencyPenalty(index: number, previousSizes: CardSize[]): number {
  if (previousSizes.length === 0) return 0;

  const lastSize = previousSizes[previousSizes.length - 1];
  const secondLastSize = previousSizes.length > 1 ? previousSizes[previousSizes.length - 2] : null;
  
  // Strong penalty if previous card was tall
  if (lastSize === 'tall') return 25;
  
  // Moderate penalty if previous was wide
  if (lastSize === 'wide') return 15;
  
  // Light penalty if previous was medium
  if (lastSize === 'medium') return 8;
  
  // Additional penalty if last two cards were both non-small
  if (lastSize !== 'small' && secondLastSize !== 'small' && secondLastSize !== null) {
    return 10;
  }
  
  return 0;
}

/**
 * Calculate sizes for all summaries
 * Pinterest-style distribution: natural variety without extremes
 * Target: 40% small, 35% medium, 20% wide, 5% tall
 */
export function calculateCardSizes(summaries: SummaryListItem[]): CardSize[] {
  const sizes: CardSize[] = [];
  const sizeCounts = { small: 0, medium: 0, wide: 0, tall: 0 };
  
  // Natural distribution inspired by Pinterest - more balanced
  const targetCounts = {
    small: Math.max(1, Math.floor(summaries.length * 0.40)),  // 40% small (base)
    medium: Math.max(1, Math.floor(summaries.length * 0.35)), // 35% medium (slightly taller)
    wide: Math.max(1, Math.floor(summaries.length * 0.20)),   // 20% wide (horizontal variety)
    tall: Math.max(0, Math.floor(summaries.length * 0.05)),   // 5% tall (vertical accent)
  };

  console.log('Target distribution:', targetCounts);

  for (let i = 0; i < summaries.length; i++) {
    let size = calculateCardSize(summaries[i], i, sizes);
    
    console.log(`Card ${i}: initial size=${size}, score calculation for debugging`);

    // Enforce distribution limits with graceful fallbacks
    if (size === 'tall' && sizeCounts.tall >= targetCounts.tall) {
      size = 'wide'; // Tall overflows to wide (not medium)
    }
    if (size === 'wide' && sizeCounts.wide >= targetCounts.wide) {
      size = 'medium'; // Wide overflows to medium
    }
    if (size === 'medium' && sizeCounts.medium >= targetCounts.medium) {
      size = 'small'; // Medium overflows to small
    }

    // Prevent clustering of larger cards
    if (i > 0) {
      const prevSize = sizes[i - 1];
      // Don't allow two tall cards in a row
      if (prevSize === 'tall' && size === 'tall') {
        size = 'small';
      }
      // Don't allow two wide cards in a row
      if (prevSize === 'wide' && size === 'wide') {
        size = 'medium';
      }
    }

    sizes.push(size);
    sizeCounts[size]++;
  }

  console.log('Final distribution:', sizeCounts);
  return sizes;
}

