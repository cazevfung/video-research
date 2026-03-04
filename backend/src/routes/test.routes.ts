/**
 * Test routes for local testing of prompts and summarization
 * Only enabled in development mode
 */

import { Router, Request, Response } from 'express';
import { getFinalSummaryPrompt, injectContentIntoPrompt } from '../prompts';
import { callQwenPlus } from '../services/ai.service';
import { isValidPresetStyle } from '../prompts';
import logger from '../utils/logger';
import env from '../config/env';
import fs from 'fs';
import path from 'path';

const router = Router();

/**
 * POST /api/test/generate-prompt
 * Generate a prompt for testing (no AI call)
 * Body: { style, language, customPrompt?, transcript?, fullCustomPrompt? }
 * If transcript is provided, returns the complete assembled input as sent to AI
 * If fullCustomPrompt is provided, it bypasses the template system
 */
router.post('/generate-prompt', async (req: Request, res: Response) => {
  try {
    const { style, language, customPrompt, transcript, fullCustomPrompt } = req.body;

    let systemPrompt: string;

    // If fullCustomPrompt is provided, use it directly (bypass template system)
    if (fullCustomPrompt) {
      systemPrompt = fullCustomPrompt;
    } else {
      // Use standard template system
      if (!style || !language) {
        return res.status(400).json({
          error: 'Missing required fields: style and language are required when not using fullCustomPrompt',
        });
      }

      if (!isValidPresetStyle(style)) {
        return res.status(400).json({
          error: `Invalid style. Valid styles: ${['tldr', 'bullet_points', 'tutorial', 'detailed', 'deep_dive'].join(', ')}`,
        });
      }

      // Generate prompt using the prompt system
      systemPrompt = getFinalSummaryPrompt({
        presetStyle: style,
        customPrompt: customPrompt || undefined,
        language,
      });
    }

    // If transcript is provided, return the complete assembled input as it would be sent to AI
    if (transcript) {
      // Check if the prompt already contains [CONTENT_PLACEHOLDER]
      let combinedPrompt: string;
      if (systemPrompt.includes('[CONTENT_PLACEHOLDER]')) {
        combinedPrompt = injectContentIntoPrompt(systemPrompt, transcript);
      } else {
        // If no placeholder, append transcript at the end
        const promptWithPlaceholder = `${systemPrompt}\n\n[CONTENT_PLACEHOLDER]`;
        combinedPrompt = injectContentIntoPrompt(promptWithPlaceholder, transcript);
      }
      
      res.json({ 
        prompt: systemPrompt,
        completeInput: combinedPrompt
      });
    } else {
      res.json({ prompt: systemPrompt });
    }
  } catch (error) {
    logger.error('Error generating test prompt', { error });
    res.status(500).json({
      error: 'Failed to generate prompt',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/test/summarize
 * Test summarization with a direct transcript (bypasses URL fetching)
 * Body: { transcript, style, language, customPrompt?, fullCustomPrompt? }
 * 
 * If fullCustomPrompt is provided, it bypasses the template system and uses the full custom prompt directly.
 * Otherwise, uses the standard template system with style, language, and customPrompt.
 */
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { transcript, style, language, customPrompt, fullCustomPrompt } = req.body;

    if (!transcript) {
      return res.status(400).json({
        error: 'Missing required field: transcript is required',
      });
    }

    let combinedPrompt: string;

    // If fullCustomPrompt is provided, use it directly (bypass template system)
    if (fullCustomPrompt) {
      logger.info('Using full custom prompt (bypassing template system)', { 
        transcriptLength: transcript.length,
        customPromptLength: fullCustomPrompt.length 
      });
      
      // Check if the custom prompt already contains [CONTENT_PLACEHOLDER]
      if (fullCustomPrompt.includes('[CONTENT_PLACEHOLDER]')) {
        combinedPrompt = injectContentIntoPrompt(fullCustomPrompt, transcript);
      } else {
        // If no placeholder, append transcript at the end
        combinedPrompt = `${fullCustomPrompt}\n\n[CONTENT_PLACEHOLDER]`;
        combinedPrompt = injectContentIntoPrompt(combinedPrompt, transcript);
      }
    } else {
      // Use standard template system
      if (!style || !language) {
        return res.status(400).json({
          error: 'Missing required fields: style and language are required when not using fullCustomPrompt',
        });
      }

      if (!isValidPresetStyle(style)) {
        return res.status(400).json({
          error: `Invalid style. Valid styles: ${['tldr', 'bullet_points', 'tutorial', 'detailed', 'deep_dive'].join(', ')}`,
        });
      }

      // Generate prompt template
      const promptTemplate = getFinalSummaryPrompt({
        presetStyle: style,
        customPrompt: customPrompt || undefined,
        language,
      });

      // Combine prompt template with transcript content into single message
      combinedPrompt = injectContentIntoPrompt(promptTemplate, transcript);
      
      logger.info('Using template system', { style, language, transcriptLength: transcript.length });
    }

    // Call AI service with combined prompt (single user message)
    const result = await callQwenPlus(combinedPrompt);

    if ('error' in result) {
      return res.status(500).json({
        error: 'AI generation failed',
        message: result.error,
        error_code: result.error_code,
      });
    }

    res.json({
      summary: result.content,
      tokens_used: result.tokens_used,
      model: result.model,
    });
  } catch (error) {
    logger.error('Error testing summarization', { error });
    res.status(500).json({
      error: 'Failed to generate summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/test/sample-transcript
 * Get the sample transcript for testing
 */
router.get('/sample-transcript', (req: Request, res: Response) => {
  try {
    // Use process.cwd() to get the backend root directory
    const transcriptPath = path.join(process.cwd(), '__tests__', 'prompts', 'sample_transcript.txt');
    
    if (!fs.existsSync(transcriptPath)) {
      return res.status(404).json({
        error: 'Sample transcript not found',
      });
    }

    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain');
    res.send(transcript);
  } catch (error) {
    logger.error('Error serving sample transcript', { error });
    res.status(500).json({
      error: 'Failed to serve sample transcript',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
