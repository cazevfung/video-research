/**
 * Research State Validator
 * Validates state transitions for the enhanced research workflow
 */

export type ResearchStatus =
  | 'pending'
  | 'generating_questions'
  | 'awaiting_question_approval'
  | 'regenerating_questions'
  | 'generating_search_terms'
  | 'awaiting_search_term_approval'
  | 'regenerating_search_terms'
  | 'searching_videos'
  | 'videos_found'
  | 'filtering_videos'
  | 'awaiting_video_approval'
  | 'refiltering_videos'
  | 'fetching_transcripts'
  | 'transcripts_ready'
  | 'generating_summary'
  | 'completed'
  | 'error';

/**
 * Valid state transitions map
 * Each status can only transition to the statuses listed in its array
 */
const VALID_TRANSITIONS: Record<ResearchStatus, ResearchStatus[]> = {
  'pending': ['generating_questions', 'error'],
  'generating_questions': ['awaiting_question_approval', 'error'],
  'awaiting_question_approval': ['regenerating_questions', 'generating_search_terms', 'error'],
  'regenerating_questions': ['awaiting_question_approval', 'error'],
  'generating_search_terms': ['awaiting_search_term_approval', 'error'],
  'awaiting_search_term_approval': ['regenerating_search_terms', 'searching_videos', 'error'],
  'regenerating_search_terms': ['awaiting_search_term_approval', 'error'],
  'searching_videos': ['videos_found', 'filtering_videos', 'error'],
  'videos_found': ['filtering_videos', 'error'],
  'filtering_videos': ['awaiting_video_approval', 'error'],
  'awaiting_video_approval': ['refiltering_videos', 'fetching_transcripts', 'error'],
  'refiltering_videos': ['awaiting_video_approval', 'error'],
  'fetching_transcripts': ['transcripts_ready', 'generating_summary', 'error'],
  'transcripts_ready': ['generating_summary', 'error'],
  'generating_summary': ['completed', 'error'],
  'completed': [],
  'error': [],
};

/**
 * Validate if a state transition is allowed
 * @param from Current status
 * @param to Target status
 * @returns true if transition is valid, false otherwise
 */
export function validateStateTransition(
  from: ResearchStatus,
  to: ResearchStatus
): boolean {
  const validNextStates = VALID_TRANSITIONS[from];
  if (!validNextStates) {
    return false;
  }
  return validNextStates.includes(to);
}

/**
 * Get all valid next states for a given current state
 * @param current Current status
 * @returns Array of valid next statuses
 */
export function getValidNextStates(current: ResearchStatus): ResearchStatus[] {
  return VALID_TRANSITIONS[current] || [];
}

/**
 * Check if a status is a terminal state (cannot transition further)
 * @param status Status to check
 * @returns true if status is terminal (completed or error)
 */
export function isTerminalState(status: ResearchStatus): boolean {
  return status === 'completed' || status === 'error';
}

/**
 * Check if a status is an approval state (awaiting user input)
 * @param status Status to check
 * @returns true if status is awaiting approval
 */
export function isApprovalState(status: ResearchStatus): boolean {
  return status === 'awaiting_question_approval' ||
         status === 'awaiting_search_term_approval' ||
         status === 'awaiting_video_approval';
}

/**
 * Check if a status is a regeneration state (AI is regenerating based on feedback)
 * @param status Status to check
 * @returns true if status is regenerating
 */
export function isRegeneratingState(status: ResearchStatus): boolean {
  return status === 'regenerating_questions' ||
         status === 'regenerating_search_terms' ||
         status === 'refiltering_videos';
}
