import axios, { AxiosError } from 'axios';
import { Readable } from 'stream';
import { createInterface } from 'readline';
import env from '../config/env';
import logger from '../utils/logger';
import { getAIModelsConfig, getLimitsConfig, getAPIConfig, getAISettingsConfig, getSummaryConfig } from '../config';
import { getTitleGenerationSystemPrompt, getTitleGenerationUserPrompt } from '../prompts';

/**
 * Qwen model types
 */
export type QwenModel = 'qwen-flash' | 'qwen-plus' | 'qwen-max';

/**
 * AI response structure
 */
export interface AIResponse {
  content: string;
  tokens_used?: number;
  model: string;
}

/**
 * AI error structure
 */
export interface AIError {
  error: string;
  error_code: string;
  model: string;
}

export type AIResult = AIResponse | AIError;

/**
 * DashScope Compatible Mode API request structure (OpenAI-compatible)
 */
interface DashScopeRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  enable_search?: boolean;
  incremental_output?: boolean;
  // Deep thinking parameters (via extra_body for OpenAI SDK, but direct for HTTP calls)
  enable_thinking?: boolean;
  thinking_budget?: number;
}

/**
 * DashScope Compatible Mode API response structure (OpenAI-compatible)
 */
interface DashScopeSuccessResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    total_tokens: number;
  };
  id?: string;
}

interface DashScopeErrorResponse {
  error?: {
    code?: string;
    type?: string;
    message: string;
  };
  code?: string;
  message?: string;
  request_id?: string;
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    // Retry on network errors, timeouts, or 5xx errors
    return (
      !axiosError.response ||
      axiosError.response.status >= 500 ||
      axiosError.code === 'ECONNABORTED' ||
      axiosError.code === 'ETIMEDOUT' ||
      axiosError.response.status === 429 // Rate limit
    );
  }
  return false;
}

/**
 * Estimate token count from text
 * @param text Text to estimate
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  const aiSettings = getAISettingsConfig();
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount * aiSettings.token_estimation_ratio);
}

/**
 * DashScope SSE stream chunk structure
 */
interface DashScopeStreamChunk {
  output?: {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
    usage?: {
      total_tokens?: number;
    };
  };
  choices?: Array<{
    delta?: {
      content?: string;
    };
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    total_tokens?: number;
  };
  request_id?: string;
  code?: string;
  message?: string;
}

/**
 * Parse DashScope SSE stream and extract content chunks
 * @param stream Node.js ReadableStream from DashScope API
 * @param onChunk Callback for each content chunk
 * @returns Accumulated content and token usage
 */
