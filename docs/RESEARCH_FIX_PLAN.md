# Research Feature Fix Plan

## Problem Summary

1. **Polling is useless**: Status endpoint only returns generic status/progress, no intermediate data
2. **0 raw results**: `video_search_results` never saved to research document
3. **No generated queries visible**: Only available at completion, not during processing
4. **Generic status messages**: "Processing..." doesn't tell you what's happening
5. **Can't verify completion**: No way to see what was actually completed

## Root Causes

1. Intermediate data (generated_queries, raw_video_results, selected_videos) only sent via SSE, never stored in job object
2. `video_search_results` field exists in interface but never populated when creating research document
3. Status endpoint only returns data from research document (which only exists at completion)
4. Job object doesn't store research-specific intermediate data
5. Status messages are hardcoded and don't include actual data

---

## Fix Plan

### Phase 1: Extend Job Object to Store Intermediate Data

#### 1.1 Update `JobInfo` Interface
**File**: `backend/src/types/summary.types.ts`

Add optional research-specific fields to `JobInfo`:
```typescript
export interface JobInfo {
  // ... existing fields ...
  
  // Research-specific intermediate data
  research_data?: {
    generated_queries?: string[];
    raw_video_results?: any[]; // VideoSearchResult[]
    selected_videos?: SelectedVideo[];
    video_count?: number;
  };
}
```

**Why**: Allows storing intermediate data in job object for real-time polling access.

---

#### 1.2 Update `updateJobStatus` Function
**File**: `backend/src/services/job.service.ts`

Extend `updateJobStatus` to accept research data:
```typescript
export function updateJobStatus(
  jobId: string,
  status: JobStatus,
  data?: {
    progress?: number;
    error?: string;
    summary_id?: string;
    title?: string | null;
    // Add research data
    research_data?: {
      generated_queries?: string[];
      raw_video_results?: any[];
      selected_videos?: SelectedVideo[];
      video_count?: number;
    };
  }
): void {
  // ... existing code ...
  
  // Store research data if provided
  if (data?.research_data) {
    if (!job.research_data) {
      job.research_data = {};
    }
    Object.assign(job.research_data, data.research_data);
  }
}
```

**Why**: Enables storing intermediate research data in job object as processing progresses.

---

### Phase 2: Store Intermediate Data During Processing

#### 2.1 Store Generated Queries
**File**: `backend/src/services/research.service.ts`

**Location**: After `generateSearchQueries` completes (around line 432)

**Change**:
```typescript
const generatedQueries = await generateSearchQueries(
  request.research_query,
  request.language
);

// Store in job object for polling access
updateJobStatus(jobId, 'processing' as JobStatus, {
  progress: progressPercentages.queries_complete,
  research_data: {
    generated_queries: generatedQueries,
  },
});
```

**Why**: Makes generated queries available via polling immediately after generation.

---

#### 2.2 Store Raw Video Results
**File**: `backend/src/services/research.service.ts`

**Location**: After `searchYouTubeVideosBatch` completes (around line 456)

**Change**:
```typescript
const videoResults = await searchYouTubeVideosBatch(generatedQueries, {
  limit: researchConfig.videos_per_query,
  sortBy: supadataSearchConfig.sort_by,
  duration: supadataSearchConfig.supported_durations[0] as 'short' | 'medium' | 'long',
});

// Store in job object for polling access
updateJobStatus(jobId, 'processing' as JobStatus, {
  progress: progressPercentages.videos_found,
  research_data: {
    raw_video_results: videoResults.map(v => ({
      video_id: v.video_id,
      title: v.title,
      channel: v.channel,
      thumbnail: v.thumbnail,
      duration_seconds: v.duration_seconds,
      view_count: v.view_count,
      upload_date: v.upload_date,
      url: v.url,
    })),
    video_count: videoResults.length,
  },
});
```

**Why**: Makes raw video results available via polling and for debugging.

---

#### 2.3 Store Selected Videos
**File**: `backend/src/services/research.service.ts`

**Location**: After `filterVideos` completes (around line 531)

