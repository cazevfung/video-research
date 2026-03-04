import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import env, { DEV_MODE } from './env';
import logger from '../utils/logger';

// Re-export DEV_MODE for convenience
export { DEV_MODE };

/**
 * Configuration interface matching config.yaml structure
 */
export interface LocalStorageConfig {
  data_directory: string; // Base directory for local storage (default: 'data')
  summaries_subdirectory: string; // Subdirectory for summaries (default: 'summaries')
  users_subdirectory: string; // Subdirectory for users (default: 'users')
  research_subdirectory: string; // Subdirectory for research (default: 'research')
}

export interface SystemConfig {
  max_concurrent_jobs: number;
  job_timeout_minutes: number;
  sse_heartbeat_interval_seconds: number;
  job_retention_hours: number;
  graceful_shutdown_timeout_seconds: number;
  session_max_age_hours: number;
  jwt_expiration_hours: number;
  history_pagination_max_limit: number;
  history_pagination_default_limit: number;
  history_research_fallback_title: string;
  dev_mode_credits: number;
  use_local_storage: boolean;
  local_storage?: LocalStorageConfig; // Optional local storage configuration
}

export interface TierConfig {
  daily_request_limit: number;
  max_videos_per_batch: number;
  default_credits: number;
}

export interface FreemiumModelConfig {
  free_tier: TierConfig;
  premium_tier: TierConfig;
}

export interface LimitsConfig {
  long_video_threshold_minutes: number;
  long_video_word_count: number;
  max_context_tokens: number;
  custom_prompt_max_length: number;
  max_batch_size: number;
  url_max_length: number;
  short_video_threshold_minutes: number;
  min_transcript_success_rate: number;
}

export interface AIModelsConfig {
  pre_condense: string;
  default_summary: string;
  premium_summary: string;
}

export interface APIConfig {
  base_url: string;
  timeout_ms: number;
  max_retries: number;
  retry_backoff_ms: number;
}

export interface YouTubeAPIConfig extends APIConfig {
  thumbnail_fallback_pattern: string;
}

export interface APIConfigs {
  supadata: APIConfig;
  dashscope: APIConfig;
  youtube: YouTubeAPIConfig;
}

export interface SearchTermGenerationConfig {
  enable_search: boolean;
  enable_thinking: boolean;
  thinking_budget: number;
}

export interface AISettingsConfig {
  temperature: number;
  top_p: number;
  max_tokens_default: number;
  token_estimation_ratio: number;
  context_window_safety_margin: number;
  stream: boolean;
  enable_thinking: boolean;
  search_term_generation: SearchTermGenerationConfig;
}

export interface ProgressPercentagesConfig {
  validation: number;
  fetching: number;
  processing_start: number;
  processing_per_video: number;
  further_condensing: number;
  aggregating: number;
  generating: number;
  completed: number;
}

export interface SSEStreamingConfig {
  text_chunk_size: number;
  chunk_delay_ms: number;
  streaming_progress_ratio: number;
  chars_per_token_estimate: number; // Estimated characters per token for output length calculation
  progress_cap_ratio: number; // Maximum progress ratio during streaming (0.99 = 99%)
  progress_range_multiplier: number; // Multiplier for streaming progress range (0.93 = use 93% of range)
  generating_message: string; // Status message during streaming
  generating_final_message: string; // Status message for non-streaming generation
  streaming_unavailable_message: string; // Message when falling back to non-streaming
}

export interface TitleGenerationConfig {
  max_length: number;
  min_length: number;
  transcript_content_limit: number;
  temperature: number;
  max_tokens: number;
}

export interface SummaryConfig {
  batch_title_max_length: number;
  default_language: string;
  preset_styles: string[];
  supported_languages: string[];
  title_generation: TitleGenerationConfig;
  progress_percentages: ProgressPercentagesConfig;
  sse_streaming: SSEStreamingConfig;
}

export interface JobCleanupConfig {
  cleanup_interval_hours: number;
  error_job_retention_hours: number;
}

export interface RateLimitingAuthConfig {
  window_minutes: number;
  max_requests: number;
}

export interface RateLimitingGeneralConfig {
  window_minutes: number;
  max_requests: number;
}

export interface RateLimitingSummaryConfig {
  window_hours: number;
}