async function parseDashScopeStream(
  stream: NodeJS.ReadableStream,
  onChunk?: (chunk: string) => void
): Promise<{ content: string; tokens_used?: number }> {
  const readline = createInterface({
    input: stream as Readable,
    crlfDelay: Infinity, // Handle both \n and \r\n line endings
  });

  let accumulatedContent = '';
  let previousContent = '';
  let tokensUsed: number | undefined;
  let chunkCount = 0;

  try {
    for await (const line of readline) {
      // Skip empty lines
      if (!line.trim()) {
        continue;
      }

      // Check for [DONE] marker
      if (line.trim() === '[DONE]') {
        logger.debug('[DashScope Stream] Received [DONE] marker');
        break;
      }

      // Parse SSE format: "data: {...}"
      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6).trim();
        
        // Skip empty data lines
        if (!jsonStr || jsonStr === '[DONE]') {
          continue;
        }

        try {
          const chunk: DashScopeStreamChunk = JSON.parse(jsonStr);

          // Handle error chunks
          if (chunk.code || chunk.message) {
            const errorMessage = chunk.message || 'Unknown error';
            const errorCode = chunk.code || 'STREAM_ERROR';
            logger.error('[DashScope Stream] Error chunk received', {
              code: errorCode,
              message: errorMessage,
            });
            throw new Error(`Stream error: ${errorMessage} (code: ${errorCode})`);
          }

          // Extract content from DashScope format: output.choices[0].message.content
          let contentDelta = '';
          if (chunk.output?.choices?.[0]?.message?.content) {
            const fullContent = chunk.output.choices[0].message.content;
            // If DashScope sends full content each time, extract only the new portion
            if (fullContent.startsWith(previousContent)) {
              contentDelta = fullContent.substring(previousContent.length);
              previousContent = fullContent;
            } else {
              // If it's incremental delta or content doesn't start with previous, use it directly
              // This handles cases where content is reset or format changes
              contentDelta = fullContent;
              previousContent = fullContent;
            }
          }
          // Also check OpenAI-compatible format: choices[0].delta.content (incremental)
          else if (chunk.choices?.[0]?.delta?.content) {
            contentDelta = chunk.choices[0].delta.content;
            // For delta format, update previousContent to track accumulated content
            previousContent = accumulatedContent + contentDelta;
          }
          // Fallback: check choices[0].message.content (full content)
          else if (chunk.choices?.[0]?.message?.content) {
            const fullContent = chunk.choices[0].message.content;
            if (fullContent.startsWith(previousContent)) {
              contentDelta = fullContent.substring(previousContent.length);
              previousContent = fullContent;
            } else {
              // Content doesn't start with previous - might be a reset or new stream
              contentDelta = fullContent;
              previousContent = fullContent;
            }
          }

          // Only process non-empty content deltas
          if (contentDelta) {
            accumulatedContent += contentDelta;
            chunkCount++;

            // Call onChunk callback if provided
            if (onChunk) {
              try {
                onChunk(contentDelta);
              } catch (callbackError) {
                logger.warn('[DashScope Stream] Error in onChunk callback', {
                  error: callbackError instanceof Error ? callbackError.message : String(callbackError),
                });
                // Continue processing even if callback fails
              }
            }
          }

          // Extract token usage from stream metadata
          if (chunk.usage?.total_tokens) {
            tokensUsed = chunk.usage.total_tokens;
          }
          // Also check output.usage format
          if (chunk.output?.usage?.total_tokens) {
            tokensUsed = chunk.output.usage.total_tokens;
          }

        } catch (parseError) {
          // Log parse errors but continue processing
          logger.warn('[DashScope Stream] Failed to parse chunk', {
            line: line.substring(0, 200), // Log first 200 chars
            error: parseError instanceof Error ? parseError.message : String(parseError),
            stack: parseError instanceof Error ? parseError.stack : undefined,
            accumulatedContentLength: accumulatedContent.length,
            chunkCount,
          });
          // Continue processing - don't break the stream on parse errors
        }
      }
    }

    logger.info('[DashScope Stream] Stream parsing completed', {
      chunksProcessed: chunkCount,
      contentLength: accumulatedContent.length,
      tokensUsed: tokensUsed || 'N/A',
    });

    return {
      content: accumulatedContent,
      tokens_used: tokensUsed,
    };
  } catch (error) {
    logger.error('[DashScope Stream] Stream parsing error', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      accumulatedContentLength: accumulatedContent.length,
      chunksProcessed: chunkCount,
      tokensUsed: tokensUsed || 'N/A',
    });
    throw error;
  } finally {
    // Ensure readline interface is properly closed
    try {
      readline.close();
    } catch (closeError) {
      logger.warn('[DashScope Stream] Error closing readline interface', {
        error: closeError instanceof Error ? closeError.message : String(closeError),
      });
    }
  }
}

/**
 * Call Qwen Flash model for pre-condensing long videos
 * @param prompt System prompt for condensing
 * @param transcript Transcript text to condense
 * @returns Condensed text or error
 */
export async function callQwenFlash(
  prompt: string,
  transcript: string
): Promise<AIResult> {
  const model = getAIModelsConfig().pre_condense as QwenModel;
  const aiSettings = getAISettingsConfig();
  // Combine prompt and transcript into single message
  const combinedPrompt = `${prompt}\n\n${transcript}`;
  return callQwen(model, combinedPrompt, {
    temperature: aiSettings.temperature,
    max_tokens: aiSettings.max_tokens_default,
  });
}

/**
 * Call Qwen API with streaming enabled
 * @param model Model to use
 * @param combinedPrompt Combined prompt with instructions and content (sent as single user message)
 * @param parameters API parameters
 * @param onChunk Callback for streaming chunks
 * @param retryCount Current retry attempt
 * @returns Final AI result
 */