**Change**:
```typescript
selectedVideos = await filterVideos(
  request.research_query,
  videoResults,
  request.language
);

// Store in job object for polling access
updateJobStatus(jobId, 'fetching' as JobStatus, {
  progress: progressPercentages.videos_selected,
  research_data: {
    selected_videos: selectedVideos,
  },
});
```

**Why**: Makes selected videos available via polling immediately after filtering.

---

### Phase 3: Save Raw Video Results to Research Document

#### 3.1 Update `ResearchCreateData` Interface
**File**: `backend/src/models/Research.ts`

**Change**:
```typescript
export interface ResearchCreateData {
  user_id?: string | null;
  user_uid?: string | null;
  job_id: string;
  research_query: string;
  language: string;
  generated_queries?: string[];
  video_search_results?: any[]; // ADD THIS - VideoSearchResult[]
  selected_videos?: SelectedVideo[];
  source_transcripts?: SourceVideo[];
  final_summary_text: string;
  processing_stats: ResearchProcessingStats;
}
```

**Why**: Allows passing raw video results when creating research document.

---

#### 3.2 Update `createResearch` Function
**File**: `backend/src/models/Research.ts`

**Location**: In the `researchData` object (around line 131)

**Change**:
```typescript
const researchData = {
  [USER_UID_FIELD]: userUid,
  [USER_ID_FIELD]: userUid,
  job_id: data.job_id,
  research_query: data.research_query,
  language: data.language,
  generated_queries: data.generated_queries,
  video_search_results: data.video_search_results, // ADD THIS
  selected_videos: data.selected_videos,
  source_transcripts: data.source_transcripts,
  final_summary_text: data.final_summary_text,
  processing_stats: data.processing_stats,
  created_at: Timestamp.now(),
};
```

**Why**: Actually saves raw video results to Firestore for persistence.

---

#### 3.3 Pass Video Results When Creating Research Document
**File**: `backend/src/services/research.service.ts`

**Location**: When creating `researchData` (around line 685)

**Change**:
```typescript
const researchData: ResearchCreateData = {
  user_uid: userId,
  job_id: jobId,
  research_query: request.research_query,
  language: request.language,
  generated_queries: generatedQueries,
  video_search_results: videoResults.map(v => ({ // ADD THIS
    video_id: v.video_id,
    title: v.title,
    channel: v.channel,
    thumbnail: v.thumbnail,
    duration_seconds: v.duration_seconds,
    view_count: v.view_count,
    upload_date: v.upload_date,
    url: v.url,
  })),
  selected_videos: selectedVideos,
  source_transcripts: sourceTranscripts,
  final_summary_text: finalSummary,
  processing_stats: processingStats,
};
```

**Why**: Ensures raw video results are persisted to database.

---

### Phase 4: Update Status Endpoint to Return Intermediate Data

#### 4.1 Update `buildResearchJobStatusResponse`
**File**: `backend/src/controllers/research.controller.ts`

**Location**: Function starting at line 299

**Change**:
```typescript
async function buildResearchJobStatusResponse(
  jobId: string,
  job: any
): Promise<ResearchProgress> {
  const researchConfig = getResearchConfig();
  const progressPercentages = researchConfig.progress_percentages;

  const currentProgress: ResearchProgress = {
    status: job.status as ResearchProgress['status'],
    progress: job.progress,
    message: getStatusMessage(job.status),
  };

  // Include intermediate data from job object if available
  if (job.research_data) {
    if (job.research_data.generated_queries) {
      currentProgress.generated_queries = job.research_data.generated_queries;
    }
    if (job.research_data.raw_video_results) {
      currentProgress.raw_video_results = job.research_data.raw_video_results;
    }
    if (job.research_data.selected_videos) {
      currentProgress.selected_videos = job.research_data.selected_videos;
    }
    if (job.research_data.video_count !== undefined) {
      currentProgress.video_count = job.research_data.video_count;
    }
  }

  // If job is completed, include research data from database
  if (job.status === 'completed') {
    try {
      const research = await getResearchByJobId(jobId);
      if (research) {
        currentProgress.data = {
          _id: research.id || jobId,
          research_query: research.research_query,
          generated_queries: research.generated_queries || [],
          selected_videos: research.selected_videos || [],
          final_summary_text: research.final_summary_text || '',
          processing_stats: research.processing_stats || {
            total_queries_generated: 0,
            total_videos_searched: 0,
            total_videos_selected: 0,
            total_transcripts_fetched: 0,
          },
          created_at:
            typeof research.created_at === 'string'
              ? new Date(research.created_at)
              : research.created_at,
        };
        
        // Also include raw video results if available
        if (research.video_search_results) {
          currentProgress.raw_video_results = research.video_search_results;
        }
      }
    } catch (error) {
      logger.error('Error fetching research data for job status', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return currentProgress;
}
```