export interface RateLimitingResearchConfig {
  window_hours: number;
}

export interface RateLimitingConfig {
  auth: RateLimitingAuthConfig;
  general: RateLimitingGeneralConfig;
  summary: RateLimitingSummaryConfig;
  research?: RateLimitingResearchConfig;
}

export interface ResearchProgressPercentagesConfig {
  created: number;
  generating_questions: number;
  awaiting_question_approval: number;
  regenerating_questions: number;
  generating_search_terms: number;
  awaiting_search_term_approval: number;
  regenerating_search_terms: number;
  searching_videos: number;
  videos_found: number;
  filtering_videos: number;
  awaiting_video_approval: number;
  refiltering_videos: number;
  fetching_transcripts: number;
  transcripts_ready: number;
  generating_summary: number;
  completed: number;
  // Legacy fields for backward compatibility
  generating_queries?: number;
  queries_complete?: number;
  videos_selected?: number;
}

export interface SupadataSearchConfig {
  search_url: string;
  sort_by: 'views' | 'date' | 'relevance';
  video_type: string;
  supported_durations: string[];
  /** Max concurrent Supadata search requests (default 2). Lower values avoid 429 rate limits. */
  concurrency?: number;
  /** Delay in ms between starting each search request (default 600). Helps stay under Supadata rate limits. */
  delay_between_requests_ms?: number;
}

export interface CitationConfig {
  enabled: boolean;
  sources_heading: {
    [language: string]: string;
  };
  format_examples: {
    [language: string]: string;
  };
  parser?: CitationParserConfig;
}

export interface CitationParserConfig {
  patterns: {
    single: string; // Regex for single citation [1]
    multiple: string; // Regex for multiple citations [1, 3, 5]
    range: string; // Regex for range citations [1-4]
    section_heading: string; // Regex for H2 section headings (## Title)
  };
  sources_section_patterns: {
    [language: string]: string[]; // Array of patterns for Sources section headings per language
  };
  validation: {
    log_invalid_citations: boolean; // Whether to log invalid citation warnings
    allow_invalid_citations: boolean; // Whether to allow invalid citations (false = strict mode)
  };
}

export interface ResearchConfig {
  // Question generation
  question_count: number;
  enable_question_approval: boolean;
  enable_search_term_approval: boolean;
  enable_video_approval: boolean;
  
  // Search query generation
  queries_per_research: number; // Kept for backward compatibility
  search_terms_per_question: number;
  videos_per_query: number;
  
  // Feedback limits
  max_feedback_per_stage: number;
  min_feedback_length: number;
  max_feedback_length: number;
  
  // Approval timeouts
  approval_timeout_hours: number;
  cleanup_pending_jobs_interval_hours: number;
  
  // Video filtering
  min_video_duration_seconds: number;
  max_video_duration_seconds: number;
  target_selected_videos: number;
  min_selected_videos: number;
  
  // Summary generation
  five_question_framework: boolean;
  include_video_citations: boolean;
  use_questions_for_structure: boolean;
  enable_style_guide: boolean;
  style_guide_transcript_preview_length: number;
  
  // Citation system (Phase 1)
  citation?: CitationConfig;
  
  // Credit costs
  base_cost: number;
  per_video_cost: number;
  
  // Rate limiting (per tier)
  free_tier_max_per_hour: number;
  starter_tier_max_per_hour: number;
  pro_tier_max_per_hour: number;
  premium_tier_max_per_hour: number;
  
  // Timeouts
  search_timeout_ms: number;
  filter_timeout_ms: number;
  summary_timeout_ms: number;
  
  // Progress percentages
  progress_percentages: ResearchProgressPercentagesConfig;
}

export interface AuthConfig {
  credit_reset_cron: string;
  dev_mode_tier: 'free' | 'premium';
}

export interface MetricsConfig {
  max_items_retention: number;
  top_users_limit: number;
}

export interface TaskLimitsConfig {
  free: number;
  premium: number;
}

export interface TasksConfig {
  limits: TaskLimitsConfig;
  polling_interval_seconds: number;
}

export interface GuestAccessConfig {
  max_summaries: number | null; // null = unlimited
  cleanup_interval_hours: number;
}

