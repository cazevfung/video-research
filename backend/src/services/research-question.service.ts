/**
 * Research Question Service
 * Handles generation and regeneration of research questions
 */

import { callQwenPlus, AIResult, AIError } from './ai.service';
import { getQuestionGenerationPrompt, getQuestionRegenerationPrompt } from '../prompts/research.prompt';
import logger from '../utils/logger';

/**
 * Type guard to check if AI result is an error
 */
function isAIError(result: AIResult): result is AIError {
  return 'error' in result;
}

/**
 * Parse questions from AI response
 * Handles both JSON format and numbered list format
 */
function parseQuestionsFromAI(content: string): string[] {
  // Log the raw content for debugging
  logger.debug('[Research] Parsing questions from AI response', {
    contentLength: content.length,
    contentPreview: content.substring(0, 500),
  });

  // Try to extract JSON first (with more flexible matching)
  // 1) Object with "questions" key: { "questions": ["q1", "q2", ...] }
  let jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (!jsonMatch) {
    jsonMatch = content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
  }
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        const questions = parsed.questions.map((q: string) => q.trim()).filter(Boolean);
        logger.debug('[Research] Successfully parsed questions from JSON object', { count: questions.length });
        return questions;
      }
    } catch (e) {
      logger.warn('[Research] Failed to parse JSON from AI response', {
        error: e instanceof Error ? e.message : String(e),
        jsonPreview: jsonMatch[0].substring(0, 200),
      });
    }
  }

  // 2) Top-level JSON array of strings (e.g. ["q1", "q2", ...] — common from regeneration)
  const tryParseArray = (jsonStr: string): string[] | null => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.every((q) => typeof q === 'string')) {
        return parsed.map((q: string) => q.trim()).filter(Boolean);
      }
    } catch {
      // ignore
    }
    return null;
  };

  // 2a) Array in code block
  const codeBlockArrayMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
  if (codeBlockArrayMatch) {
    const questions = tryParseArray(codeBlockArrayMatch[1] || codeBlockArrayMatch[0]);
    if (questions && questions.length > 0) {
      logger.debug('[Research] Successfully parsed questions from JSON array in code block', { count: questions.length });
      return questions;
    }
  }

  // 2b) Whole content is just the array (with optional surrounding whitespace)
  const trimmed = content.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const questions = tryParseArray(trimmed);
    if (questions && questions.length > 0) {
      logger.debug('[Research] Successfully parsed questions from bare JSON array', { count: questions.length });
      return questions;
    }
  }

  // 2c) Find first top-level [...] in content (handles leading/trailing text or newlines)
  const openBracket = content.indexOf('[');
  if (openBracket !== -1) {
    let depth = 0;
    let end = -1;
    for (let i = openBracket; i < content.length; i++) {
      if (content[i] === '[') depth++;
      else if (content[i] === ']') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) {
      const slice = content.slice(openBracket, end + 1);
      const questions = tryParseArray(slice);
      if (questions && questions.length > 0) {
        logger.debug('[Research] Successfully parsed questions from extracted JSON array', { count: questions.length });
        return questions;
      }
    }
  }

  // Fallback: parse numbered list (enhanced to handle Chinese and other formats)
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const questions: string[] = [];
  
  for (const line of lines) {
    // Skip lines that are clearly meta-commentary or explanations
    // These often start with bold markdown or explanatory text
    if (line.startsWith('**') || 
        line.toLowerCase().includes('preserved') ||
        line.toLowerCase().includes('corrected') ||
        line.toLowerCase().includes('updated') ||
        line.toLowerCase().includes('maintained') ||
        line.toLowerCase().includes('enhanced')) {
      continue;
    }
    
    // Match patterns like "1. question" or "1) question" or "- question"
    // Also handle Chinese numbering: "一、" "二、" "三、"
    let match = line.match(/^(?:\d+[.)]\s*|[-•]\s*)(.+)$/);
    
    // Try Chinese numbering patterns
    if (!match) {
      match = line.match(/^[一二三四五六七八九十]+[、.]\s*(.+)$/);
    }
    
    // Try patterns like "Q1:" or "Question 1:"
    if (!match) {
      match = line.match(/^(?:Q\d+|Question\s+\d+)[:：]\s*(.+)$/i);
    }
    
    if (match) {
      const question = match[1].trim();
      
      // Additional validation: skip if it's meta-commentary
      if (question.startsWith('**') || 
          question.toLowerCase().includes('preserved') ||
          question.toLowerCase().includes('corrected') ||
          question.toLowerCase().includes('updated') ||
          question.toLowerCase().includes('maintained') ||
          question.toLowerCase().includes('enhanced') ||
          question.match(/^(timing|international|specific|uk's|alliance)/i)) {
        continue;
      }
      
      // Only add if it looks like a complete question (not just a label)
      if (question.length > 3) {
        questions.push(question);
      }
    }
  }

  logger.debug('[Research] Parsed questions from list format', { 
    count: questions.length,
    questions: questions.slice(0, 3).map(q => q.substring(0, 50)),
  });

  // If still no questions found, try a more aggressive extraction
  // Look for any lines that end with "?" and are reasonably long
  if (questions.length === 0) {
    logger.debug('[Research] Trying fallback question extraction');
    const allLines = content.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of allLines) {
      // Look for lines ending with question mark that are substantial
      if (line.endsWith('?') && line.length > 10) {
        // Remove common prefixes
        const cleaned = line
          .replace(/^(?:\d+[.)]\s*|[-•]\s*|[一二三四五六七八九十]+[、.]\s*|Q\d+[:：]\s*|Question\s+\d+[:：]\s*)/i, '')
          .trim();
        if (cleaned.length > 5 && !questions.includes(cleaned)) {
          questions.push(cleaned);
        }
      }
    }
    logger.debug('[Research] Fallback extraction found questions', { count: questions.length });
  }

  return questions;
}

