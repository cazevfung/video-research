/**
 * Pre-condensing prompt for long videos
 * Used to condense transcripts before final aggregation
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get the prompts directory path
 * Reads from src/prompts (which exists in Docker) instead of dist/prompts
 */
function getPromptsDir(): string {
  // __dirname in compiled code is dist/prompts
  // Go up to project root, then into src/prompts
  const srcPromptsDir = path.resolve(__dirname, '../../src/prompts');
  
  // Check if we're in dist (compiled) - if so, use src directory
  if (__dirname.includes('dist')) {
    if (fs.existsSync(srcPromptsDir)) {
      return srcPromptsDir;
    }
  }
  
  // Fallback to __dirname (works in dev with ts-node where __dirname is src/prompts)
  return __dirname;
}

/**
 * Load prompt template from markdown file
 */
function loadPromptTemplate(): string {
  const promptsDir = getPromptsDir();
  const templatePath = path.join(promptsDir, 'pre-condense.prompt.md');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Prompt template not found at ${templatePath}. Please ensure pre-condense.prompt.md exists.`
    );
  }
  
  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Generate system prompt for condensing long video transcripts
 * @returns System prompt string
 */
export function getPreCondensePrompt(): string {
  // Load template (no placeholders to replace - focuses on information density, not percentage targets)
  return loadPromptTemplate();
}

