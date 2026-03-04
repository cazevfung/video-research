#!/usr/bin/env ts-node
/**
 * Research Service Test Script
 * 
 * Tests the research service endpoints and saves test data including:
 * - Supadata metadata (video search results)
 * - AI output results (generated queries, filtered videos, final summary)
 * 
 * Usage: npm run test:research
 * 
 * Example workflow:
 *   1. Start server: npm run dev (in another terminal)
 *   2. Run test script: npm run test:research
 *   3. Enter research query
 *   4. Watch progress and data will be saved to backend/data/research/
 */

import axios, { AxiosError } from 'axios';
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

interface Color {
  reset: string;
  bright: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  cyan: string;
  magenta: string;
}

const colors: Color = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Logging functions
function log(message: string, color: keyof Color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message: string) {
  log(`⚠ ${message}`, 'yellow');
}

function logDebug(message: string) {
  log(`🔍 ${message}`, 'magenta');
}

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * Ensure research data directory exists
 */
async function ensureResearchDataDir(): Promise<string> {
  const dataDir = path.join(process.cwd(), 'data', 'research');
  await fs.mkdir(dataDir, { recursive: true });
  return dataDir;
}

/**
 * Save test data to file
 */
async function saveTestData(
  jobId: string,
  data: {
    request: any;
    generated_queries?: string[];
    supadata_metadata?: any[]; // Raw video results from Supadata (before filtering)
    selected_videos?: any[];
    selected_videos_metadata?: any[]; // Selected videos with AI classification
    final_summary?: string;
    processing_stats?: any;
  }
): Promise<string> {
  const dataDir = await ensureResearchDataDir();
  const timestamp = Date.now();
  const filename = `${timestamp}-${jobId}.json`;
  const filePath = path.join(dataDir, filename);

  const testData = {
    job_id: jobId,
    timestamp: new Date().toISOString(),
    ...data,
  };

  await fs.writeFile(filePath, JSON.stringify(testData, null, 2), 'utf-8');
  logSuccess(`Test data saved to: ${filePath}`);
  return filePath;
}

/**
 * Test health check
 */
