/**
 * Simulation test: transcript -> style guide stage
 * Verifies that style guide generation runs correctly with mock transcripts and mocked AI.
 */
import { generateStyleGuide } from '../../../src/services/research.service';
import type { TranscriptData } from '../../../src/services/transcript.service';
import * as aiService from '../../../src/services/ai.service';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockTranscriptText =
  'Today we are making fried rice at home. Use day-old rice for best results. Heat the wok until smoking.';

function buildMockTranscripts(): TranscriptData[] {
  return [
    {
      url: 'https://www.youtube.com/watch?v=ex1',
      title: 'How to Make Fried Rice',
      channel: 'Test Kitchen',
      thumbnail: 'https://example.com/1.jpg',
      duration_seconds: 300,
      transcript_text: mockTranscriptText,
      word_count: 20,
      video_id: 'ex1',
    },
    {
      url: 'https://www.youtube.com/watch?v=ex2',
      title: 'Fried Rice Tips',
      channel: 'Cooking Tips',
      thumbnail: 'https://example.com/2.jpg',
      duration_seconds: 240,
      transcript_text: mockTranscriptText,
      word_count: 20,
      video_id: 'ex2',
    },
  ];
}

describe('research.service style guide (transcript -> style guide simulation)', () => {
  beforeEach(() => {
    jest.spyOn(aiService, 'callQwenFlash').mockResolvedValue({
      content:
        'Persona: Friendly cooking instructor. Tone: Conversational and practical. Language: Simple. Structure: Step-by-step.',
      tokens_used: 50,
      model: 'qwen-flash',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('generates a non-empty style guide from valid transcripts', async () => {
    const transcripts = buildMockTranscripts();
    const styleGuide = await generateStyleGuide(
      'how to make good fried rice',
      transcripts,
      'English',
      ['Why day-old rice?', 'What heat?'],
      'test-job-id'
    );

    expect(styleGuide).toBeDefined();
    expect(typeof styleGuide).toBe('string');
    expect(styleGuide.trim().length).toBeGreaterThan(0);
    expect(aiService.callQwenFlash).toHaveBeenCalledTimes(1);
  });

  it('returns empty string when all transcripts have no valid text', async () => {
    const transcriptsWithNoText: TranscriptData[] = [
      {
        ...buildMockTranscripts()[0],
        transcript_text: '',
      },
      {
        ...buildMockTranscripts()[1],
        transcript_text: '   \n\t  ',
      },
    ];

    const styleGuide = await generateStyleGuide(
      'how to make fried rice',
      transcriptsWithNoText,
      'English',
      undefined,
      'test-job-id'
    );

    expect(styleGuide).toBe('');
    expect(aiService.callQwenFlash).not.toHaveBeenCalled();
  });

  it('returns empty string when transcripts array is empty', async () => {
    const styleGuide = await generateStyleGuide(
      'how to make fried rice',
      [],
      'English',
      undefined,
      'test-job-id'
    );

    expect(styleGuide).toBe('');
    expect(aiService.callQwenFlash).not.toHaveBeenCalled();
  });

  it('returns empty string when AI returns an error', async () => {
    jest.spyOn(aiService, 'callQwenFlash').mockResolvedValue({
      error: 'API rate limit',
      error_code: 'rate_limit',
      model: 'qwen-flash',
    });

    const transcripts = buildMockTranscripts();
    const styleGuide = await generateStyleGuide(
      'how to make fried rice',
      transcripts,
      'English',
      undefined,
      'test-job-id'
    );

    expect(styleGuide).toBe('');
  });
});
