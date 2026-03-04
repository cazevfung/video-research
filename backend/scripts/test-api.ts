#!/usr/bin/env ts-node
/**
 * Terminal-based API testing script
 * Run this script to manually test API endpoints from the command line
 * 
 * Usage: npm run test:api
 * 
 * HOW TO PROVIDE YOUTUBE URLs:
 * When you select option 3 (Create Summary Job), you have two options:
 * 
 * Option 1 - Comma-separated (single line):
 *   Enter: https://www.youtube.com/watch?v=abc123, https://youtu.be/def456
 * 
 * Option 2 - Interactive mode (one at a time):
 *   Press Enter (leave empty) when asked for URLs
 *   Then enter URLs one by one:
 *     URL 1: https://www.youtube.com/watch?v=abc123
 *     URL 2: https://www.youtube.com/watch?v=def456
 *     URL 3: [Press Enter twice to finish]
 * 
 * Example workflow:
 *   1. Start server: npm run dev (in another terminal)
 *   2. Run test script: npm run test:api
 *   3. Select option 3 (Create Summary Job)
 *   4. Enter YouTube URLs (either comma-separated or one by one)
 *   5. Choose preset style
 *   6. Optionally add custom prompt
 *   7. Choose language
 *   8. Job will be created and you can watch its progress
 */

import axios, { AxiosError } from 'axios';
import readline from 'readline';

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

// Logging configuration
const LOG_CONFIG = {
  showTimestamps: true,
  showRequestDetails: true,
  showResponseDetails: true,
  showHeaders: false, // Set to true for verbose header logging
  persistentOutput: true, // Keep all logs visible (no console.clear)
};

// Get timestamp for logging
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