async function testHealthCheck(): Promise<boolean> {
  log('\n--- Testing Health Check Endpoint ---', 'bright');
  const url = `${API_BASE_URL}/health`;

  try {
    const response = await axios.get(url);
    logSuccess(`Health check: ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    logError(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Create a research job
 */
async function createResearchJob(
  researchQuery: string,
  language: string = 'English'
): Promise<string | null> {
  log('\n--- Creating Research Job ---', 'bright');
  const url = `${API_BASE_URL}/api/research`;

  const requestBody = {
    research_query: researchQuery,
    language: language,
  };

  logDebug(`Request: POST ${url}`);
  logDebug(`Body: ${JSON.stringify(requestBody, null, 2)}`);

  try {
    const startTime = Date.now();
    const response = await axios.post(url, requestBody);
    const duration = Date.now() - startTime;

    logSuccess(`Research job created: ${response.status} ${response.statusText} (${duration}ms)`);

    if (response.data.job_id) {
      const jobId = response.data.job_id;
      logInfo(`Job ID: ${jobId}`);
      return jobId;
    }

    logError('No job_id in response');
    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        logError(`Error: ${axiosError.response.status} ${axiosError.response.statusText}`);
        logError(`Response: ${JSON.stringify(axiosError.response.data, null, 2)}`);
      } else {
        logError(`Error: ${axiosError.message}`);
      }
    } else {
      logError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  }
}

/**
 * Watch research job status and collect data
 */
async function watchResearchJobStatus(jobId: string): Promise<any> {
  log(`\n--- Watching Research Job Status: ${jobId} ---`, 'bright');
  logInfo('Polling job status...');
  logWarning('Press Ctrl+C to stop watching');

  const url = `${API_BASE_URL}/api/research/${jobId}/status`;
  const maxAttempts = 120; // 10 minutes max (5 second intervals)
  const pollInterval = 5000; // 5 seconds
  const startTime = Date.now();

  const collectedData: any = {
    request: null,
    generated_queries: undefined,
    supadata_metadata: [],
    selected_videos: undefined,
    final_summary: undefined,
    processing_stats: undefined,
  };

  let attempts = 0;
  let lastStatus = '';

  while (attempts < maxAttempts) {
    try {
      logDebug(`\n[Attempt ${attempts + 1}/${maxAttempts}] Polling job status...`);
      const response = await axios.get(url);
      const status = response.data;

      // Track status changes
      if (status.status !== lastStatus) {
        logInfo(`Status: ${status.status} (${status.progress || 0}%)`);
        if (status.message) {
          logInfo(`Message: ${status.message}`);
        }
        lastStatus = status.status;
      }

      // Collect generated queries
      if (status.generated_queries && !collectedData.generated_queries) {
        collectedData.generated_queries = status.generated_queries;
        logDebug(`Generated queries: ${JSON.stringify(status.generated_queries, null, 2)}`);
      }

      // Collect selected videos
      if (status.selected_videos && !collectedData.selected_videos) {
        collectedData.selected_videos = status.selected_videos;
        logDebug(`Selected ${status.selected_videos.length} videos`);
      }

      // Collect raw video results from Supadata (before filtering)
      if (status.raw_video_results && collectedData.supadata_metadata.length === 0) {
        collectedData.supadata_metadata = status.raw_video_results;
        logDebug(`Collected ${collectedData.supadata_metadata.length} raw video results from Supadata`);
      }

      // Check if completed
      if (status.status === 'completed') {
        logSuccess(`\nJob completed after ${attempts + 1} attempts (${Math.round((Date.now() - startTime) / 1000)}s)`);

        // Debug: Log what we received
        logDebug(`Completion data keys: ${status.data ? Object.keys(status.data).join(', ') : 'NO DATA'}`);
        if (status.data) {
          logDebug(`final_summary_text exists: ${!!status.data.final_summary_text}`);
          logDebug(`final_summary_text length: ${status.data.final_summary_text?.length || 0}`);
        }

        // Collect final data
        if (status.data) {
          collectedData.generated_queries = status.data.generated_queries || collectedData.generated_queries;
          collectedData.selected_videos = status.data.selected_videos || collectedData.selected_videos;
          collectedData.final_summary = status.data.final_summary_text;
          collectedData.processing_stats = status.data.processing_stats;

          // If we don't have raw video results yet, extract from selected videos
          if (collectedData.supadata_metadata.length === 0 && collectedData.selected_videos) {
            collectedData.supadata_metadata = collectedData.selected_videos.map((video: any) => ({
              video_id: video.video_id,
              title: video.title,
              channel: video.channel,
              thumbnail: video.thumbnail,
              duration_seconds: video.duration_seconds,
              view_count: video.view_count,
              url: video.url,
              classification: video.classification,
              why_selected: video.why_selected,
              fills_gap: video.fills_gap,
            }));
          }
          
          // Also save selected videos separately for clarity
          if (collectedData.selected_videos) {
            collectedData.selected_videos_metadata = collectedData.selected_videos.map((video: any) => ({
              video_id: video.video_id,
              title: video.title,
              channel: video.channel,
              thumbnail: video.thumbnail,
              duration_seconds: video.duration_seconds,
              view_count: video.view_count,
              url: video.url,
              classification: video.classification,
              why_selected: video.why_selected,
              fills_gap: video.fills_gap,
            }));
          }

          logInfo(`Final summary length: ${collectedData.final_summary?.length || 0} characters`);
          logInfo(`Selected videos: ${collectedData.selected_videos?.length || 0}`);
          logInfo(`Generated queries: ${collectedData.generated_queries?.length || 0}`);
        }

        return collectedData;
      }

      // Check if error
      if (status.status === 'error') {
        logError(`\nJob failed: ${status.error || 'Unknown error'}`);
        collectedData.error = status.error;
        return collectedData;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Handle permanent errors (404 - job not found)
        if (axiosError.response?.status === 404) {
          logError('Job not found (404). This is a permanent error.');
          logWarning('Possible reasons:');
          logWarning('  - Server restarted and job was lost');
          logWarning('  - Job expired and was cleaned up');
          logWarning('  - Invalid job ID');
          break;
        }

        // Handle transient errors
        const isTransientError =
          axiosError.code === 'ECONNREFUSED' ||
          axiosError.code === 'ETIMEDOUT' ||
          axiosError.code === 'ENOTFOUND' ||
          axiosError.code === 'ECONNRESET' ||
          (axiosError.response?.status && axiosError.response.status >= 500);

        if (isTransientError) {
          logWarning(`Transient error: ${axiosError.message}. Retrying...`);
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          attempts++;
          continue;
        }

        logError(`Unexpected error: ${axiosError.message}`);
        break;
      } else {
        logError(`Error: ${error instanceof Error ? error.message : String(error)}`);
        break;
      }
    }
  }

  if (attempts >= maxAttempts) {
    logWarning(`\nReached maximum polling attempts (${maxAttempts}) after ${Math.round((Date.now() - startTime) / 1000)}s`);
  }

  return collectedData;
}

/**
 * Main test function
 */
async function testResearchService() {
  log('\n=== Research Service Test Tool ===', 'bright');
  log(`API Base URL: ${API_BASE_URL}`, 'cyan');

  try {
    // Test connection
    logInfo('Testing connection to API...');
    const isHealthy = await testHealthCheck();
    if (!isHealthy) {
      logError(`Cannot connect to API at ${API_BASE_URL}`);
      logWarning('Make sure the server is running (npm run dev)');
      process.exit(1);
    }

    // Get research query
    log('\n--- Research Query Input ---', 'bright');
    logInfo('Enter a research query to test the service');
    logInfo('Example: "impact of AI on healthcare in 2024"');
    const researchQuery = await question('\nResearch query: ');

    if (!researchQuery.trim()) {
      logWarning('No query provided, using example query');
      const exampleQuery = 'impact of AI on healthcare in 2024';
      logInfo(`Using: "${exampleQuery}"`);
      return await runTest(exampleQuery);
    }

    // Get language
    logInfo('\nSupported languages: English, Spanish, French, German, Chinese (Simplified), etc.');
    const language = (await question('Language [English]: ')) || 'English';

    return await runTest(researchQuery.trim(), language);
  } catch (error) {
    logError(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      logDebug(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Run the test
 */
async function runTest(researchQuery: string, language: string = 'English') {
  try {
    // Create research job
    const jobId = await createResearchJob(researchQuery, language);
    if (!jobId) {
      logError('Failed to create research job');
      process.exit(1);
    }

    // Store request data
    const requestData = {
      research_query: researchQuery,
      language: language,
    };

    // Watch job status and collect data
    const collectedData = await watchResearchJobStatus(jobId);
    collectedData.request = requestData;

    // Save test data
    log('\n--- Saving Test Data ---', 'bright');
    const savedPath = await saveTestData(jobId, collectedData);

    // Summary
    log('\n--- Test Summary ---', 'bright');
    logSuccess(`Job ID: ${jobId}`);
    logSuccess(`Research Query: ${researchQuery}`);
    logSuccess(`Language: ${language}`);
    logSuccess(`Status: completed`);
    logSuccess(`Test data saved: ${savedPath}`);

    if (collectedData.generated_queries) {
      logInfo(`Generated queries: ${collectedData.generated_queries.length}`);
      collectedData.generated_queries.forEach((q: string, i: number) => {
        logDebug(`  ${i + 1}. ${q}`);
      });
    }
    if (collectedData.supadata_metadata) {
      logInfo(`Supadata raw results: ${collectedData.supadata_metadata.length} videos`);
    }
    if (collectedData.selected_videos) {
      logInfo(`Selected videos: ${collectedData.selected_videos.length}`);
      collectedData.selected_videos.forEach((v: any, i: number) => {
        logDebug(`  ${i + 1}. ${v.title} (${v.classification}) - ${v.channel}`);
      });
    }
    if (collectedData.final_summary) {
      logInfo(`Final summary: ${collectedData.final_summary.length} characters`);
      logDebug(`Summary preview: ${collectedData.final_summary.substring(0, 200)}...`);
    }
    if (collectedData.processing_stats) {
      logInfo(`Processing stats:`);
      logDebug(JSON.stringify(collectedData.processing_stats, null, 2));
    }

    log('\n✅ Test completed successfully!', 'green');
  } catch (error) {
    logError(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      logDebug(error.stack);
    }
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\nExiting...', 'yellow');
  rl.close();
  process.exit(0);
});

// Run the test
testResearchService().then(() => {
  rl.close();
  process.exit(0);
}).catch((error) => {
  logError(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  rl.close();
  process.exit(1);
});
