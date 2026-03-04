#!/usr/bin/env ts-node
/**
 * Simulation test: transcript stage -> style guide generation
 *
 * Simulates the flow between transcript fetch and summary generation to verify
 * that the style guide is successfully generated from mock transcripts.
 *
 * Usage:
 *   npm run simulate:style-guide           — uses real AI (needs DASHSCOPE_* in .env)
 *   SIMULATE_MOCK=1 npm run simulate:style-guide  — mock AI, no network (always passes pipeline)
 */

import dotenv from 'dotenv';
dotenv.config();

const MOCK_AI = process.env.SIMULATE_MOCK === '1' || process.env.SIMULATE_MOCK === 'true';

import { generateStyleGuide } from '../src/services/research.service';
import type { TranscriptData } from '../src/services/transcript.service';

// Sample transcript text (cooking / fried rice topic to match a typical research query)
const SAMPLE_TRANSCRIPT_1 = `
Today we're making restaurant-style fried rice at home. The key is using day-old rice 
so the grains stay separate. Heat your wok until it's smoking, then add a little oil. 
We'll do the eggs first, scramble them quickly and set aside. Same wok, more heat — 
add your rice and break up any clumps. Toss constantly for that wok hei, the breath 
of the wok that gives fried rice its signature flavor. Add back the eggs, some soy 
sauce, and your vegetables. Keep everything moving. Serve immediately.
`.trim();

const SAMPLE_TRANSCRIPT_2 = `
The biggest mistake people make with fried rice is using fresh rice. It's too moist 
and turns mushy. You want cold, dry rice — leftover from yesterday is perfect. 
Another tip: don't overcrowd the wok. Cook in batches if you need to. High heat 
is essential — we're talking as hot as your stove can go. And season with soy 
sauce at the end, not during cooking, so it doesn't burn.
`.trim();

const SAMPLE_TRANSCRIPT_3 = `
Let's talk about the science. When rice cools overnight, the starch recrystallizes. 
That's called retrogradation. It makes the grains firmer and less sticky, which 
is exactly what you want for fried rice. If you're in a hurry, spread freshly 
cooked rice on a sheet pan and let it cool with a fan — you can use it in about 
thirty minutes.
`.trim();

function buildMockTranscripts(): TranscriptData[] {
  return [
    {
      url: 'https://www.youtube.com/watch?v=example1',
      title: 'Restaurant-Style Fried Rice at Home',
      channel: 'Test Kitchen',
      thumbnail: 'https://example.com/thumb1.jpg',
      duration_seconds: 300,
      transcript_text: SAMPLE_TRANSCRIPT_1,
      word_count: 80,
      video_id: 'example1',
    },
    {
      url: 'https://www.youtube.com/watch?v=example2',
      title: '5 Mistakes to Avoid When Making Fried Rice',
      channel: 'Cooking Tips',
      thumbnail: 'https://example.com/thumb2.jpg',
      duration_seconds: 420,
      transcript_text: SAMPLE_TRANSCRIPT_2,
      word_count: 75,
      video_id: 'example2',
    },
    {
      url: 'https://www.youtube.com/watch?v=example3',
      title: 'The Science of Perfect Fried Rice',
      channel: 'Food Science',
      thumbnail: 'https://example.com/thumb3.jpg',
      duration_seconds: 360,
      transcript_text: SAMPLE_TRANSCRIPT_3,
      word_count: 70,
      video_id: 'example3',
    },
  ];
}

async function runSimulation(): Promise<void> {
  const researchQuery = 'how to make good fried rice';
  const language = 'English';
  const questions = [
    'Why use day-old rice?',
    'What heat level is best?',
    'When to add soy sauce?',
  ];
  const jobId = 'sim-style-guide-' + Date.now();

  const transcripts = buildMockTranscripts();

  console.log('\n--- Style guide simulation (transcript -> style guide stage) ---\n');
  console.log('Research query:', researchQuery);
  console.log('Language:', language);
  console.log('Questions:', questions.length);
  console.log('Mock transcripts:', transcripts.length);
  if (MOCK_AI) {
    console.log('Mode: MOCK (no API call)');
  } else {
    console.log('Mode: LIVE (calls DashScope API)');
  }
  console.log('');

  let styleGuide: string;

  if (MOCK_AI) {
    // Run pipeline without calling the real API: validate transcripts and prompt building
    const { getResearchConfig } = await import('../src/config');
    const { getStyleGuidePrompt } = await import('../src/prompts');
    const config = getResearchConfig();
    const previewLength = config.style_guide_transcript_preview_length || 1000;
    const validTranscripts = transcripts.filter(
      (t) =>
        t.transcript_text &&
        typeof t.transcript_text === 'string' &&
        t.transcript_text.trim().length > 0
    );
    if (validTranscripts.length === 0) {
      console.error('FAIL: No valid transcripts (validation failed).');
      process.exit(1);
    }
    const transcriptPreviews = validTranscripts.map((t, i) => {
      const preview = t.transcript_text.substring(0, previewLength);
      return `**Video ${i + 1}: ${t.title}**\n${preview}${t.transcript_text.length > previewLength ? '...' : ''}`;
    });
    const prompt = getStyleGuidePrompt({
      researchQuery,
      language,
      questions,
      transcriptPreviews,
    });
    if (!prompt || prompt.length < 100) {
      console.error('FAIL: Style guide prompt was not built correctly.');
      process.exit(1);
    }
    // Simulate AI response
    styleGuide =
      'Persona: Adopt the role of a friendly cooking instructor. Tone: Conversational and practical. Language: Simple, avoid jargon. Structure: Step-by-step with tips. Depth: 400-600 words per question for balanced explanations.';
  } else {
    styleGuide = await generateStyleGuide(
      researchQuery,
      transcripts,
      language,
      questions,
      jobId
    );
  }

  if (styleGuide && styleGuide.trim().length > 0) {
    console.log('SUCCESS: Style guide was generated.\n');
    console.log('Length:', styleGuide.length, 'characters');
    console.log('\n--- Style guide preview (first 500 chars) ---\n');
    console.log(styleGuide.substring(0, 500) + (styleGuide.length > 500 ? '...' : ''));
    console.log('\n--- End preview ---\n');
    process.exit(0);
  } else {
    console.error('FAIL: Style guide was not generated (empty or missing).');
    process.exit(1);
  }
}

runSimulation().catch((err) => {
  console.error('Simulation error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