async function callQwenStream(
  model: QwenModel,
  combinedPrompt: string,
  parameters: {
    temperature?: number;
    max_tokens?: number;
    enable_search?: boolean;
    enable_thinking?: boolean;
    thinking_budget?: number;
  },
  onChunk?: (chunk: string) => void,
  retryCount = 0
): Promise<AIResult> {
  const apiConfigs = getAPIConfig();
  const apiConfig = apiConfigs.dashscope;
  const apiKey = env.DASHSCOPE_BEIJING_API_KEY;
  const endpointName = 'Beijing';
  const aiSettings = getAISettingsConfig();
  const maxRetries = apiConfig.max_retries;
  const timeout = apiConfig.timeout_ms;
  const apiUrl = apiConfig.base_url;

  logger.info('[DashScope Stream] Starting streaming request', {
    model,
    endpoint: endpointName,
    url: apiUrl,
    timeoutMs: timeout,
    retryCount,
  });

  try {
    const requestBody: DashScopeRequest = {
      model,
      messages: [
        {
          role: 'user',
          content: combinedPrompt,
        },
      ],
      temperature: parameters.temperature ?? aiSettings.temperature,
      top_p: aiSettings.top_p, // Nucleus sampling parameter
      // Only include max_tokens if explicitly provided (don't use default to avoid API rejection)
      ...(parameters.max_tokens !== undefined && { max_tokens: parameters.max_tokens }),
      stream: true, // Always true for streaming function
      // Enable incremental output for better streaming (Qwen-specific parameter)
      ...(aiSettings.enable_thinking && { incremental_output: true }),
      // Optional: enable search (for search term generation)
      ...(parameters.enable_search !== undefined && { enable_search: parameters.enable_search }),
      // Optional: enable thinking mode (deep reasoning)
      ...(parameters.enable_thinking !== undefined && { enable_thinking: parameters.enable_thinking }),
      // Optional: thinking budget (max tokens for thinking process)
      ...(parameters.thinking_budget !== undefined && { thinking_budget: parameters.thinking_budget }),
    };

    const requestStartTime = Date.now();
    let response;
    
    try {
      response = await axios.post<NodeJS.ReadableStream>(
        apiUrl,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout,
          responseType: 'stream',
        }
      );

      const requestDuration = Date.now() - requestStartTime;
      logger.info('[DashScope Stream] Stream response received', {
        model,
        endpoint: endpointName,
        httpStatus: response.status,
        durationMs: requestDuration,
      });

      // Parse the stream
      const streamResult = await parseDashScopeStream(
        response.data as NodeJS.ReadableStream,
        onChunk
      );

      if (!streamResult.content) {
        logger.error('[DashScope Stream] Empty content from stream', { model });
        return {
          error: 'Empty response from AI service',
          error_code: 'EMPTY_RESPONSE',
          model,
        };
      }

      logger.debug('[DashScope Stream] Stream parsing completed successfully', {
        model,
        contentLength: streamResult.content.length,
        tokensUsed: streamResult.tokens_used,
      });

      return {
        content: streamResult.content,
        tokens_used: streamResult.tokens_used,
        model,
      };
    } catch (requestError) {
      const requestDuration = Date.now() - requestStartTime;
      
      if (axios.isAxiosError(requestError)) {
        const axiosError = requestError as AxiosError;
        
        // Handle retryable errors
        if (isRetryableError(requestError) && retryCount < maxRetries) {
          logger.warn(
            `[DashScope Stream] Retryable error, retrying (${retryCount + 1}/${maxRetries}): ${model}`,
            {
              error: {
                code: axiosError.code,
                message: axiosError.message,
                status: axiosError.response?.status,
              },
            }
          );
          await sleep(apiConfig.retry_backoff_ms * (retryCount + 1));
          return callQwenStream(
            model,
            combinedPrompt,
            parameters,
            onChunk,
            retryCount + 1
          );
        }

        // Handle specific error types
        if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
          logger.error('[DashScope Stream] Timeout error', {
            model,
            code: axiosError.code,
            timeout,
            durationMs: requestDuration,
          });
          return {
            error: `AI service timeout on ${endpointName} endpoint. Please try again.`,
            error_code: 'TIMEOUT',
            model,
          };
        }

        if (axiosError.response?.status === 401) {
          logger.error('[DashScope Stream] Authentication failed', { model });
          return {
            error: 'AI service authentication failed. Please check API key.',
            error_code: 'AUTH_ERROR',
            model,
          };
        }

        if (axiosError.response?.status === 429) {
          logger.error('[DashScope Stream] Rate limit error', { model });
          return {
            error: `AI service rate limit exceeded on ${endpointName} endpoint. Please try again later.`,
            error_code: 'RATE_LIMIT',
            model,
          };
        }
      }

      // Handle stream parsing errors
      if (requestError instanceof Error) {
        logger.error('[DashScope Stream] Stream parsing error', {
          model,
          error: requestError.message,
          stack: requestError.stack,
        });
        return {
          error: `Stream parsing failed: ${requestError.message}`,
          error_code: 'STREAM_PARSE_ERROR',
          model,
        };
      }

      logger.error('[DashScope Stream] Unknown error', {
        model,
        error: requestError,
      });
      return {
        error: 'AI service error. Please try again.',
        error_code: 'NETWORK_ERROR',
        model,
      };
    }
  } catch (error) {
    logger.error('[DashScope Stream] Unexpected error', {
      model,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });
    return {
      error: 'AI service error. Please try again.',
      error_code: 'UNKNOWN_ERROR',
      model,
    };
  }
}

/**
 * Call Qwen Plus model for final summary generation
 * @param combinedPrompt Combined prompt with instructions and transcript content
 * @param onChunk Optional callback for streaming chunks
 * @param options Optional parameters for specific use cases (e.g., search term generation)
 * @returns Summary text or error
 */
