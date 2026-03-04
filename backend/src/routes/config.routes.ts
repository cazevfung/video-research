/**
 * Config routes
 * Provides frontend-relevant configuration values from config.yaml
 */

import { Router, Request, Response } from 'express';
import { getSummaryConfig, getLimitsConfig, getTasksConfig, getResearchConfig } from '../config';

const router = Router();

/**
 * GET /api/config
 * Returns frontend-relevant configuration values
 * Public endpoint - no authentication required
 * Phase 3: Added tasks.polling_interval_seconds to response
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const summaryConfig = getSummaryConfig();
    const limitsConfig = getLimitsConfig();
    const tasksConfig = getTasksConfig();
    const researchConfig = getResearchConfig();

    res.json({
      preset_styles: summaryConfig.preset_styles,
      supported_languages: summaryConfig.supported_languages,
      default_language: summaryConfig.default_language,
      custom_prompt_max_length: limitsConfig.custom_prompt_max_length,
      tasks: {
        polling_interval_seconds: tasksConfig.polling_interval_seconds,
      },
      research: {
        question_count: researchConfig.question_count,
        enable_question_approval: researchConfig.enable_question_approval,
        enable_search_term_approval: researchConfig.enable_search_term_approval,
        enable_video_approval: researchConfig.enable_video_approval,
        search_terms_per_question: researchConfig.search_terms_per_question,
        max_feedback_per_stage: researchConfig.max_feedback_per_stage,
        min_feedback_length: researchConfig.min_feedback_length,
        max_feedback_length: researchConfig.max_feedback_length,
        target_selected_videos: researchConfig.target_selected_videos,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;


