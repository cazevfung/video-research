/**
 * Citation Mapper Utility (Frontend)
 * Maps selected videos to citation numbers and generates citation metadata
 * Frontend version of backend citation-mapper.service.ts
 */

import type { SelectedVideo } from '@/types/research';
import type { CitationMetadata } from '@/types/citations';
import { ensureVideoUploadDate } from '@/constants/dates';

/**
 * Video search result interface (for view_count lookup)
 */
interface VideoSearchResult {
  video_id: string;
  view_count: number;
}

/**
 * Generate citation map from selected videos
 * Maps videos to citation numbers: selected_videos[0] → [1], selected_videos[1] → [2], etc.
 * 
 * @param selectedVideos Array of selected videos
 * @param rawVideoResults Optional array of raw video results to look up view_count
 * @returns Citation metadata dictionary indexed by citation number
 */
export function generateCitationMap(
  selectedVideos: SelectedVideo[],
  rawVideoResults?: VideoSearchResult[]
): CitationMetadata {
  const citationMap: CitationMetadata = {};
  
  // Create a lookup map for view_count by video_id
  const viewCountMap = new Map<string, number>();
  if (rawVideoResults) {
    rawVideoResults.forEach(video => {
      viewCountMap.set(video.video_id, video.view_count);
    });
  }

  selectedVideos.forEach((video, index) => {
    const citationNumber = (index + 1).toString();
    
    // Look up view_count from raw video results if available
    const viewCount = viewCountMap.get(video.video_id) || 0;
    
    citationMap[citationNumber] = {
      videoId: video.video_id,
      title: video.title,
      channel: video.channel,
      thumbnail: video.thumbnail,
      url: video.url,
      duration_seconds: video.duration_seconds,
      upload_date: ensureVideoUploadDate(video.upload_date),
      view_count: viewCount,
    };
  });

  return citationMap;
}

/**
 * Source video item from SummaryResponse (summary flow).
 * Full detail has url/channel; list item may only have title/thumbnail.
 */
interface SourceVideoItem {
  url?: string;
  title: string;
  channel?: string;
  thumbnail?: string;
  duration_seconds?: number;
  /** When present, used for Sources display; otherwise fallback to "Unknown". */
  upload_date?: string;
}

/**
 * Extract YouTube video ID from URL (supports youtube.com?v=ID and youtu.be/ID)
 */
function extractVideoIdFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1).split('?')[0] || '';
    }
    return parsed.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

/**
 * Generate citation map from summary source_videos
 * Used for summary detail view and result card so citation hover works.
 * source_videos[0] → [1], source_videos[1] → [2], etc.
 * Accepts partial items (e.g. list item with only title/thumbnail).
 */
export function generateCitationMapFromSourceVideos(
  sourceVideos: SourceVideoItem[] | undefined
): CitationMetadata | null {
  if (!sourceVideos?.length) return null;
  const citationMap: CitationMetadata = {};
  sourceVideos.forEach((video, index) => {
    const citationNumber = (index + 1).toString();
    const url = video.url ?? '';
    const videoId = url ? extractVideoIdFromUrl(url) : `source-${index + 1}`;
    citationMap[citationNumber] = {
      videoId,
      title: video.title ?? '',
      channel: video.channel ?? '',
      thumbnail: video.thumbnail ?? '',
      url,
      duration_seconds: video.duration_seconds ?? 0,
      upload_date: ensureVideoUploadDate(video.upload_date),
      view_count: 0,
    };
  });
  return citationMap;
}