export async function callQwenPlus(
  combinedPrompt: string,
  onChunk?: (chunk: string) => void,
  options?: {
    enable_search?: boolean;
    enable_thinking?: boolean;
    thinking_budget?: number;
  }
): Promise<AIResult> {
  const model = getAIModelsConfig().default_summary as QwenModel;
  const aiSettings = getAISettingsConfig();
  
  // Don't set max_tokens - let the API use model's default maximum
  // Setting it too high (like 200000) causes API to reject or return empty responses
  // The model will use its native maximum output limit

  return callQwen(model, combinedPrompt, {
    temperature: aiSettings.temperature,
    // max_tokens omitted - let API use model default
    // Pass through optional parameters
    enable_search: options?.enable_search,
    enable_thinking: options?.enable_thinking,
    thinking_budget: options?.thinking_budget,
  }, 0, onChunk);
}

/**
 * Call Qwen Max model for premium users
 * @param combinedPrompt Combined prompt with instructions and transcript content
 * @param onChunk Optional callback for streaming chunks
 * @returns Summary text or error
 */
export async function callQwenMax(
  combinedPrompt: string,
  onChunk?: (chunk: string) => void
): Promise<AIResult> {
  const model = getAIModelsConfig().premium_summary as QwenModel;
  const aiSettings = getAISettingsConfig();
  
  // Don't set max_tokens - let the API use model's default maximum
  // Setting it too high (like 200000) causes API to reject or return empty responses
  // The model will use its native maximum output limit

  return callQwen(model, combinedPrompt, {
    temperature: aiSettings.temperature,
    // max_tokens omitted - let API use model default
  }, 0, onChunk);
}

/**
 * Generic Qwen API call
 * @param model Model to use
 * @param combinedPrompt Combined prompt with instructions and content (sent as single user message)
 * @param parameters Additional parameters
 * @param retryCount Current retry attempt
 * @param onChunk Optional callback for streaming chunks
 * @returns AI response or error
 */