export interface AppConfig {
  system: SystemConfig;
  freemium_model: FreemiumModelConfig;
  limits: LimitsConfig;
  ai_models: AIModelsConfig;
  api: APIConfigs;
  ai_settings: AISettingsConfig;
  auth: AuthConfig;
  summary: SummaryConfig;
  job_cleanup: JobCleanupConfig;
  rate_limiting: RateLimitingConfig;
  metrics: MetricsConfig;
  tasks: TasksConfig;
  guest_access?: GuestAccessConfig; // Optional guest access configuration
  local_storage?: LocalStorageConfig; // Optional top-level local storage config
  research?: ResearchConfig; // Optional research feature configuration
  supadata_search?: SupadataSearchConfig; // Optional Supadata search configuration
}

/**
 * Loads and parses config.yaml file
 * @returns Parsed configuration object
 */
function loadConfig(): AppConfig {
  const configPath = path.join(__dirname, '../../config.yaml');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Configuration file not found at ${configPath}. Please ensure config.yaml exists.`
    );
  }

  try {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.parse(fileContent) as AppConfig;

    // Validate required sections exist
    if (
      !config.system ||
      !config.freemium_model ||
      !config.limits ||
      !config.ai_models ||
      !config.api ||
      !config.api.dashscope ||
      !config.api.supadata ||
      !config.api.youtube ||
      !config.ai_settings ||
      !config.auth ||
      !config.summary ||
      !config.job_cleanup ||
      !config.rate_limiting ||
      !config.metrics ||
      !config.tasks
    ) {
      throw new Error('Configuration file is missing required sections.');
    }

    // Set defaults for optional guest_access config
    if (!config.guest_access) {
      config.guest_access = {
        max_summaries: null, // null = unlimited
        cleanup_interval_hours: 1,
      };
    }

    // Set default for optional history_research_fallback_title (Phase 4)
    if (!config.system.history_research_fallback_title) {
      config.system.history_research_fallback_title = 'Research';
    }

    // Validate config values for conflicts and logical consistency
    validateConfigValues(config);

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse config.yaml: ${error.message}`);
    }
    throw new Error('Failed to load configuration file.');
  }
}

/**
 * Validate configuration values to prevent conflicts and ensure logical consistency
 * @param config Configuration object to validate
 */
