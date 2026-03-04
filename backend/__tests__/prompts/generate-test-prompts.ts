/**
 * Script to generate actual prompts for different styles using sample transcript
 * This simulates what the actual prompt would be sent to the AI
 */

import * as fs from 'fs';
import * as path from 'path';
import { getFinalSummaryPrompt, injectContentIntoPrompt } from '../../src/prompts/final-summary.prompt';

// Styles to generate prompts for
const styles = ['tldr', 'bullet_points', 'tutorial', 'detailed', 'deep_dive'];

// Read sample transcript - use absolute path to ensure we find it
// Try the UTF-8 version first, fallback to original
const sampleTranscriptPath = fs.existsSync(path.resolve(__dirname, 'sample_transcript_utf8.txt'))
  ? path.resolve(__dirname, 'sample_transcript_utf8.txt')
  : path.resolve(__dirname, 'sample_transcript.txt');
console.log(`Reading transcript from: ${sampleTranscriptPath}`);
console.log(`File exists: ${fs.existsSync(sampleTranscriptPath)}`);

let sampleTranscript: string;
try {
  // Try reading with different encodings if utf-8 fails
  sampleTranscript = fs.readFileSync(sampleTranscriptPath, 'utf-8');
  if (sampleTranscript.length === 0) {
    // Try with utf8-bom or other encodings
    console.log('File appears empty with utf-8, trying alternative...');
    const buffer = fs.readFileSync(sampleTranscriptPath);
    sampleTranscript = buffer.toString('utf-8');
  }
  console.log(`Transcript length: ${sampleTranscript.length} characters`);
  if (sampleTranscript.length === 0) {
    throw new Error('Transcript file is empty! Please check the file exists and has content.');
  }
  console.log(`First 100 chars: ${sampleTranscript.substring(0, 100)}`);
} catch (error) {
  console.error(`Error reading transcript: ${error}`);
  throw error;
}

// Format transcript as it would appear in the prompt (simulating aggregated content)
// In real usage, this would be pre-condensed and formatted, but for testing we'll use the raw transcript
const formattedContent = `Video: "The Week Google Changed Everything"

Transcript:
${sampleTranscript}`;

// Generate prompts for each style
styles.forEach(style => {
  console.log(`Generating prompt for style: ${style}`);
  
  // Generate the prompt template
  const promptTemplate = getFinalSummaryPrompt({
    presetStyle: style,
    language: 'English',
    // No custom prompt or context for these test prompts
  });
  
  // Inject the content
  const fullPrompt = injectContentIntoPrompt(promptTemplate, formattedContent);
  
  // Save to file
  const outputPath = path.join(__dirname, `prompt_${style}.txt`);
  fs.writeFileSync(outputPath, fullPrompt, 'utf-8');
  
  console.log(`✓ Saved prompt to: ${outputPath}`);
});

console.log('\n✅ All prompts generated successfully!');
console.log('\nGenerated files:');
styles.forEach(style => {
  console.log(`  - prompt_${style}.txt`);
});
