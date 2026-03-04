/**
 * Centralized status message configuration
 * Maps backend message strings (sent via SSE/API) to i18n translation keys.
 * No hardcoded user-facing strings - all display text comes from locale files.
 *
 * Backend contract: summary.service and research.service send these canonical
 * English strings. Frontend maps them to translation keys for localization.
 */

/** i18n key format: "namespace:key" or "key" (uses component's default namespace) */
export type StatusMessageKey =
  | 'summary:processing.fetchingTranscripts'
  | 'summary:processing.processingVideos'
  | 'summary:processing.condensingVideos'
  | 'summary:processing.aggregatingContent'
  | 'summary:processing.generatingSummary'
  | 'research:progress.researchJobCreated'
  | 'research:progress.generatingQuestions'
  | 'research:progress.awaitingQuestionApproval'
  | 'research:progress.regeneratingQuestions'
  | 'research:progress.generatingSearchTerms'
  | 'research:progress.awaitingSearchTermApproval'
  | 'research:progress.regeneratingSearchTerms'
  | 'research:progress.generatingQueries'
  | 'research:progress.searchingVideos'
  | 'research:progress.filteringVideos'
  | 'research:progress.awaitingVideoApproval'
  | 'research:progress.refilteringVideos'
  | 'research:progress.generatingSummary'
  | 'research:progress.generatingResearchSummary'
  | 'research:progress.generatingSummaryUnavailable'
  | 'research:progress.researchCompleted'
  | 'research:progress.researchFailed'
  | 'common:messages.summaryCompleted';

/**
 * Maps backend message strings to i18n keys.
 * Keys are the canonical strings sent by the backend (config.yaml, summary.service, research.service).
 */
export const BACKEND_MESSAGE_TO_I18N_KEY: Record<string, StatusMessageKey> = {
  // Summary flow (summary namespace)
  'Processing...': 'summary:processing.processingVideos',
  'Fetching transcripts...': 'summary:processing.fetchingTranscripts',
  'Processing videos...': 'summary:processing.processingVideos',
  'Condensing long videos...': 'summary:processing.condensingVideos',
  'Combining transcripts...': 'summary:processing.aggregatingContent',
  'Aggregating content...': 'summary:processing.aggregatingContent',
  'Generating final summary...': 'summary:processing.generatingSummary',
  'Generating summary...': 'summary:processing.generatingSummary',
  'Summary completed!': 'common:messages.summaryCompleted',
  'Summary completed successfully': 'common:messages.summaryCompleted',
  // Research flow (research namespace)
  'Research job created': 'research:progress.researchJobCreated',
  'Generating research questions...': 'research:progress.generatingQuestions',
  'Please review and approve the research questions':
    'research:progress.awaitingQuestionApproval',
  'Regenerating research questions based on your feedback...':
    'research:progress.regeneratingQuestions',
  'Generating search terms from approved questions...':
    'research:progress.generatingSearchTerms',
  'Please review and approve the search terms':
    'research:progress.awaitingSearchTermApproval',
  'Regenerating search terms based on your feedback...':
    'research:progress.regeneratingSearchTerms',
  'Generating search queries...': 'research:progress.generatingQueries',
  'Searching for videos...': 'research:progress.searchingVideos',
  'AI is selecting the best videos...': 'research:progress.filteringVideos',
  'Please review and approve the selected videos':
    'research:progress.awaitingVideoApproval',
  'Reselecting videos based on your feedback...':
    'research:progress.refilteringVideos',
  'Generating comprehensive research summary...':
    'research:progress.generatingSummary',
  'Generating research summary...': 'research:progress.generatingResearchSummary',
  'Generating summary (streaming unavailable)...':
    'research:progress.generatingSummaryUnavailable',
  'Research completed successfully': 'research:progress.researchCompleted',
  'Research failed': 'research:progress.researchFailed',
};

/** Regex patterns for dynamic backend messages (with capture groups for interpolation) */
export const STATUS_MESSAGE_PATTERNS = {
  generatedQueriesSearching:
    /Generated (\d+) search queries?\. Searching for videos\.\.\./i,
  generatedQuestionsReview:
    /Generated (\d+) research questions?\. Please review and approve\./i,
  generatingQuestionsProgress:
    /Generating questions?\.\.\.\s*\((\d+)\/(\d+)\)/i,
  generatingSearchTermsProgress:
    /Generating search terms?\.\.\.\s*\((\d+)\/(\d+)\)/i,
  foundVideosFiltering:
    /Found (\d+) videos?\. Filtering to select the best (\d+)\.\.\./i,
  selectedVideosFetching:
    /Selected (\d+) videos?\. Fetching transcripts\.\.\./i,
} as const;

/** i18n keys for dynamic messages (with {{param}} placeholders) */
export const DYNAMIC_MESSAGE_KEYS = {
  generatedQueriesSearching: 'research:progress.generatedQueriesSearching',
  generatedQuestionsReview: 'research:progress.generatedQuestionsReview',
  generatingQuestionsProgress: 'research:progress.generatingQuestionsProgress',
  generatingSearchTermsProgress:
    'research:progress.generatingSearchTermsProgress',
  foundVideosFiltering: 'research:progress.foundVideosFiltering',
  selectedVideosFetching: 'research:progress.selectedVideosFetching',
} as const;

/** Maps research status enum to i18n key (for when backend message is null) */
export const RESEARCH_STATUS_TO_I18N_KEY: Record<string, string> = {
  generating_questions: 'research:progress.generatingQuestions',
  awaiting_question_approval: 'research:progress.awaitingQuestionApproval',
  regenerating_questions: 'research:progress.regeneratingQuestions',
  generating_search_terms: 'research:progress.generatingSearchTerms',
  awaiting_search_term_approval: 'research:progress.awaitingSearchTermApproval',
  regenerating_search_terms: 'research:progress.regeneratingSearchTerms',
  generating_queries: 'research:progress.generatingQueries',
  searching_videos: 'research:progress.searchingVideos',
  filtering_videos: 'research:progress.filteringVideos',
  awaiting_video_approval: 'research:progress.awaitingVideoApproval',
  refiltering_videos: 'research:progress.refilteringVideos',
  fetching_transcripts: 'research:progress.fetchingTranscripts',
  generating_summary: 'research:progress.generatingSummary',
  completed: 'research:progress.researchCompleted',
  error: 'research:progress.researchFailed',
};