function validateConfigValues(config: AppConfig): void {
  const errors: string[] = [];

  // 1. Validate batch size limits
  const maxBatchSize = config.limits.max_batch_size;
  const freeTierMax = config.freemium_model.free_tier.max_videos_per_batch;
  const premiumTierMax = config.freemium_model.premium_tier.max_videos_per_batch;

  if (freeTierMax > maxBatchSize) {
    errors.push(
      `freemium_model.free_tier.max_videos_per_batch (${freeTierMax}) exceeds limits.max_batch_size (${maxBatchSize})`
    );
  }
  if (premiumTierMax > maxBatchSize) {
    errors.push(
      `freemium_model.premium_tier.max_videos_per_batch (${premiumTierMax}) exceeds limits.max_batch_size (${maxBatchSize})`
    );
  }

  // 2. Validate pagination limits
  const paginationDefault = config.system.history_pagination_default_limit;
  const paginationMax = config.system.history_pagination_max_limit;
  if (paginationDefault > paginationMax) {
    errors.push(
      `system.history_pagination_default_limit (${paginationDefault}) exceeds system.history_pagination_max_limit (${paginationMax})`
    );
  }

  // 3. Validate progress percentages are in ascending order
  const progress = config.summary.progress_percentages;
  const progressValues = [
    progress.validation,
    progress.fetching,
    progress.processing_start,
    progress.further_condensing,
    progress.aggregating,
    progress.generating,
    progress.completed,
  ];
  for (let i = 1; i < progressValues.length; i++) {
    if (progressValues[i] <= progressValues[i - 1]) {
      errors.push(
        `summary.progress_percentages values must be in ascending order. Found ${progressValues[i - 1]} followed by ${progressValues[i]}`
      );
      break;
    }
  }
  if (progress.completed !== 100) {
    errors.push(
      `summary.progress_percentages.completed must be 100, found ${progress.completed}`
    );
  }

  // 4. Validate token settings
  const maxContextTokens = config.limits.max_context_tokens;
  const safetyMargin = config.ai_settings.context_window_safety_margin;
  if (safetyMargin <= 0 || safetyMargin > 1) {
    errors.push(
      `ai_settings.context_window_safety_margin (${safetyMargin}) must be between 0 and 1`
    );
  }

  // 5. Validate reduction percentages
  // Condensing reduction percentages removed - condensing is disabled

  // 6. Validate job cleanup intervals
  const jobRetention = config.system.job_retention_hours;
  const cleanupInterval = config.job_cleanup.cleanup_interval_hours;
  if (cleanupInterval > jobRetention) {
    errors.push(
      `job_cleanup.cleanup_interval_hours (${cleanupInterval}) should not exceed system.job_retention_hours (${jobRetention}) for efficient cleanup`
    );
  }

  // 7. Validate rate limiting windows
  const summaryWindowHours = config.rate_limiting.summary.window_hours;
  if (summaryWindowHours <= 0 || summaryWindowHours > 168) {
    errors.push(
      `rate_limiting.summary.window_hours (${summaryWindowHours}) should be between 1 and 168 (1 week)`
    );
  }

  // 8. Validate dev mode tier
  const devModeTier = config.auth.dev_mode_tier;
  if (devModeTier !== 'free' && devModeTier !== 'premium') {
    errors.push(
      `auth.dev_mode_tier (${devModeTier}) must be either 'free' or 'premium'`
    );
  }

  // 9. Validate streaming progress ratio
  const streamingRatio = config.summary.sse_streaming.streaming_progress_ratio;
  if (streamingRatio <= 0 || streamingRatio > 1) {
    errors.push(
      `summary.sse_streaming.streaming_progress_ratio (${streamingRatio}) must be between 0 and 1`
    );
  }

  // 10. Validate timeouts are positive
  if (config.system.job_timeout_minutes <= 0) {
    errors.push(`system.job_timeout_minutes must be positive`);
  }
  if (config.api.supadata.timeout_ms <= 0) {
    errors.push(`api.supadata.timeout_ms must be positive`);
  }
  if (config.api.dashscope.timeout_ms <= 0) {
    errors.push(`api.dashscope.timeout_ms must be positive`);
  }

  // 11. Validate AI settings boolean parameters
  if (typeof config.ai_settings.stream !== 'boolean') {
    errors.push(`ai_settings.stream must be a boolean`);
  }
  if (typeof config.ai_settings.enable_thinking !== 'boolean') {
    errors.push(`ai_settings.enable_thinking must be a boolean`);
  }

  // Validate search term generation settings
  if (config.ai_settings.search_term_generation) {
    const stg = config.ai_settings.search_term_generation;
    if (typeof stg.enable_search !== 'boolean') {
      errors.push(`ai_settings.search_term_generation.enable_search must be a boolean`);
    }
    if (typeof stg.enable_thinking !== 'boolean') {
      errors.push(`ai_settings.search_term_generation.enable_thinking must be a boolean`);
    }
    if (typeof stg.thinking_budget !== 'number' || stg.thinking_budget <= 0) {
      errors.push(`ai_settings.search_term_generation.thinking_budget must be a positive number`);
    }
  } else {
    errors.push(`ai_settings.search_term_generation is required`);
  }

  // 12. Validate minimum transcript success rate
  const minSuccessRate = config.limits.min_transcript_success_rate;
  if (minSuccessRate <= 0 || minSuccessRate > 1) {
    errors.push(
      `limits.min_transcript_success_rate (${minSuccessRate}) must be between 0 and 1`
    );
  }

  // 13. Validate title generation config
  const titleGen = config.summary.title_generation;
  if (titleGen.max_length <= 0) {
    errors.push(`summary.title_generation.max_length must be positive`);
  }
  if (titleGen.min_length <= 0 || titleGen.min_length >= titleGen.max_length) {
    errors.push(
      `summary.title_generation.min_length (${titleGen.min_length}) must be positive and less than max_length (${titleGen.max_length})`
    );
  }
  if (titleGen.transcript_content_limit <= 0) {
    errors.push(`summary.title_generation.transcript_content_limit must be positive`);
  }
  if (titleGen.temperature < 0 || titleGen.temperature > 2) {
    errors.push(
      `summary.title_generation.temperature (${titleGen.temperature}) must be between 0 and 2`
    );
  }
  if (titleGen.max_tokens <= 0) {
    errors.push(`summary.title_generation.max_tokens must be positive`);
  }

  // 14. Validate metrics configuration
  if (config.metrics.max_items_retention <= 0) {
    errors.push(`metrics.max_items_retention must be positive`);
  }
  if (config.metrics.top_users_limit <= 0) {
    errors.push(`metrics.top_users_limit must be positive`);
  }

  // 15. Validate tasks configuration
  if (config.tasks.limits.free <= 0) {
    errors.push(`tasks.limits.free must be positive`);
  }
  if (config.tasks.limits.premium <= 0) {
    errors.push(`tasks.limits.premium must be positive`);
  }
  if (config.tasks.limits.premium < config.tasks.limits.free) {
    errors.push(
      `tasks.limits.premium (${config.tasks.limits.premium}) should be greater than or equal to tasks.limits.free (${config.tasks.limits.free})`
    );
  }
  if (config.tasks.polling_interval_seconds <= 0) {
    errors.push(`tasks.polling_interval_seconds must be positive`);
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}

// Load configuration
const config = loadConfig();

/**
 * Get configuration with environment-specific overrides
 * Currently returns the base config, but can be extended for env-specific overrides
 */
export function getConfig(): AppConfig {
  return config;
}

/**
 * Get system configuration
 */
export function getSystemConfig(): SystemConfig {
  return config.system;
}

/**
 * Get freemium model configuration
 */
export function getFreemiumConfig(): FreemiumModelConfig {
  return config.freemium_model;
}

/**
 * Get limits configuration
 */
export function getLimitsConfig(): LimitsConfig {
  return config.limits;
}

/**
 * Get AI models configuration
 */
export function getAIModelsConfig(): AIModelsConfig {
  return config.ai_models;
}

/**
 * Get API configuration
 */
export function getAPIConfig(): APIConfigs {
  return config.api;
}

/**
 * Get AI settings configuration
 */
export function getAISettingsConfig(): AISettingsConfig {
  return config.ai_settings;
}

/**
 * Get authentication configuration
 */
export function getAuthConfig(): AuthConfig {
  return config.auth;
}

/**
 * Get summary configuration
 */
export function getSummaryConfig(): SummaryConfig {
  return config.summary;
}

/**
 * Get job cleanup configuration
 */
export function getJobCleanupConfig(): JobCleanupConfig {
  return config.job_cleanup;
}

/**
 * Get rate limiting configuration
 */
export function getRateLimitingConfig(): RateLimitingConfig {
  return config.rate_limiting;
}

/**
 * Get metrics configuration
 */
export function getMetricsConfig(): MetricsConfig {
  return config.metrics;
}

/**
 * Get tasks configuration
 */
export function getTasksConfig(): TasksConfig {
  return config.tasks;
}

/**
 * Get guest access configuration
 */
export function getGuestAccessConfig(): GuestAccessConfig {
  return config.guest_access || {
    max_summaries: null,
    cleanup_interval_hours: 1,
  };
}

/**
 * Get research configuration
 */
export function getResearchConfig(): ResearchConfig {
  if (!config.research) {
    throw new Error('Research configuration not found in config.yaml');
  }
  return config.research;
}

/**
 * Get citation configuration
 */
export function getCitationConfig(): CitationConfig {
  const researchConfig = getResearchConfig();
  if (!researchConfig.citation) {
    // Return default citation config if not specified
    return {
      enabled: true,
      sources_heading: {
        'English': '### Sources',
        'Chinese (Simplified)': '### 来源',
        'Chinese (Traditional)': '### 來源',
        'Spanish': '### Fuentes',
        'French': '### Sources',
      },
      format_examples: {},
    };
  }
  return researchConfig.citation;
}

/**
 * Get citation parser configuration
 */
export function getCitationParserConfig(): CitationParserConfig {
  const citationConfig = getCitationConfig();
  
  if (citationConfig.parser) {
    return citationConfig.parser;
  }

  // Return default parser config if not specified
  return {
    patterns: {
      single: '\\[(\\d+)\\]',
      multiple: '\\[(\\d+(?:,\\s*\\d+)+)\\]',
      range: '\\[(\\d+)-(\\d+)\\]',
      section_heading: '^##\\s+(.+)$',
    },
    sources_section_patterns: {
      'English': ['### Sources'],
      'Chinese (Simplified)': ['### 来源'],
      'Chinese (Traditional)': ['### 來源'],
      'Spanish': ['### Fuentes'],
      'French': ['### Sources'],
      'German': ['### Quellen'],
      'Japanese': ['### 出典'],
      'Korean': ['### 출처'],
      'Portuguese': ['### Fontes'],
      'Italian': ['### Fonti'],
      'Russian': ['### Источники'],
      'Arabic': ['### المصادر'],
    },
    validation: {
      log_invalid_citations: true,
      allow_invalid_citations: true,
    },
  };
}

/**
 * Get Supadata search configuration
 */
export function getSupadataSearchConfig(): SupadataSearchConfig {
  if (!config.supadata_search) {
    throw new Error('Supadata search configuration not found in config.yaml');
  }
  return config.supadata_search;
}

/**
 * Get effective USE_LOCAL_STORAGE value
 * Priority order:
 * 1. Explicit USE_LOCAL_STORAGE environment variable (if set)
 * 2. Auto-detect based on NODE_ENV:
 *    - Production (NODE_ENV=production) → Firestore (false)
 *    - Development/Test → Local storage (true from config.yaml)
 * 3. Fallback to config.yaml value
 * 
 * This allows automatic switching:
 * - Localhost (development) → Local storage
 * - Cloud Run (production) → Firestore
 */
export function useLocalStorage(): boolean {
  // Check if USE_LOCAL_STORAGE is explicitly set in environment
  // This allows explicit override if needed
  if (process.env.USE_LOCAL_STORAGE !== undefined) {
    return env.USE_LOCAL_STORAGE;
  }

  // Auto-detect based on NODE_ENV
  // Production always uses Firestore (unless explicitly overridden above)
  if (env.NODE_ENV === 'production') {
    return false; // Use Firestore in production
  }

  // Development/test mode: use local storage from config.yaml
  return config.system.use_local_storage;
}

/**
 * Get local storage configuration with defaults
 * Centralized configuration for all local storage paths
 */
export function getLocalStorageConfig(): LocalStorageConfig {
  const defaultConfig: LocalStorageConfig = {
    data_directory: 'data',
    summaries_subdirectory: 'summaries',
    users_subdirectory: 'users',
    research_subdirectory: 'research',
  };

  // Use top-level config if available, otherwise use system.local_storage, otherwise defaults
  const storageConfig = config.local_storage || config.system.local_storage || defaultConfig;

  return {
    data_directory: storageConfig.data_directory || defaultConfig.data_directory,
    summaries_subdirectory: storageConfig.summaries_subdirectory || defaultConfig.summaries_subdirectory,
    users_subdirectory: storageConfig.users_subdirectory || defaultConfig.users_subdirectory,
    research_subdirectory: storageConfig.research_subdirectory || defaultConfig.research_subdirectory,
  };
}

/**
 * Get the absolute path to the summaries directory
 * Centralized path resolution for local storage
 */
export function getSummariesDirectory(): string {
  const storageConfig = getLocalStorageConfig();
  return path.join(process.cwd(), storageConfig.data_directory, storageConfig.summaries_subdirectory);
}

/**
 * Get the absolute path to the users directory
 * Centralized path resolution for local storage
 */
export function getUsersDirectory(): string {
  const storageConfig = getLocalStorageConfig();
  return path.join(process.cwd(), storageConfig.data_directory, storageConfig.users_subdirectory);
}

/**
 * Get the absolute path to the research directory
 * Centralized path resolution for local storage
 */
export function getResearchDirectory(): string {
  const storageConfig = getLocalStorageConfig();
  return path.join(process.cwd(), storageConfig.data_directory, storageConfig.research_subdirectory);
}

/**
 * Get the absolute path to the shared links directory
 * Centralized path resolution for local storage
 */
export function getSharedDirectory(): string {
  const storageConfig = getLocalStorageConfig();
  return path.join(process.cwd(), storageConfig.data_directory, 'shared');
}

/**
 * Validate local development configuration
 * Checks data directories, configuration consistency, and provides helpful warnings
 */
export function validateLocalDevConfig(): void {
  const useLocalStorageValue = useLocalStorage();
  
  // Determine how storage mode was selected
  const isExplicitlySet = process.env.USE_LOCAL_STORAGE !== undefined;
  const storageModeReason = isExplicitlySet
    ? `explicitly set via USE_LOCAL_STORAGE=${process.env.USE_LOCAL_STORAGE}`
    : env.NODE_ENV === 'production'
    ? `auto-selected Firestore for production (NODE_ENV=production)`
    : `auto-selected local storage for development (NODE_ENV=${env.NODE_ENV})`;

  logger.info(`💾 Storage mode: ${useLocalStorageValue ? 'LOCAL FILE STORAGE' : 'FIRESTORE'} (${storageModeReason})`);

  if (useLocalStorageValue) {
    logger.info('🔧 Local storage mode detected - validating configuration...');

    // Check and create data directories (using centralized config)
    const dataDir = getSummariesDirectory();
    const usersDir = getUsersDirectory();
    const researchDir = getResearchDirectory();

    try {
      if (!fs.existsSync(dataDir)) {
        logger.warn(`⚠️  Data directory does not exist: ${dataDir}`);
        logger.info('📁 Creating data directories...');
        fs.mkdirSync(dataDir, { recursive: true });
        logger.info(`✅ Created directory: ${dataDir}`);
      }

      if (!fs.existsSync(usersDir)) {
        logger.warn(`⚠️  Users directory does not exist: ${usersDir}`);
        fs.mkdirSync(usersDir, { recursive: true });
        logger.info(`✅ Created directory: ${usersDir}`);
      }

      if (!fs.existsSync(researchDir)) {
        logger.warn(`⚠️  Research directory does not exist: ${researchDir}`);
        fs.mkdirSync(researchDir, { recursive: true });
        logger.info(`✅ Created directory: ${researchDir}`);
      }

      logger.info('✅ Local storage directories ready', {
        summariesDir: dataDir,
        usersDir: usersDir,
        researchDir: researchDir,
      });
    } catch (error) {
      logger.error('❌ Failed to create data directories', error);
      throw new Error(`Cannot initialize local storage: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Warn if Firebase credentials exist (might be accidental)
    if (env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(env.GOOGLE_APPLICATION_CREDENTIALS)) {
      logger.warn('⚠️  Firebase credentials detected but using LOCAL STORAGE mode');
      logger.warn('   This is fine for development, but ensure production uses Firestore');
    }

    // Recommend AUTH_ENABLED=false for local dev
    if (env.AUTH_ENABLED) {
      logger.warn('⚠️  AUTH_ENABLED=true with local storage may cause user ID mismatches');
      logger.warn('   Consider setting AUTH_ENABLED=false for local development');
      logger.warn('   Dev user ID:', env.DEV_USER_ID);
    } else {
      logger.info('✅ Auth disabled - using dev user:', {
        userId: env.DEV_USER_ID,
        email: env.DEV_USER_EMAIL,
        name: env.DEV_USER_NAME,
      });
    }

    // Additional local storage info
    logger.info(`   Summaries directory: ${dataDir}`);
    logger.info(`   Users directory: ${usersDir}`);
  } else {
    // Validate Firestore configuration when not using local storage
    if (!env.GOOGLE_APPLICATION_CREDENTIALS && !env.FIRESTORE_EMULATOR_HOST) {
      if (env.NODE_ENV === 'production') {
        logger.warn('⚠️  Production mode detected but no Firebase credentials configured');
        logger.warn('   Set GOOGLE_APPLICATION_CREDENTIALS or configure Workload Identity');
        logger.warn('   Without credentials, Firestore operations will fail');
      } else {
        logger.warn('⚠️  No Firebase credentials or emulator host configured');
        logger.warn('   Set GOOGLE_APPLICATION_CREDENTIALS or FIRESTORE_EMULATOR_HOST');
      }
    } else {
      logger.info('✅ Firestore credentials configured');
    }
  }

  // Log development mode status
  if (DEV_MODE) {
    logger.info('🧪 Development mode: ENABLED');
  }
}