**Why**: Makes intermediate data available via polling at any stage of processing.

---

#### 4.2 Update `ResearchProgress` Interface
**File**: `backend/src/services/research.service.ts`

**Location**: Interface starting at line 65

**Change**:
```typescript
export interface ResearchProgress {
  status: ResearchStatus;
  progress: number;
  message: string;
  generated_queries?: string[];
  video_count?: number;
  raw_video_results?: any[]; // ADD THIS
  selected_videos?: SelectedVideo[];
  chunk?: string;
  data?: {
    _id: string;
    research_query: string;
    generated_queries: string[];
    selected_videos: SelectedVideo[];
    final_summary_text: string;
    processing_stats: ResearchProcessingStats;
    created_at: Date;
  };
  error?: string;
}
```

**Why**: Allows status response to include raw video results.

---

### Phase 5: Improve Status Messages

#### 5.1 Update `getStatusMessage` Function
**File**: `backend/src/controllers/research.controller.ts`

**Location**: Function starting at line 349

**Change**:
```typescript
function getStatusMessage(status: string, job?: any): string {
  // If we have job data, create informative messages
  if (job?.research_data) {
    const data = job.research_data;
    
    switch (status) {
      case 'generating_queries':
        return 'Generating search queries...';
      case 'searching_videos':
        if (data.generated_queries?.length) {
          return `Searching for videos using ${data.generated_queries.length} queries...`;
        }
        return 'Searching for videos...';
      case 'filtering_videos':
        if (data.video_count) {
          return `Filtering ${data.video_count} videos to select the best ${getResearchConfig().target_selected_videos}...`;
        }
        return 'Filtering best videos...';
      case 'fetching_transcripts':
        if (data.selected_videos?.length) {
          return `Fetching transcripts for ${data.selected_videos.length} selected videos...`;
        }
        return 'Fetching transcripts...';
      case 'generating_summary':
        return 'Generating comprehensive research summary...';
      default:
        break;
    }
  }
  
  // Fallback to generic messages
  const messages: Record<string, string> = {
    pending: 'Research job created',
    generating_queries: 'Generating search queries...',
    searching_videos: 'Searching for videos...',
    filtering_videos: 'Filtering best videos...',
    fetching_transcripts: 'Fetching transcripts...',
    generating_summary: 'Generating comprehensive summary...',
    completed: 'Research completed successfully',
    error: 'Research failed',
  };
  return messages[status] || 'Processing...';
}
```

**Update call site** (line 309):
```typescript
message: getStatusMessage(job.status, job),
```

**Why**: Provides informative status messages with actual data counts.

---

#### 5.2 Update Broadcast Messages in `processResearch`
**File**: `backend/src/services/research.service.ts`

**Location**: Multiple `broadcastJobProgress` calls

**Changes**:

1. After queries generated (line 438):
```typescript
broadcastJobProgress(jobId, {
  status: 'searching_videos' as any,
  progress: progressPercentages.queries_complete,
  message: `Generated ${generatedQueries.length} search queries. Searching for videos...`,
  generated_queries: generatedQueries,
} as any);
```