// Enhanced logging functions with timestamps
function log(message: string, color: keyof Color = 'reset', includeTimestamp: boolean = LOG_CONFIG.showTimestamps) {
  const timestamp = includeTimestamp ? `[${getTimestamp()}] ` : '';
  console.log(`${timestamp}${colors[color]}${message}${colors.reset}`);
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

function logRequest(method: string, url: string, data?: any, headers?: any) {
  logDebug(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  logDebug(`REQUEST: ${method.toUpperCase()} ${url}`);
  if (LOG_CONFIG.showRequestDetails) {
    if (data) {
      logDebug(`Request Body:`);
      console.log(JSON.stringify(data, null, 2));
    }
    if (LOG_CONFIG.showHeaders && headers) {
      logDebug(`Request Headers:`);
      console.log(JSON.stringify(headers, null, 2));
    }
  }
  logDebug(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

function logResponse(status: number, statusText: string, data?: any, headers?: any, duration?: number) {
  const durationStr = duration !== undefined ? ` (${duration}ms)` : '';
  logDebug(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  logDebug(`RESPONSE: ${status} ${statusText}${durationStr}`);
  if (LOG_CONFIG.showResponseDetails) {
    if (data) {
      logDebug(`Response Body:`);
      console.log(JSON.stringify(data, null, 2));
    }
    if (LOG_CONFIG.showHeaders && headers) {
      logDebug(`Response Headers:`);
      console.log(JSON.stringify(headers, null, 2));
    }
  }
  logDebug(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

function logErrorDetails(error: any, context?: string) {
  logError(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  if (context) {
    logError(`ERROR CONTEXT: ${context}`);
  }
  
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    logError(`Error Type: AxiosError`);
    logError(`Error Message: ${axiosError.message}`);
    logError(`Error Code: ${axiosError.code || 'N/A'}`);
    
    if (axiosError.config) {
      logError(`Request URL: ${axiosError.config.method?.toUpperCase()} ${axiosError.config.url}`);
      if (axiosError.config.data) {
        logError(`Request Data:`);
        try {
          const requestData = typeof axiosError.config.data === 'string' 
            ? JSON.parse(axiosError.config.data) 
            : axiosError.config.data;
          console.error(JSON.stringify(requestData, null, 2));
        } catch {
          console.error(axiosError.config.data);
        }
      }
    }
    
    if (axiosError.response) {
      logError(`Response Status: ${axiosError.response.status} ${axiosError.response.statusText}`);
      logError(`Response Headers:`);
      console.error(JSON.stringify(axiosError.response.headers, null, 2));
      logError(`Response Data:`);
      console.error(JSON.stringify(axiosError.response.data, null, 2));
    } else if (axiosError.request) {
      logError(`No response received from server`);
      logError(`Request was made but no response was received`);
    }
  } else if (error instanceof Error) {
    logError(`Error Type: ${error.constructor.name}`);
    logError(`Error Message: ${error.message}`);
    if (error.stack) {
      logError(`Stack Trace:`);
      console.error(error.stack);
    }
  } else {
    logError(`Unknown Error Type`);
    console.error(JSON.stringify(error, null, 2));
  }
  logError(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function testHealthCheck() {
  log('\n--- Testing Health Check Endpoint ---', 'bright');
  const url = `${API_BASE_URL}/health`;
  logRequest('GET', url);
  
  try {
    const startTime = Date.now();
    const response = await axios.get(url);
    const duration = Date.now() - startTime;
    
    logResponse(response.status, response.statusText, response.data, response.headers, duration);
    logSuccess(`Health check: ${response.status} ${response.statusText} (${duration}ms)`);
    return true;
  } catch (error) {
    logErrorDetails(error, 'Health Check Test');
    return false;
  }
}

async function testRootEndpoint() {
  log('\n--- Testing Root Endpoint ---', 'bright');
  const url = `${API_BASE_URL}/`;
  logRequest('GET', url);
  
  try {
    const startTime = Date.now();
    const response = await axios.get(url);
    const duration = Date.now() - startTime;
    
    logResponse(response.status, response.statusText, response.data, response.headers, duration);
    logSuccess(`Root endpoint: ${response.status} ${response.statusText} (${duration}ms)`);
    return true;
  } catch (error) {
    logErrorDetails(error, 'Root Endpoint Test');
    return false;
  }
}

async function testCreateSummary() {
  log('\n--- Testing Create Summary Endpoint ---', 'bright');
  log('\nEnter YouTube video URLs to summarize:', 'cyan');
  log('Examples:', 'yellow');
  log('  Single URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  log('  Multiple URLs (comma-separated):');
  log('    https://www.youtube.com/watch?v=abc123, https://youtu.be/def456');
  log('  Or one per line (press Enter twice to finish):');
  log('    https://www.youtube.com/watch?v=abc123');
  log('    https://www.youtube.com/watch?v=def456');
  log('    [Press Enter twice]\n', 'cyan');
  
  const urlsInput = await question('Enter YouTube URLs (comma-separated, or press Enter for interactive mode): ');
  
  let urls: string[] = [];
  
  if (urlsInput.trim() === '') {
    // Interactive mode: enter URLs one by one
    logInfo('Interactive mode: Enter URLs one at a time (press Enter twice when done)');
    let urlCount = 0;
    while (true) {
      const url = await question(`URL ${urlCount + 1} (or press Enter twice to finish): `);
      if (url.trim() === '' && urlCount > 0) {
        break; // Double Enter to finish
      }
      if (url.trim() !== '') {
        urls.push(url.trim());
        urlCount++;
        logSuccess(`Added URL ${urlCount}`);
      } else if (urlCount === 0) {
        logWarning('Please enter at least one URL');
      }
    }
  } else {
    // Comma-separated mode
    urls = urlsInput.split(',').map((url) => url.trim()).filter(Boolean);
  }

  if (urls.length === 0) {
    logWarning('No URLs provided, using example URL');
    urls.push('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  }

  log(`\n${urls.length} URL(s) to process:`, 'cyan');
  urls.forEach((url, index) => {
    log(`  ${index + 1}. ${url}`, 'yellow');
  });

  log('\nChoose summary style:', 'cyan');
  log('  1. tldr - Ultra-concise summary (~100 words)');
  log('  2. bullet_points - Key points in bullet format (~500 words)');
  log('  3. deep_dive - Comprehensive analysis (~2000 words)');
  log('  4. tutorial - Code-focused guide (~1500 words)');
  log('  5. detailed - Full article-style summary (~3000 words)');
  
  const presetChoice = await question('\nEnter choice (1-5) or preset name [2/bullet_points]: ') || '2';
  
  let preset = 'bullet_points';
  const presetMap: Record<string, string> = {
    '1': 'tldr',
    '2': 'bullet_points',
    '3': 'deep_dive',
    '4': 'tutorial',
    '5': 'detailed',
  };
  
  if (presetMap[presetChoice]) {
    preset = presetMap[presetChoice];
  } else if (['tldr', 'bullet_points', 'deep_dive', 'tutorial', 'detailed'].includes(presetChoice)) {
    preset = presetChoice;
  }
  
  log(`\nSelected preset: ${preset}`, 'green');
  
  log('\nEnter a custom prompt to focus the summary:', 'cyan');
  log('Example: "Focus on frontend React tips and code examples"', 'yellow');
  log('Leave empty for no custom focus\n', 'cyan');
  const customPrompt = await question('Custom prompt (optional, press Enter to skip): ') || undefined;
  
  log('\nSupported languages:', 'cyan');
  log('  English, Spanish, French, German, Chinese (Simplified), Chinese (Traditional),');
  log('  Japanese, Korean, Portuguese, Italian, Russian, Arabic');
  const language = await question('\nEnter language [English]: ') || 'English';

  const requestBody = {
    urls,
    preset,
    language,
    ...(customPrompt && { custom_prompt: customPrompt }),
  };

  logInfo(`Sending request with ${urls.length} URL(s)...`);
  const url = `${API_BASE_URL}/api/summarize`;
  logRequest('POST', url, requestBody);

  try {
    const startTime = Date.now();
    const response = await axios.post(url, requestBody);
    const duration = Date.now() - startTime;
    
    logResponse(response.status, response.statusText, response.data, response.headers, duration);
    logSuccess(`Summary job created: ${response.status} ${response.statusText} (${duration}ms)`);

    if (response.data.job_id) {
      const jobId = response.data.job_id;
      logInfo(`Job ID: ${jobId}`);
      
      const watchStatus = await question('\nWatch job status via SSE? (y/n) [n]: ');
      if (watchStatus.toLowerCase() === 'y') {
        await watchJobStatus(jobId);
      }
    }

    return true;
  } catch (error) {
    logErrorDetails(error, 'Create Summary Test');
    return false;
  }
}

async function watchJobStatus(jobId: string) {
  log(`\n--- Watching Job Status for ${jobId} ---`, 'bright');
  logInfo('Connecting to SSE endpoint...');
  logWarning('Press Ctrl+C to stop watching');

  // Note: SSE requires EventSource or similar. For terminal, we'll poll instead
  logInfo('Polling job status (SSE not available in terminal, using polling)...');
  
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max
  const pollInterval = 5000; // 5 seconds
  const maxTransientErrors = 3; // Max consecutive transient errors before giving up
  const url = `${API_BASE_URL}/api/status/${jobId}`;
  const startTime = Date.now();
  let consecutiveTransientErrors = 0;
  
  logDebug(`Polling URL: ${url}`);
  logDebug(`Poll interval: ${pollInterval}ms`);
  logDebug(`Max attempts: ${maxAttempts}`);
  logDebug(`Max transient errors: ${maxTransientErrors}`);
  
  while (attempts < maxAttempts) {
    try {
      const pollStartTime = Date.now();
      logDebug(`\n[Attempt ${attempts + 1}/${maxAttempts}] Polling job status...`);
      logRequest('GET', url);
      
      const response = await axios.get(url);
      const pollDuration = Date.now() - pollStartTime;
      const status = response.data;
      
      // Reset transient error counter on success
      consecutiveTransientErrors = 0;
      
      // Don't clear console - keep persistent logs
      if (!LOG_CONFIG.persistentOutput) {
        console.clear();
      }
      
      log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      log(`Job Status Update (${attempts + 1}/${maxAttempts}) - Elapsed: ${Math.round((Date.now() - startTime) / 1000)}s`, 'bright');
      logResponse(response.status, response.statusText, status, response.headers, pollDuration);
      
      // Log status details
      if (status.status) {
        logInfo(`Current Status: ${status.status}`);
      }
      if (status.progress !== undefined) {
        logInfo(`Progress: ${status.progress}%`);
      }
      if (status.message) {
        logInfo(`Message: ${status.message}`);
      }
      if (status.error) {
        logError(`Error: ${status.error}`);
      }

      if (status.status === 'completed' || status.status === 'error') {
        logSuccess(`\nJob ${status.status} after ${attempts + 1} attempts (${Math.round((Date.now() - startTime) / 1000)}s)`);
        break;
      }

      logDebug(`Waiting ${pollInterval / 1000}s before next poll...`);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    } catch (error) {
      logErrorDetails(error, `Job Status Poll (Attempt ${attempts + 1})`);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        // Handle permanent errors (404 - job not found)
        if (axiosError.response?.status === 404) {
          logError('Job not found (404). This is a permanent error.');
          logWarning('Possible reasons:');
          logWarning('  - Server restarted and job was lost (jobs are stored in-memory)');
          logWarning('  - Job expired and was cleaned up');
          logWarning('  - Invalid job ID');
          logError('\nStopping polling due to permanent error (404).');
          break;
        }
        
        // Handle transient errors (connection refused, network errors, etc.)
        const isTransientError = 
          axiosError.code === 'ECONNREFUSED' ||
          axiosError.code === 'ETIMEDOUT' ||
          axiosError.code === 'ENOTFOUND' ||
          axiosError.code === 'ECONNRESET' ||
          (axiosError.response?.status && axiosError.response.status >= 500);
        
        if (isTransientError) {
          consecutiveTransientErrors++;
          logWarning(`Transient error detected (${consecutiveTransientErrors}/${maxTransientErrors})`);
          
          if (consecutiveTransientErrors >= maxTransientErrors) {
            logError(`\nToo many consecutive transient errors (${consecutiveTransientErrors}).`);
            logError('Server may be down or unreachable. Stopping polling.');
            break;
          }
          
          logWarning('Retrying after delay (server may be restarting)...');
        } else {
          // Other errors - treat as permanent
          logError('Unexpected error occurred. Stopping polling.');
          break;
        }
      } else {
        // Non-Axios errors - treat as permanent
        logError('Unexpected error type. Stopping polling.');
        break;
      }
      
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    }
  }

  if (attempts >= maxAttempts) {
    logWarning(`\nReached maximum polling attempts (${maxAttempts}) after ${Math.round((Date.now() - startTime) / 1000)}s`);
  }
}

async function testGetHistory() {
  log('\n--- Testing Get History Endpoint ---', 'bright');
  
  const page = await question('Enter page number [1]: ') || '1';
  const limit = await question('Enter limit [20]: ') || '20';
  const params = { page, limit };
  const url = `${API_BASE_URL}/api/history`;
  
  logInfo(`Requesting history with params: page=${page}, limit=${limit}`);
  logRequest('GET', url, params);

  try {
    const startTime = Date.now();
    const response = await axios.get(url, { params });
    const duration = Date.now() - startTime;
    
    logResponse(response.status, response.statusText, response.data, response.headers, duration);
    logSuccess(`History retrieved: ${response.status} ${response.statusText} (${duration}ms)`);
    return true;
  } catch (error) {
    logErrorDetails(error, 'Get History Test');
    return false;
  }
}

async function testGetSummary() {
  log('\n--- Testing Get Summary by ID ---', 'bright');
  
  const summaryId = await question('Enter summary ID: ');
  if (!summaryId) {
    logWarning('No summary ID provided');
    return false;
  }

  const url = `${API_BASE_URL}/api/history/${summaryId}`;
  logInfo(`Requesting summary with ID: ${summaryId}`);
  logRequest('GET', url);

  try {
    const startTime = Date.now();
    const response = await axios.get(url);
    const duration = Date.now() - startTime;
    
    logResponse(response.status, response.statusText, response.data, response.headers, duration);
    logSuccess(`Summary retrieved: ${response.status} ${response.statusText} (${duration}ms)`);
    return true;
  } catch (error) {
    logErrorDetails(error, 'Get Summary Test');
    return false;
  }
}

async function showMenu() {
  if (!LOG_CONFIG.persistentOutput) {
    console.clear();
  }
  log('\n=== YouTube Batch Summary API Test Tool ===', 'bright');
  log(`API Base URL: ${API_BASE_URL}`, 'cyan');
  log(`Logging: Timestamps=${LOG_CONFIG.showTimestamps}, Request Details=${LOG_CONFIG.showRequestDetails}, Persistent=${LOG_CONFIG.persistentOutput}`, 'cyan');
  log('\nSelect a test to run:', 'bright');
  log('1. Health Check');
  log('2. Root Endpoint');
  log('3. Create Summary Job');
  log('4. Get History');
  log('5. Get Summary by ID');
  log('6. Run All Tests');
  log('0. Exit');
}

async function runAllTests() {
  log('\n=== Running All Tests ===', 'bright');
  await testHealthCheck();
  await testRootEndpoint();
  
  log('\nSkipping interactive tests (Create Summary, History)...', 'yellow');
  logInfo('Run individual tests for full functionality');
}

async function main() {
  try {
    // Test connection first
    logInfo('Testing connection to API...');
    logDebug(`API Base URL: ${API_BASE_URL}`);
    const healthUrl = `${API_BASE_URL}/health`;
    logRequest('GET', healthUrl);
    
    try {
      const startTime = Date.now();
      const response = await axios.get(healthUrl);
      const duration = Date.now() - startTime;
      logResponse(response.status, response.statusText, response.data, response.headers, duration);
      logSuccess(`Connected to API (${duration}ms)`);
    } catch (error) {
      logErrorDetails(error, 'Initial Connection Test');
      logError(`Cannot connect to API at ${API_BASE_URL}`);
      logWarning('Make sure the server is running (npm run dev)');
      process.exit(1);
    }

    let running = true;
    while (running) {
      await showMenu();
      const choice = await question('\nEnter your choice: ');

      switch (choice.trim()) {
        case '1':
          await testHealthCheck();
          break;
        case '2':
          await testRootEndpoint();
          break;
        case '3':
          await testCreateSummary();
          break;
        case '4':
          await testGetHistory();
          break;
        case '5':
          await testGetSummary();
          break;
        case '6':
          await runAllTests();
          break;
        case '0':
          running = false;
          break;
        default:
          logWarning('Invalid choice');
      }

      if (running) {
        await question('\nPress Enter to continue...');
      }
    }

    log('\nGoodbye!', 'green');
    rl.close();
  } catch (error) {
    logErrorDetails(error, 'Fatal Error in Main');
    rl.close();
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\nExiting...', 'yellow');
  rl.close();
  process.exit(0);
});

main();

