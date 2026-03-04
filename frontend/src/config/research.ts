/**
 * Research Feature Configuration
 * Phase 5: Centralized configuration for research feature settings
 * All values are configurable via environment variables with sensible defaults
 */

/**
 * Research query validation configuration
 * Configurable via environment variables
 */
export const researchQueryConfig = {
  /**
   * Minimum query length in characters
   * Default: 10 characters
   * Configurable via NEXT_PUBLIC_RESEARCH_MIN_QUERY_LENGTH
   */
  minLength: parseInt(
    process.env.NEXT_PUBLIC_RESEARCH_MIN_QUERY_LENGTH || '10',
    10
  ),
} as const;

/**
 * Research form configuration
 */
export const researchFormConfig = {
  /**
   * Debounce delay for form auto-save in milliseconds
   * Default: 300ms
   * Configurable via NEXT_PUBLIC_RESEARCH_FORM_DEBOUNCE_DELAY_MS
   */
  debounceDelay: parseInt(
    process.env.NEXT_PUBLIC_RESEARCH_FORM_DEBOUNCE_DELAY_MS || '300',
    10
  ),
  /**
   * Submit button cooldown (ms) after submit to prevent rapid re-submissions.
   * Phase 3: From config, not hardcoded.
   * Configurable via NEXT_PUBLIC_RESEARCH_SUBMIT_COOLDOWN_MS
   */
  submitButtonCooldownMs: parseInt(
    process.env.NEXT_PUBLIC_RESEARCH_SUBMIT_COOLDOWN_MS || '1000',
    10
  ),
  /**
   * Local storage key for form draft
   */
  storageKey: 'research-form-draft',
} as const;

/**
 * Research result display configuration
 * Date format and fallback for research cards (no hardcoded values)
 */
export const researchDisplayConfig = {
  /**
   * Date format string (e.g. 'PPp' -> "Jan 15, 2026 at 1:44 PM")
   * Configurable via NEXT_PUBLIC_RESEARCH_DATE_FORMAT
   */
  dateFormat: process.env.NEXT_PUBLIC_RESEARCH_DATE_FORMAT || 'PPp',
  /**
   * Fallback when date is invalid/missing. Use '' to hide date line in UI.
   * Configurable via NEXT_PUBLIC_RESEARCH_DATE_FALLBACK
   */
  dateFormatFallback: process.env.NEXT_PUBLIC_RESEARCH_DATE_FALLBACK ?? '',
} as const;

/**
 * Research feature configuration
 * All timing and limit values are configurable via environment variables
 */
export const researchConfig = {
  query: researchQueryConfig,
  form: researchFormConfig,
  display: researchDisplayConfig,
} as const;