2. After videos found (line 499):
```typescript
broadcastJobProgress(jobId, {
  status: 'filtering_videos' as any,
  progress: progressPercentages.videos_found,
  message: `Found ${videoResults.length} videos. Filtering to select best ${researchConfig.target_selected_videos}...`,
  video_count: videoResults.length,
  raw_video_results: videoResults.map(v => ({
    video_id: v.video_id,
    title: v.title,
    channel: v.channel,
    thumbnail: v.thumbnail,
    duration_seconds: v.duration_seconds,
    view_count: v.view_count,
    upload_date: v.upload_date,
    url: v.url,
  })),
} as any);
```

3. After videos selected (line 580):
```typescript
broadcastJobProgress(jobId, {
  status: 'fetching_transcripts' as any,
  progress: progressPercentages.videos_selected,
  message: `Selected ${selectedVideos.length} videos. Fetching transcripts...`,
  selected_videos: selectedVideos,
} as any);
```

4. After transcripts fetched (line 645):
```typescript
broadcastJobProgress(jobId, {
  status: 'generating_summary' as any,
  progress: progressPercentages.transcripts_ready,
  message: `Fetched ${successfulTranscripts.length} transcripts. Generating comprehensive summary...`,
} as any);
```

**Why**: Provides real-time informative messages via SSE and makes data available.

---

### Phase 6: Update Test Script (Optional Enhancement)

#### 6.1 Improve Test Script Data Collection
**File**: `backend/scripts/test-research.ts`

**Location**: In `watchResearchJobStatus` function

**Enhancement**: The test script already tries to collect this data, but we can add better logging:

```typescript
// Collect generated queries (already exists, but add logging)
if (status.generated_queries && !collectedData.generated_queries) {
  collectedData.generated_queries = status.generated_queries;
  logSuccess(`✓ Generated ${status.generated_queries.length} search queries`);
  logDebug(`Generated queries: ${JSON.stringify(status.generated_queries, null, 2)}`);
}

// Collect raw video results (already exists, but add logging)
if (status.raw_video_results && collectedData.supadata_metadata.length === 0) {
  collectedData.supadata_metadata = status.raw_video_results;
  logSuccess(`✓ Collected ${collectedData.supadata_metadata.length} raw video results from Supadata`);
}
```

**Why**: Better visibility during testing.

---

## Implementation Order

1. **Phase 1**: Extend job object structure (1.1, 1.2)
2. **Phase 2**: Store intermediate data during processing (2.1, 2.2, 2.3)
3. **Phase 3**: Save raw video results to database (3.1, 3.2, 3.3)
4. **Phase 4**: Update status endpoint (4.1, 4.2)
5. **Phase 5**: Improve status messages (5.1, 5.2)
6. **Phase 6**: Test script enhancements (optional)

---

## Testing Checklist

After implementing:

- [ ] Polling shows `generated_queries` immediately after generation
- [ ] Polling shows `raw_video_results` after video search completes
- [ ] Polling shows `selected_videos` after filtering completes
- [ ] Research document contains `video_search_results` field
- [ ] Status messages include actual counts (e.g., "Found 50 videos")
- [ ] Test script collects all intermediate data
- [ ] SSE events include intermediate data
- [ ] Completed research document has all expected fields

---

## Expected Results

After fixes:

1. **Polling is useful**: Can see generated queries, raw results, selected videos at each stage
2. **Raw results saved**: `video_search_results` persisted to database
3. **Generated queries visible**: Available via polling immediately after generation
4. **Informative messages**: "Found 50 videos. Filtering to select best 10..."
5. **Verifiable completion**: Can see exactly what was completed in test data

---

## Files to Modify

1. `backend/src/types/summary.types.ts` - Extend JobInfo interface
2. `backend/src/services/job.service.ts` - Update updateJobStatus
3. `backend/src/services/research.service.ts` - Store intermediate data, save video_search_results
4. `backend/src/models/Research.ts` - Update interfaces and createResearch
5. `backend/src/controllers/research.controller.ts` - Update status response and messages
6. `backend/scripts/test-research.ts` - Optional enhancements

---

## Notes

- All changes are backward compatible (optional fields)
- No breaking changes to existing API contracts
- Intermediate data stored in memory (job object) for real-time access
- Final data persisted to database for long-term storage
- Both polling and SSE benefit from these changes
