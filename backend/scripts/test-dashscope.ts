#!/usr/bin/env ts-node
/**
 * Simple script to test DashScope API connection
 * 
 * Usage: npx ts-node scripts/test-dashscope.ts
 */

import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import { getAPIConfig, getAIModelsConfig } from '../src/config';
import env from '../src/config/env';

// Load environment variables
dotenv.config();

interface Color {
  reset: string;
  bright: string;
  red: string;
  green: string;
  yellow: string;
  cyan: string;
}

const colors: Color = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

// Logging configuration
const LOG_CONFIG = {
  showTimestamps: true,
  showRequestDetails: true,
  showResponseDetails: true,
  showHeaders: false,
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
  log(`🔍 ${message}`, 'cyan');
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
      // Mask sensitive headers
      const safeHeaders = { ...headers };
      if (safeHeaders.Authorization) {
        const auth = safeHeaders.Authorization as string;
        safeHeaders.Authorization = auth.substring(0, 20) + '...' + auth.substring(auth.length - 4);
      }
      console.log(JSON.stringify(safeHeaders, null, 2));
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
      if (axiosError.config.headers) {
        logError(`Request Headers (masked):`);
        const safeHeaders = { ...axiosError.config.headers };
        if (safeHeaders.Authorization) {
          const auth = safeHeaders.Authorization as string;
          safeHeaders.Authorization = auth.substring(0, 20) + '...' + auth.substring(auth.length - 4);
        }
        console.error(JSON.stringify(safeHeaders, null, 2));
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
      logError(`Request details:`);
      console.error(JSON.stringify(axiosError.request, null, 2));
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

async function testDashScopeConnection() {
  log('\n=== Testing DashScope API Connection ===\n', 'bright');

  // Check API key
  logDebug('Checking environment configuration...');
  const apiKey = env.DASHSCOPE_BEIJING_API_KEY;
  if (!apiKey) {
    logError('DASHSCOPE_BEIJING_API_KEY not found in environment variables');
    logWarning('Please set DASHSCOPE_BEIJING_API_KEY in your .env file');
    process.exit(1);
  }

  logInfo(`API Key found: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  logInfo(`API Key length: ${apiKey.length} characters`);

  // Get config
  logDebug('Loading API configuration...');
  const apiConfig = getAPIConfig().dashscope;
  const modelsConfig = getAIModelsConfig();

  logInfo(`Base URL: ${apiConfig.base_url}`);
  logInfo(`Model: ${modelsConfig.pre_condense}`);
  logInfo(`Timeout: ${apiConfig.timeout_ms}ms`);

  // Prepare test request
  const testRequest = {
    model: modelsConfig.pre_condense,
    messages: [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user' as const,
        content: 'Say "Hello, DashScope API connection is working!" in one sentence.',
      },
    ],
    temperature: 0.7,
    max_tokens: 100,
    stream: false,
  };

  log('\n--- Sending Test Request ---', 'bright');
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  logRequest('POST', apiConfig.base_url, testRequest, headers);

  try {
    logInfo('Sending request to DashScope API...');
    const startTime = Date.now();

    const response = await axios.post(
      apiConfig.base_url,
      testRequest,
      {
        headers,
        timeout: apiConfig.timeout_ms,
      }
    );

    const duration = Date.now() - startTime;
    logResponse(response.status, response.statusText, response.data, response.headers, duration);

    logSuccess(`Request successful! (${duration}ms)`);
    logInfo(`Status: ${response.status} ${response.statusText}`);

    // Check response format (OpenAI-compatible)
    if ('choices' in response.data && Array.isArray(response.data.choices)) {
      const content = response.data.choices[0]?.message?.content;
      if (content) {
        logSuccess('\nResponse content:');
        log(`"${content}"`, 'green');
      } else {
        logWarning('Response received but no content found');
        logDebug('Full choices array:');
        console.log(JSON.stringify(response.data.choices, null, 2));
      }

      // Show usage if available
      if ('usage' in response.data && response.data.usage) {
        logInfo('\nToken usage:');
        console.log(JSON.stringify(response.data.usage, null, 2));
      }

      logSuccess('\n✓ DashScope API connection is working correctly!');
      logSuccess('✓ Singapore/International endpoint is configured properly');
      logSuccess('✓ API key is valid');
      return true;
    } 
    // Check DashScope native format
    else if ('output' in response.data && response.data.output?.choices) {
      const content = response.data.output.choices[0]?.message?.content;
      if (content) {
        logSuccess('\nResponse content (native format):');
        log(`"${content}"`, 'green');
      }

      logSuccess('\n✓ DashScope API connection is working (native format)!');
      logSuccess('✓ API key is valid');
      return true;
    } else {
      logWarning('Unexpected response format:');
      logDebug('Response structure:');
      console.log(JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    logErrorDetails(error, 'DashScope API Connection Test');
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response?.status === 401) {
        logError('\nAuthentication failed!');
        logWarning('Please check your DASHSCOPE_BEIJING_API_KEY in .env file');
        logWarning('Make sure the API key is correct and has no extra spaces');
      } else if (axiosError.response?.status === 404) {
        logError('\nEndpoint not found!');
        logWarning('The API endpoint URL might be incorrect');
        logWarning(`Current URL: ${apiConfig.base_url}`);
      } else if (axiosError.response?.status === 400) {
        logError('\nBad request!');
        logWarning('The request format might be incorrect');
        logDebug('Request that failed:');
        console.log(JSON.stringify(testRequest, null, 2));
      }

      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        logWarning('\nRequest timed out');
        logWarning(`Timeout setting: ${apiConfig.timeout_ms}ms`);
        logWarning('Consider increasing timeout or checking network connectivity');
      }
    }

    return false;
  }
}

// Run the test
testDashScopeConnection()
  .then((success) => {
    if (success) {
      log('\n✓ Test completed successfully!', 'green');
      process.exit(0);
    } else {
      log('\n✗ Test failed', 'red');
      process.exit(1);
    }
  })
  .catch((error) => {
    logError(`\nFatal error: ${error}`);
    process.exit(1);
  });