async function callQwen(
  model: QwenModel,
  combinedPrompt: string,
  parameters: {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    enable_search?: boolean;
    enable_thinking?: boolean;
    thinking_budget?: number;
  } = {},
  retryCount = 0,
  onChunk?: (chunk: string) => void
): Promise<AIResult> {
  // Get API config and key
  const apiConfigs = getAPIConfig();
  const apiConfig = apiConfigs.dashscope;
  const apiKey = env.DASHSCOPE_BEIJING_API_KEY;
  const endpointName = 'Beijing';
  
  const aiSettings = getAISettingsConfig();
  const maxRetries = apiConfig.max_retries;
  const timeout = apiConfig.timeout_ms;
  const apiUrl = apiConfig.base_url;
  
  // Check if streaming is enabled
  const shouldStream = parameters.stream ?? aiSettings.stream;
  
  // Route to streaming function if streaming is enabled
  if (shouldStream) {
    logger.info('[DashScope API] Routing to streaming handler', { model });
    return callQwenStream(
      model,
      combinedPrompt,
      {
        temperature: parameters.temperature,
        max_tokens: parameters.max_tokens,
        enable_search: parameters.enable_search,
        enable_thinking: parameters.enable_thinking,
        thinking_budget: parameters.thinking_budget,
      },
      onChunk,
      retryCount
    );
  }
  
  // Continue with non-streaming handler
  const apiKeyStatus = {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    prefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A',
    suffix: apiKey && apiKey.length > 8 ? `...${apiKey.substring(apiKey.length - 4)}` : 'N/A',
    hasWhitespace: apiKey ? /\s/.test(apiKey) : false,
  };
  
  // CRITICAL: Log which endpoint we're using - MUST be visible
  logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  logger.info(`[DashScope API] 🌐 USING ENDPOINT: ${endpointName.toUpperCase()}`, {
    model,
    endpoint: endpointName,
    apiUrl: apiConfig.base_url,
    timeout,
    retryCount,
    maxRetries,
    apiKeyExists: !!apiKey,
    apiKeyStatus,
    requestSize: {
      combinedPromptLength: combinedPrompt.length,
      totalLength: combinedPrompt.length,
    },
    streaming: false,
  });
  logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  try {
    const requestBody: DashScopeRequest = {
      model,
      messages: [
        {
          role: 'user',
          content: combinedPrompt,
        },
      ],
      temperature: parameters.temperature ?? aiSettings.temperature,
      top_p: aiSettings.top_p, // Nucleus sampling parameter
      // Only include max_tokens if explicitly provided (don't use default to avoid API rejection)
      ...(parameters.max_tokens !== undefined && { max_tokens: parameters.max_tokens }),
      stream: false, // Non-streaming mode
      // Enable incremental output for better responses (Qwen-specific parameter)
      ...(aiSettings.enable_thinking && { incremental_output: true }),
      // Optional: enable search (for search term generation)
      ...(parameters.enable_search !== undefined && { enable_search: parameters.enable_search }),
      // Optional: enable thinking mode (deep reasoning)
      ...(parameters.enable_thinking !== undefined && { enable_thinking: parameters.enable_thinking }),
      // Optional: thinking budget (max tokens for thinking process)
      ...(parameters.thinking_budget !== undefined && { thinking_budget: parameters.thinking_budget }),
    };

    logger.info(`[DashScope API] Sending request to AI service - ${endpointName} Endpoint`, {
      model,
      endpoint: endpointName,
      url: apiUrl,
      timeoutMs: timeout,
      requestBody: {
        model: requestBody.model,
        temperature: requestBody.temperature,
        top_p: requestBody.top_p,
        max_tokens: requestBody.max_tokens,
        stream: requestBody.stream,
        incremental_output: requestBody.incremental_output,
        enable_search: requestBody.enable_search,
        enable_thinking: requestBody.enable_thinking,
        thinking_budget: requestBody.thinking_budget,
        messages: [
          {
            role: 'user',
            contentLength: requestBody.messages[0].content.length,
            contentPreview: requestBody.messages[0].content.substring(0, 200) + 
              (requestBody.messages[0].content.length > 200 ? '...' : ''),
          },
        ],
        totalMessageLength: requestBody.messages[0].content.length,
        estimatedTokens: estimateTokens(combinedPrompt),
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyStatus.prefix}${apiKeyStatus.suffix}`,
      },
      retryAttempt: retryCount + 1,
      maxRetries: maxRetries + 1,
    });

    const requestStartTime = Date.now();
    logger.info(`[DashScope API] ⚡ ATTEMPTING TO SEND REQUEST - ${endpointName} Endpoint`, {
      model,
      endpoint: endpointName,
      url: apiUrl,
      timeoutMs: timeout,
      retryAttempt: retryCount + 1,
      timestamp: new Date().toISOString(),
    });

    let response;
    try {
      response = await axios.post<DashScopeSuccessResponse | DashScopeErrorResponse | string>(
        apiUrl,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout,
        }
      );
      
      const requestDuration = Date.now() - requestStartTime;
      // CRITICAL: Log success with endpoint clearly visible
      logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      logger.info(`[DashScope API] ✅ REQUEST SUCCEEDED - ${endpointName.toUpperCase()} Endpoint`, {
        model,
        endpoint: endpointName,
        httpStatus: response.status,
        httpStatusText: response.statusText,
        durationMs: requestDuration,
        durationSeconds: (requestDuration / 1000).toFixed(2),
        connectionEstablished: true,
        requestSent: true,
        responseReceived: true,
      });
      logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    } catch (requestError) {
      const requestDuration = Date.now() - requestStartTime;
      const exceededTimeout = requestDuration >= timeout;
      
      // IMMEDIATELY log what happened in human-readable format
      if (axios.isAxiosError(requestError)) {
        const axiosErr = requestError as AxiosError;
        const gotHttpResponse = !!axiosErr.response;
        const connectionEstablished = gotHttpResponse || axiosErr.code !== 'ENOTFOUND' && axiosErr.code !== 'ECONNREFUSED';
        
        logger.error(`[DashScope API] ❌ REQUEST FAILED - Detailed Analysis - ${endpointName} Endpoint`, {
          model,
          endpoint: endpointName,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [1]': 'NETWORK DIAGNOSTICS',
          connectionEstablished: gotHttpResponse ? 'YES (got HTTP response)' : connectionEstablished ? 'UNKNOWN (no HTTP response)' : 'NO (connection failed)',
          requestSent: gotHttpResponse || axiosErr.code !== 'ENOTFOUND' && axiosErr.code !== 'ECONNREFUSED' ? 'YES' : 'UNKNOWN',
          httpResponseReceived: gotHttpResponse ? `YES (HTTP ${axiosErr.response?.status})` : 'NO',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [2]': 'ERROR DETAILS',
          errorCode: axiosErr.code || 'NO_CODE',
          errorMessage: axiosErr.message,
          errorType: gotHttpResponse ? 'HTTP_ERROR' : axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'NETWORK_ERROR',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [3]': 'TIMING',
          durationMs: requestDuration,
          durationSeconds: (requestDuration / 1000).toFixed(2),
          timeoutMs: timeout,
          exceededTimeout: exceededTimeout,
          timeoutStatus: exceededTimeout ? 'TIMEOUT EXCEEDED' : 'Within timeout',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [4]': 'HTTP RESPONSE (if any)',
          httpStatus: axiosErr.response?.status || 'N/A (no HTTP response)',
          httpStatusText: axiosErr.response?.statusText || 'N/A',
          httpHeaders: axiosErr.response?.headers || 'N/A',
          httpBody: axiosErr.response?.data || 'N/A',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [5]': 'REQUEST DETAILS',
          requestUrl: axiosErr.config?.url || apiUrl,
          requestMethod: axiosErr.config?.method?.toUpperCase() || 'POST',
          requestHeaders: axiosErr.config?.headers ? {
            'Content-Type': axiosErr.config.headers['Content-Type'],
            'Authorization': 'Bearer ***REDACTED***',
          } : 'N/A',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [6]': 'FULL ERROR OBJECT',
          fullError: {
            name: axiosErr.name,
            message: axiosErr.message,
            code: axiosErr.code,
            stack: axiosErr.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
          },
        });
      } else {
        logger.error(`[DashScope API] ❌ REQUEST FAILED - Non-Axios Error`, {
          model,
          errorType: requestError instanceof Error ? requestError.constructor.name : typeof requestError,
          errorMessage: requestError instanceof Error ? requestError.message : String(requestError),
          durationMs: requestDuration,
          exceededTimeout,
        });
      }
      
      throw requestError;
    }

    logger.info(`[DashScope API] Received response from AI service`, {
      model,
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      responseType: response.headers['content-type'],
      isStreamingResponse: typeof response.data === 'string',
      dataType: typeof response.data,
      ...(response.data && typeof response.data === 'object' && 'error' in response.data ? {
        errorInResponse: true,
        errorData: response.data.error,
      } : {
        successResponse: true,
        hasContent: typeof response.data === 'object' ? !!(response.data as DashScopeSuccessResponse)?.choices?.[0]?.message?.content : false,
        choicesCount: typeof response.data === 'object' && (response.data as DashScopeSuccessResponse)?.choices ? (response.data as DashScopeSuccessResponse).choices.length : 0,
      }),
    });

    // Check if response is an error (OpenAI-compatible error format)
    // Only check for 'error' property if response.data is an object (not a string stream)
    if (typeof response.data === 'object' && response.data && 'error' in response.data && response.data.error) {
      const errorData = response.data.error as { code?: string; message: string; type?: string };
      
      // Extract error code once for reuse
      const errorCode = errorData.code || errorData.type || 'UNKNOWN_ERROR';
      
      logger.error(`[DashScope API] Error response received`, {
        model,
        errorCode: errorData.code,
        errorType: errorData.type,
        errorMessage: errorData.message,
        fullError: errorData,
        responseStatus: response.status,
        responseHeaders: response.headers,
        retryCount,
        maxRetries,
      });
      
      // Don't retry for invalid prompts or context window exceeded
      if (
        errorCode === 'invalid_request_error' ||
        errorCode === 'context_length_exceeded' ||
        errorCode === 'InvalidParameter' ||
        errorCode === 'ContextLengthExceeded'
      ) {
        logger.error(`[DashScope API] Non-retryable error: ${model}`, {
          error: errorData,
        });
        return {
          error: errorData.message || 'AI service error',
          error_code: errorCode,
          model,
        };
      }

      // Retry for timeouts or rate limits if we haven't exceeded max retries
      if (retryCount < maxRetries && isRetryableError(response)) {
        logger.warn(
          `[DashScope API] Retryable error, retrying (${retryCount + 1}/${maxRetries}): ${model}`,
          { error: errorData }
        );
        // Exponential backoff: base delay * (retryCount + 1)
        await sleep(apiConfig.retry_backoff_ms * (retryCount + 1));
        return callQwen(model, combinedPrompt, parameters, retryCount + 1, onChunk);
      }

      logger.error(`[DashScope API] Error after all retries exhausted: ${model} - ${endpointName}`, {
        error: errorData,
        retryCount,
        maxRetries,
      });
      return {
        error: errorData.message || 'AI service error',
        error_code: errorCode,
        model,
      };
    }

    // Success response - non-streaming mode (OpenAI-compatible JSON format)
    // Validate response structure before accessing
    if (!response.data || typeof response.data !== 'object') {
      logger.error(`[DashScope API] Invalid response data type: ${model}`, {
        dataType: typeof response.data,
        hasData: !!response.data,
      });
      return {
        error: 'Invalid response format from AI service',
        error_code: 'INVALID_RESPONSE',
        model,
      };
    }

    const data = response.data as DashScopeSuccessResponse;
    
    // Validate choices array exists and has content
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      logger.error(`[DashScope API] No choices in response: ${model}`, {
        hasChoices: !!data.choices,
        choicesType: Array.isArray(data.choices),
        choicesLength: Array.isArray(data.choices) ? data.choices.length : 0,
      });
      return {
        error: 'No choices in AI service response',
        error_code: 'NO_CHOICES',
        model,
      };
    }

    const content = data.choices[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens;

    if (!content) {
      logger.error(`[DashScope API] Empty content in response: ${model}`, {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        hasMessage: !!data.choices[0]?.message,
        hasContent: !!data.choices[0]?.message?.content,
        messageObject: data.choices[0]?.message ? JSON.stringify(data.choices[0].message).substring(0, 200) : 'N/A',
        fullResponseStructure: JSON.stringify(data).substring(0, 500), // Log response structure for debugging
      });
      return {
        error: 'Empty response from AI service',
        error_code: 'EMPTY_RESPONSE',
        model,
      };
    }

    logger.debug(`Successfully called AI API: ${model}`, {
      tokens_used: tokensUsed,
      content_length: content.length,
    });

    return {
      content,
      tokens_used: tokensUsed,
      model,
    };
  } catch (error) {
    // This catch block handles errors from the axios.post() call above
    // The detailed logging is already done in the inner try-catch, so this just handles final retry logic
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<DashScopeErrorResponse>;
      const gotHttpResponse = !!axiosError.response;
      
      // Log a summary for retry decisions
      logger.info(`[DashScope API] 📋 Error Summary for Retry Logic`, {
        model,
        retryCount,
        maxRetries,
        hasHttpResponse: gotHttpResponse,
        httpStatus: axiosError.response?.status || 'N/A',
        axiosErrorCode: axiosError.code || 'N/A',
        isRetryable: isRetryableError(error),
        willRetry: isRetryableError(error) && retryCount < maxRetries,
      });

      // Handle 401 authentication errors with extra detail
      if (axiosError.response?.status === 401) {
        const errorResponse = axiosError.response.data;
        logger.error(`[DashScope API] Authentication failed (401)`, {
          model,
          apiKeyStatus,
          errorResponse,
          responseHeaders: axiosError.response.headers,
          requestUrl: axiosError.config?.url,
          requestMethod: axiosError.config?.method,
        });
        
        return {
          error: 'AI service authentication failed. Please check API key.',
          error_code: 'AUTH_ERROR',
          model,
        };
      }

      // Handle network errors, timeouts, etc. (retry same endpoint)
      if (isRetryableError(error) && retryCount < maxRetries) {
        logger.warn(
          `[DashScope API] Retryable network error, retrying (${retryCount + 1}/${maxRetries}): ${model} - ${endpointName}`,
          { 
            error: {
              code: axiosError.code,
              message: axiosError.message,
              status: axiosError.response?.status,
            }
          }
        );
        // Exponential backoff: base delay * (retryCount + 1)
        await sleep(apiConfig.retry_backoff_ms * (retryCount + 1));
        return callQwen(model, combinedPrompt, parameters, retryCount + 1, onChunk);
      }

      // Note: Specific error types (timeout, rate limit) are handled below in the detailed error handler
      // This ensures we get comprehensive diagnostic information and proper retry exhaustion messages
    } else {
      // Non-axios errors
      logger.error(`[DashScope API] Non-axios error: ${model}`, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
    }

    // Determine the most specific error code and message
    let finalErrorCode = 'NETWORK_ERROR';
    let finalErrorMessage = 'AI service error. Please try again.';
    let diagnosticInfo = '';
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<DashScopeErrorResponse>;
      const gotHttpResponse = !!axiosError.response;
      
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        finalErrorCode = 'TIMEOUT';
        finalErrorMessage = `Request timed out after ${timeout}ms. Please try again with a smaller batch or check your connection.`;
        diagnosticInfo = `Timeout exceeded: Request took longer than ${timeout}ms. ${gotHttpResponse ? 'Got HTTP response but it was too slow.' : 'No HTTP response received before timeout.'}`;
      } else if (axiosError.response?.status === 429) {
        finalErrorCode = 'RATE_LIMIT';
        finalErrorMessage = 'AI service rate limit exceeded. Please try again later.';
        diagnosticInfo = `HTTP 429: Rate limit exceeded. Connection successful, request sent, but API rejected due to rate limits.`;
      } else if (axiosError.response?.status === 401) {
        finalErrorCode = 'AUTH_ERROR';
        finalErrorMessage = 'AI service authentication failed. Please check API key configuration.';
        diagnosticInfo = `HTTP 401: Authentication failed. Connection successful, request sent, but API key was rejected.`;
      } else if (axiosError.response?.status) {
        finalErrorCode = `HTTP_${axiosError.response.status}`;
        finalErrorMessage = `AI service returned HTTP ${axiosError.response.status}: ${axiosError.response.statusText || axiosError.message}`;
        diagnosticInfo = `HTTP ${axiosError.response.status}: Connection successful, request sent, got HTTP response with error status.`;
      } else if (axiosError.code === 'ECONNREFUSED') {
        finalErrorCode = 'CONNECTION_REFUSED';
        finalErrorMessage = `Connection refused: Cannot reach ${apiUrl}. Check if the API endpoint is correct.`;
        diagnosticInfo = `Connection refused: Failed to establish connection to server. Request was NOT sent.`;
      } else if (axiosError.code === 'ENOTFOUND') {
        finalErrorCode = 'DNS_ERROR';
        finalErrorMessage = `DNS lookup failed: Cannot resolve hostname. Check your internet connection.`;
        diagnosticInfo = `DNS error: Could not resolve hostname. Request was NOT sent.`;
      } else if (axiosError.code === 'ECONNRESET') {
        finalErrorCode = 'CONNECTION_RESET';
        finalErrorMessage = `Connection reset by server. The connection was established but then dropped.`;
        diagnosticInfo = `Connection reset: Connection was established but server closed it. Request may have been partially sent.`;
      } else if (axiosError.code) {
        finalErrorCode = axiosError.code;
        finalErrorMessage = `Network error (${axiosError.code}): ${axiosError.message}`;
        diagnosticInfo = `Network error code ${axiosError.code}: ${gotHttpResponse ? 'Got HTTP response but with error.' : 'No HTTP response received. Connection status unknown.'}`;
      }
    }

    // Final error - don't retry - Log with clear diagnostic information
    logger.error(`[DashScope API] ❌ FINAL ERROR - All retries exhausted - ${endpointName} Endpoint`, { 
      model,
      endpoint: endpointName,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [7]': 'FINAL ERROR SUMMARY',
      errorCode: finalErrorCode,
      errorMessage: finalErrorMessage,
      diagnosticInfo: diagnosticInfo,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [8]': 'RETRY INFO',
      retryCount,
      maxRetries,
      totalAttempts: retryCount + 1,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [9]': 'REQUEST DETAILS',
      requestSize: {
        combinedPromptLength: combinedPrompt.length,
        totalLength: combinedPrompt.length,
        estimatedTokens: estimateTokens(combinedPrompt),
      },
      timeoutMs: timeout,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [10]': 'AXIOS ERROR DETAILS (if applicable)',
      ...(axios.isAxiosError(error) ? {
        axiosErrorCode: (error as AxiosError).code || 'N/A',
        axiosErrorMessage: (error as AxiosError).message || 'N/A',
        httpStatus: (error as AxiosError).response?.status || 'N/A (no HTTP response)',
        httpStatusText: (error as AxiosError).response?.statusText || 'N/A',
        gotHttpResponse: !!((error as AxiosError).response),
      } : {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      }),
    });

    return {
      error: finalErrorMessage,
      error_code: finalErrorCode,
      model,
    };
  }
}

/**
 * Generate a title using qwen-flash model
 * @param content Transcript text or summary text
 * @param context Optional context (e.g., "transcripts" or "summary")
 * @param language Language to generate title in (e.g., "English", "Spanish", "Chinese")
 * @returns Generated title or null if generation fails
 */
export async function generateTitle(
  content: string,
  context: 'transcripts' | 'summary' = 'summary',
  language: string = 'English'
): Promise<string | null> {
  const titleConfig = getSummaryConfig().title_generation;
  const maxLength = titleConfig.max_length;
  const minLength = titleConfig.min_length;
  const transcriptLimit = titleConfig.transcript_content_limit;
  const temperature = titleConfig.temperature;
  const maxTokens = titleConfig.max_tokens;

  // Use centralized prompts from prompts directory
  const systemPrompt = getTitleGenerationSystemPrompt({
    context,
    maxLength,
    language,
  });

  // Limit content length for transcripts to save tokens
  const contentToUse = context === 'transcripts'
    ? content.substring(0, transcriptLimit)
    : content;

  const userPrompt = getTitleGenerationUserPrompt(context, contentToUse, language);

  try {
    const model = getAIModelsConfig().pre_condense as QwenModel;
    // Combine system prompt and user prompt into single message
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const result = await callQwen(
      model,
      combinedPrompt,
      {
        temperature,
        max_tokens: maxTokens,
        stream: false, // Disable streaming for title generation
      }
    );

    if ('error' in result) {
      logger.warn('[Title Generation] Failed to generate title', { 
        error: result.error,
        context,
      });
      return null;
    }

    // Clean up the title
    let title = result.content.trim();
    title = title.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    title = title.replace(/\n/g, ' '); // Replace newlines with spaces
    title = title.substring(0, maxLength).trim(); // Enforce max length
    
    if (title.length < minLength) {
      logger.warn('[Title Generation] Generated title too short', { 
        title, 
        length: title.length,
        minLength,
      });
      return null;
    }
    
    return title;
  } catch (error) {
    logger.error('[Title Generation] Error generating title', { 
      error,
      context,
    });
    return null;
  }
}

/**
 * Check if aggregated content exceeds context window
 * @param text Aggregated text to check
 * @returns True if exceeds limit
 */
export function exceedsContextWindow(text: string): boolean {
  const limits = getLimitsConfig();
  const aiSettings = getAISettingsConfig();
  const estimatedTokens = estimateTokens(text);
  // Use configured safety margin
  const safeLimit = Math.floor(
    limits.max_context_tokens * aiSettings.context_window_safety_margin
  );
  return estimatedTokens > safeLimit;
}

