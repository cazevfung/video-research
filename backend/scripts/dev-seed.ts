#!/usr/bin/env ts-node
/**
 * Development Seed Script
 * 
 * Creates sample test data for local development.
 * Useful for testing pagination, filtering, and UI components.
 * 
 * Usage: npm run dev:seed [--count=5]
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getSummariesDirectory, useLocalStorage, getConfig } from '../src/config';
import env from '../src/config/env';
import type { Summary, SourceVideo } from '../src/models/Summary';

// Sample video data for seeding
const SAMPLE_VIDEOS: Array<{
  url: string;
  title: string;
  channel: string;
  videoId: string;
  duration: number;
  wordCount: number;
}> = [
  {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Sample Video 1: Introduction to TypeScript',
    channel: 'Tech Channel',
    videoId: 'dQw4w9WgXcQ',
    duration: 600,
    wordCount: 1500,
  },
  {
    url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    title: 'Sample Video 2: React Best Practices',
    channel: 'Frontend Masters',
    videoId: '9bZkp7q19f0',
    duration: 900,
    wordCount: 2200,
  },
  {
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    title: 'Sample Video 3: Node.js Performance Tips',
    channel: 'Backend Dev',
    videoId: 'jNQXAC9IVRw',
    duration: 720,
    wordCount: 1800,
  },
  {
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    title: 'Sample Video 4: Database Design Patterns',
    channel: 'Data Engineering',
    videoId: 'kJQP7kiw5Fk',
    duration: 840,
    wordCount: 2100,
  },
  {
    url: 'https://www.youtube.com/watch?v=JGwWNGJdvx8',
    title: 'Sample Video 5: API Security Best Practices',
    channel: 'Security Experts',
    videoId: 'JGwWNGJdvx8',
    duration: 660,
    wordCount: 1650,
  },
];

function generateSampleSummary(index: number, userId: string): Summary {
  const config = getConfig();
  const presetStyles = config.summary.preset_styles;
  const presetStyle = presetStyles[index % presetStyles.length] || 'detailed';
  
  // Select 1-5 random videos for this summary
  const videoCount = Math.floor(Math.random() * 5) + 1;
  const selectedVideos = SAMPLE_VIDEOS.slice(0, videoCount).map((vid, idx): SourceVideo => ({
    url: vid.url,
    title: vid.title,
    channel: vid.channel,
    thumbnail: `https://i.ytimg.com/vi/${vid.videoId}/maxresdefault.jpg`,
    duration_seconds: vid.duration,
    word_count: vid.wordCount,
    was_pre_condensed: idx === 0 && videoCount > 3, // First video condensed if batch is large
    video_id: vid.videoId,
  }));

  // Generate summary text based on videos
  const videoTitles = selectedVideos.map(v => v.title).join(', ');
  const summaryText = `# Summary: ${videoTitles}\n\nThis is a sample summary generated for testing purposes. It contains content from ${videoCount} video(s) related to software development and best practices.\n\n## Key Points\n\n- Sample content point 1\n- Sample content point 2\n- Sample content point 3\n\nThis summary demonstrates the ${presetStyle} preset style.`;

  // Create timestamp with some variation (older summaries first)
  const now = Date.now();
  const daysAgo = index * 2; // Each summary is 2 days older than the previous
  const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);

  const jobId = uuidv4();
  const id = `${createdAt.getTime()}-${jobId.slice(0, 7)}`;

  return {
    id,
    user_id: userId,
    job_id: jobId,
    batch_title: `Test Summary ${index + 1}: ${selectedVideos.length} Video${selectedVideos.length > 1 ? 's' : ''}`,
    source_videos: selectedVideos,
    user_prompt_focus: index % 3 === 0 ? 'Focus on practical examples' : undefined,
    preset_style: presetStyle,
    final_summary_text: summaryText,
    language: config.summary.default_language || 'English',
    processing_stats: {
      total_videos: selectedVideos.length,
      condensed_videos: selectedVideos.filter(v => v.was_pre_condensed).length,
      total_tokens_used: Math.floor(Math.random() * 5000) + 1000,
      processing_time_seconds: Math.floor(Math.random() * 120) + 30,
    },
    created_at: createdAt.toISOString(),
    updated_at: createdAt.toISOString(),
  };
}

async function seedLocalData(count: number = 5) {
  console.log(`\n🌱 Seeding local test data (${count} summaries)...\n`);

  try {
    // Check if using local storage
    const useLocalStorageValue = useLocalStorage();
    if (!useLocalStorageValue) {
      console.log('⚠️  WARNING: Local storage is not enabled!');
      console.log('   This script only works when USE_LOCAL_STORAGE=true');
      console.log('   Current storage mode: FIRESTORE');
      console.log('   Aborting to prevent data conflicts.\n');
      process.exit(1);
    }

    // Get centralized directory path
    const summariesDir = getSummariesDirectory();

    // Ensure directory exists
    await fs.mkdir(summariesDir, { recursive: true });

    // Get dev user ID from config
    const userId = env.DEV_USER_ID;

    console.log(`Using dev user ID: ${userId}`);
    console.log(`Saving to: ${summariesDir}\n`);

    // Generate and save summaries
    const savedIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const summary = generateSampleSummary(i, userId);
      const filename = `${summary.id}.json`;
      const filePath = path.join(summariesDir, filename);

      await fs.writeFile(filePath, JSON.stringify(summary, null, 2), 'utf-8');
      savedIds.push(summary.id!);
      console.log(`✅ Created: ${summary.batch_title} (${filename})`);
    }

    console.log(`\n✅ Successfully created ${count} sample summaries!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total summaries: ${count}`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Directory: ${summariesDir}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   - Start the backend: npm run dev`);
    console.log(`   - Start the frontend: npm run dev`);
    console.log(`   - View summaries in the history page\n`);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let count = 5; // Default count

for (const arg of args) {
  if (arg.startsWith('--count=')) {
    const parsedCount = parseInt(arg.split('=')[1], 10);
    if (!isNaN(parsedCount) && parsedCount > 0) {
      count = parsedCount;
    }
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: npm run dev:seed [options]

Options:
  --count=N    Number of summaries to create (default: 5)
  --help, -h   Show this help message

Examples:
  npm run dev:seed              # Create 5 summaries
  npm run dev:seed --count=10   # Create 10 summaries
    `);
    process.exit(0);
  }
}

// Run seed
seedLocalData(count).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


