#!/usr/bin/env ts-node
/**
 * Test script for video metadata fetching
 * Tests if the API can successfully fetch metadata for specific YouTube videos
 * 
 * Usage: npm run test:metadata
 * Or: ts-node scripts/test-metadata.ts
 */

import { fetchTranscript } from '../src/services/transcript.service';
import { extractVideoId } from '../src/utils/validators';
import logger from '../src/utils/logger';

const TEST_VIDEOS = [
  'https://www.youtube.com/watch?v=Q934O_uJCiY',
  'https://www.youtube.com/watch?v=puEPz2_B_aM',
  'https://www.youtube.com/watch?v=rcWPk8271OE&t=1s',
];

interface TestResult {
  url: string;
  videoId: string;
  success: boolean;
  title?: string;
  channel?: string;
  error?: string;
  metadataSource?: 'youtube' | 'supadata' | 'fallback';
}

async function testMetadataFetch(url: string): Promise<TestResult> {
  const videoId = extractVideoId(url) || 'UNKNOWN';
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Testing: ${url}`);
  console.log(`Video ID: ${videoId}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  try {
    // Fetch transcript (which includes metadata fetching)
    const result = await fetchTranscript(url);
    
    if ('error' in result) {
      return {
        url,
        videoId,
        success: false,
        error: result.error,
        metadataSource: 'fallback',
      };
    }
    
    // Check if we got metadata or fallback values
    const hasMetadata = result.title !== `Video ${videoId}` && result.channel !== 'Unknown';
    const metadataSource = hasMetadata ? (result.title && result.channel ? 'unknown' : 'fallback') : 'fallback';
    
    return {
      url,
      videoId,
      success: hasMetadata,
      title: result.title,
      channel: result.channel,
      metadataSource: metadataSource as 'youtube' | 'supadata' | 'fallback',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error fetching metadata for ${url}`, { error: errorMessage });
    
    return {
      url,
      videoId,
      success: false,
      error: errorMessage,
      metadataSource: 'fallback',
    };
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    Video Metadata Fetch Test                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');
  
  const results: TestResult[] = [];
  
  for (const url of TEST_VIDEOS) {
    const result = await testMetadataFetch(url);
    results.push(result);
    
    // Display result
    if (result.success) {
      console.log(`\n✓ SUCCESS - Metadata fetched successfully`);
      console.log(`  Title: ${result.title}`);
      console.log(`  Channel: ${result.channel}`);
    } else {
      console.log(`\n✗ FAILED - Metadata fetch failed`);
      if (result.title && result.channel) {
        console.log(`  Title: ${result.title}`);
        console.log(`  Channel: ${result.channel}`);
      }
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      if (result.metadataSource === 'fallback') {
        console.log(`  ⚠ Using fallback values (Video ID and "Unknown")`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log(`\n\n╔═══════════════════════════════════════════════════════════════════════════════╗`);
  console.log('║                              Test Summary                                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  
  console.log(`Total Videos Tested: ${results.length}`);
  console.log(`Successful: ${successCount} ✓`);
  console.log(`Failed: ${failureCount} ✗`);
  
  console.log(`\nDetailed Results:`);
  results.forEach((result, index) => {
    const status = result.success ? '✓' : '✗';
    console.log(`\n${index + 1}. ${status} ${result.url}`);
    if (result.success) {
      console.log(`   Title: ${result.title}`);
      console.log(`   Channel: ${result.channel}`);
    } else {
      if (result.title === `Video ${result.videoId}` || result.channel === 'Unknown') {
        console.log(`   ⚠ Using fallback values - metadata fetch failed`);
        console.log(`   Title: ${result.title}`);
        console.log(`   Channel: ${result.channel}`);
      } else if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  });
  
  console.log(`\n`);
  
  // Exit with appropriate code
  if (failureCount > 0) {
    process.exit(1);
  }
}

// Run the test
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