/**
 * Generate research questions from query
 */
export async function generateResearchQuestions(
  researchQuery: string,
  language: string,
  questionCount: number
): Promise<string[]> {
  logger.info('[Research] Generating research questions', {
    researchQuery: researchQuery.substring(0, 100),
    language,
    questionCount,
  });

  const prompt = getQuestionGenerationPrompt({
    researchQuery,
    language,
    questionCount,
  });

  try {
    const aiResult = await callQwenPlus(prompt, undefined, {
      enable_thinking: true,
      thinking_budget: 4000,
    });

    if (isAIError(aiResult)) {
      throw new Error(`AI service error: ${aiResult.error} (${aiResult.error_code})`);
    }

    const questions = parseQuestionsFromAI(aiResult.content);
    
    // Log raw content if parsing failed
    if (questions.length === 0) {
      logger.warn('[Research] No questions parsed from AI response', {
        contentLength: aiResult.content.length,
        rawContent: aiResult.content.substring(0, 1000),
      });
    }
    
    // Validate that we got the expected number of questions
    if (questions.length !== questionCount) {
      logger.warn('[Research] Question count mismatch', {
        expected: questionCount,
        received: questions.length,
        rawContentPreview: aiResult.content.substring(0, 500),
      });
      
      // If we got more questions than expected, take only the first N
      if (questions.length > questionCount) {
        logger.warn('[Research] Truncating excess questions', {
          truncatedFrom: questions.length,
          truncatedTo: questionCount,
        });
        return questions.slice(0, questionCount);
      }
      
      // If we got fewer, log the issue but return what we have
      logger.error('[Research] Received fewer questions than expected', {
        expected: questionCount,
        received: questions.length,
      });
    }
    
    logger.info('[Research] Questions generated', {
      questionCount: questions.length,
      questions: questions.map((q, i) => `${i + 1}. ${q.substring(0, 50)}...`),
    });

    return questions;
  } catch (error) {
    logger.error('[Research] Failed to generate questions', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Regenerate questions based on user feedback
 */
export async function regenerateResearchQuestions(
  researchQuery: string,
  language: string,
  originalQuestions: string[],
  userFeedback: string,
  questionCount: number
): Promise<string[]> {
  logger.info('[Research] Regenerating questions with feedback', {
    researchQuery: researchQuery.substring(0, 100),
    feedbackLength: userFeedback.length,
    originalQuestionCount: originalQuestions.length,
  });

  const prompt = getQuestionRegenerationPrompt({
    researchQuery,
    language,
    originalQuestions,
    userFeedback,
    questionCount,
  });

  try {
    const aiResult = await callQwenPlus(prompt, undefined, {
      enable_thinking: true,
      thinking_budget: 4000,
    });

    if (isAIError(aiResult)) {
      throw new Error(`AI service error: ${aiResult.error} (${aiResult.error_code})`);
    }

    const updatedQuestions = parseQuestionsFromAI(aiResult.content);
    
    // Validate that we got the expected number of questions
    if (updatedQuestions.length !== questionCount) {
      logger.warn('[Research] Question count mismatch after regeneration', {
        expected: questionCount,
        received: updatedQuestions.length,
        rawContentPreview: aiResult.content.substring(0, 500),
      });
      
      // If we got more questions than expected, take only the first N
      if (updatedQuestions.length > questionCount) {
        logger.warn('[Research] Truncating excess questions', {
          truncatedFrom: updatedQuestions.length,
          truncatedTo: questionCount,
        });
        return updatedQuestions.slice(0, questionCount);
      }
      
      // If we got fewer, log the issue but return what we have
      logger.error('[Research] Received fewer questions than expected', {
        expected: questionCount,
        received: updatedQuestions.length,
      });
    }
    
    logger.info('[Research] Questions regenerated', {
      questionCount: updatedQuestions.length,
    });

    return updatedQuestions;
  } catch (error) {
    logger.error('[Research] Failed to regenerate questions', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
