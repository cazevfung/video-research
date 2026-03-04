"use client";

import * as React from "react";
import { ProcessingSidebar } from "@/components/dashboard/ProcessingSidebar";
import { UnifiedStreamingContainer } from "@/components/dashboard/UnifiedStreamingContainer";
import { ResultCard } from "@/components/dashboard/ResultCard";
import type { JobStatus } from "@/types";
import { layoutConfig, animationDurations, spacing } from "@/config/visual-effects";
import { cn } from "@/lib/utils";

// Test wrapper components that accept config overrides via CSS custom properties
// This allows real-time config changes without modifying production components

/**
 * Test page for Unified Layout (ProcessingSidebar + ResultCard)
 * Simulates how the whimsical component is displayed during summary generation
 * Allows real-time adjustment of key configs to see visual effects
 * Accessible at /test/layout
 */
export default function LayoutTestPage() {
  const [status, setStatus] = React.useState<JobStatus | "idle" | "connected">("generating");
  const [progress, setProgress] = React.useState(75);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [showSidebar, setShowSidebar] = React.useState(true);
  const [streamedText, setStreamedText] = React.useState<string>("");
  const [streamingResetKey, setStreamingResetKey] = React.useState(0);

  // Config overrides for real-time testing
  const [sidebarWidthDesktop, setSidebarWidthDesktop] = React.useState<string>(layoutConfig.processingSidebar.desktop.width);
  const [sidebarHeightMobile, setSidebarHeightMobile] = React.useState<string>(layoutConfig.processingSidebar.mobile.height);
  const [whimsicalHeightDesktop, setWhimsicalHeightDesktop] = React.useState<string>(layoutConfig.whimsicalContainer.desktop.height);
  const [whimsicalSizeMobile, setWhimsicalSizeMobile] = React.useState<string>(layoutConfig.whimsicalContainer.mobile.width);
  const [containerGapDesktop, setContainerGapDesktop] = React.useState<string>(layoutConfig.unifiedContainer.gap.desktop);
  const [containerGapMobile, setContainerGapMobile] = React.useState<string>(layoutConfig.unifiedContainer.gap.mobile);
  const [containerPaddingDesktop, setContainerPaddingDesktop] = React.useState<string>(layoutConfig.unifiedContainer.padding.desktop);
  const [containerPaddingMobile, setContainerPaddingMobile] = React.useState<string>(layoutConfig.unifiedContainer.padding.mobile);
  const [sidebarSlideInDuration, setSidebarSlideInDuration] = React.useState<number>(animationDurations.sidebarSlideIn);
  const [sidebarSlideOutDuration, setSidebarSlideOutDuration] = React.useState<number>(animationDurations.sidebarSlideOut);
  const [containerFadeInDuration, setContainerFadeInDuration] = React.useState<number>(animationDurations.unifiedContainerFadeIn);
  const [summaryExpansionDuration, setSummaryExpansionDuration] = React.useState<number>(animationDurations.summaryExpansion);

  // Mock summary data
  const mockSummary = React.useMemo(() => ({
    _id: "test-id",
    final_summary_text: "This is a test summary that demonstrates how the unified layout looks during summary generation. The ProcessingSidebar shows the whimsical animation on the left (or top on mobile), while the ResultCard displays the summary content on the right (or below on mobile).\n\n## Key Features\n\n- Fixed-size sidebar that never changes\n- Smooth animations between states\n- Responsive design for desktop and mobile\n- Unified container styling\n\n## Sample Table\n\nHere's an example of how tables are displayed in the summary:\n\n| Feature | Desktop | Mobile |\n|---------|---------|--------|\n| Sidebar Width | 280px | 100% |\n| Sidebar Height | Auto | 140px |\n| Container Gap | 24px | 16px |\n| Animation Duration | 0.3s | 0.3s |\n\n## Sample Mermaid Diagram\n\nHere's an example of how mermaid diagrams are rendered:\n\n```mermaid\ngraph TD\n    A[Start] --> B{Status?}\n    B -->|Idle| C[Show Sidebar]\n    B -->|Generating| D[Show Animation]\n    B -->|Completed| E[Hide Sidebar]\n    C --> F[Display Content]\n    D --> F\n    E --> F\n    F --> G[End]\n```\n\n## Another Table Example\n\nComparison of different layout configurations:\n\n| Config | Default | Custom | Impact |\n|--------|---------|--------|--------|\n| Sidebar Width | 280px | 320px | More space for animation |\n| Container Gap | 24px | 32px | More spacing between elements |\n| Padding | 24px | 16px | Tighter layout |\n\n## Another Mermaid Example\n\n```mermaid\nsequenceDiagram\n    participant User\n    participant Sidebar\n    participant Content\n    User->>Sidebar: Start Generation\n    Sidebar->>Sidebar: Show Animation\n    Sidebar->>Content: Stream Text\n    Content->>Content: Render Markdown\n    Content->>User: Display Summary\n    Sidebar->>Sidebar: Hide on Complete\n```\n\n## Testing\n\nYou can adjust the config values in real-time to see how they affect the layout. Try changing the sidebar width, container gap, or animation durations to find the perfect balance.",
    source_videos: [
      { url: "https://youtube.com/watch?v=test1", title: "Test Video 1", channel: "Test Channel 1" },
      { url: "https://youtube.com/watch?v=test2", title: "Test Video 2", channel: "Test Channel 2" },
    ],
    video_count: 2,
    created_at: new Date().toISOString(),
    batch_title: "Test Summary",
  }), []);

  // Simulate summary with source_videos during streaming (not just after completion)
  // This matches real behavior where source_videos arrive during 'generating' phase
  const mockSummaryForStreaming = React.useMemo(() => {
    if (status === "generating" || status === "completed") {
      // During streaming: include source_videos but NOT final_summary_text (so streamedText is used)
      // After completion: include everything including final_summary_text
      if (status === "generating" && !isCompleted) {
        return {
          ...mockSummary,
          final_summary_text: '', // Empty during streaming; ResultCard uses streamedText
          source_videos: mockSummary.source_videos,
        };
      }
      // After completion, include everything
      return {
        ...mockSummary,
        source_videos: mockSummary.source_videos,
      };
    }
    // Before streaming starts, no summary yet
    return null;
  }, [status, isCompleted, mockSummary]);

  // Streaming simulation: Stream text character by character in chunks
  // Matches backend config: text_chunk_size: 50, chunk_delay_ms: 30
  const streamingIndexRef = React.useRef<number>(0);
  const streamingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const previousIsCompletedRef = React.useRef<boolean>(isCompleted);
  const hasStartedStreamingRef = React.useRef<boolean>(false);
  const lastResetKeyRef = React.useRef<number>(streamingResetKey);
  
  React.useEffect(() => {
    // Clean up any existing interval
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    
    if (status === "generating" && !isCompleted) {
      const fullText = mockSummary.final_summary_text;
      const chunkSize = 50; // Characters per chunk (matches backend config)
      const chunkDelay = 30; // Milliseconds between chunks (matches backend config)
      
      // Check if we're transitioning from completed to generating
      const wasCompleted = previousIsCompletedRef.current;
      previousIsCompletedRef.current = isCompleted;
      
      // Check if reset key changed
      const resetKeyChanged = streamingResetKey !== lastResetKeyRef.current;
      if (resetKeyChanged) {
        lastResetKeyRef.current = streamingResetKey;
      }
      
      // Reset when:
      // 1. Reset key changed (triggered by "Simulate Streaming" button)
      // 2. Transitioning from completed to generating
      // 3. Ref is at or past the end (completed state)
      // 4. Haven't started streaming yet (initial load)
      const shouldReset = 
        resetKeyChanged || 
        wasCompleted ||
        streamingIndexRef.current >= fullText.length ||
        !hasStartedStreamingRef.current;
      
      if (shouldReset) {
        streamingIndexRef.current = 0;
        setStreamedText("");
        setProgress(75); // Start at generating progress
        hasStartedStreamingRef.current = false; // Mark that we're resetting
      }
      
      // Double-check: if still at or past the end after reset, complete immediately
      if (streamingIndexRef.current >= fullText.length) {
        setIsCompleted(true);
        setProgress(100);
        setStreamedText(fullText);
        streamingIndexRef.current = fullText.length;
        hasStartedStreamingRef.current = true;
        return;
      }
      
      // Mark that we've started streaming
      hasStartedStreamingRef.current = true;
      
      // Stream chunks incrementally
      streamingIntervalRef.current = setInterval(() => {
        const currentIndex = streamingIndexRef.current;
        const nextChunk = fullText.slice(currentIndex, currentIndex + chunkSize);
        
        if (nextChunk.length === 0) {
          // Reached end of text
          if (streamingIntervalRef.current) {
            clearInterval(streamingIntervalRef.current);
            streamingIntervalRef.current = null;
          }
          setIsCompleted(true);
          setProgress(100);
          setStreamedText(fullText);
          streamingIndexRef.current = fullText.length;
          return;
        }
        
        // Update streamed text and index
        const newIndex = currentIndex + nextChunk.length;
        streamingIndexRef.current = newIndex;
        setStreamedText(fullText.slice(0, newIndex));
        
        // Update progress: start at 75%, end at 99% (matches real behavior)
        const textProgress = newIndex / fullText.length;
        const progressRange = 99 - 75; // 75% to 99%
        const newProgress = Math.min(75 + (textProgress * progressRange), 99);
        setProgress(newProgress);
      }, chunkDelay);
      
      return () => {
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
      };
    } else if (status === "completed" || isCompleted) {
      // Ensure full text is shown when completed
      setStreamedText(mockSummary.final_summary_text);
      setProgress(100);
      // Set ref to full length so we know it's completed
      // This will trigger reset when switching back to generating
      streamingIndexRef.current = mockSummary.final_summary_text.length;
      previousIsCompletedRef.current = true;
      hasStartedStreamingRef.current = false; // Reset flag so we can restart
    } else {
      // Reset when not generating or completed
      streamingIndexRef.current = 0;
      previousIsCompletedRef.current = false;
      hasStartedStreamingRef.current = false;
      if ((status as string) !== "generating" && (status as string) !== "completed") {
        setStreamedText("");
      }
    }
  }, [status, isCompleted, mockSummary.final_summary_text, streamingResetKey]);

  // Note: For real-time config changes, you would need to modify the components
  // to accept config overrides. For now, this page shows the layout with current
  // config values. To test different configs, modify visual-effects.ts and the
  // page will hot-reload with the new values.

  const statuses: Array<JobStatus | "idle" | "connected"> = [
    "idle",
    "connected",
    "fetching",
    "processing",
    "condensing",
    "aggregating",
    "generating",
    "completed",
    "error",
  ];

  // Copy config to clipboard
  const copyConfigToClipboard = async () => {
    const configText = `// Processing sidebar config
processingSidebar: {
  desktop: {
    width: "${sidebarWidthDesktop}",
    minWidth: "${sidebarWidthDesktop}",
    maxWidth: "${sidebarWidthDesktop}",
  },
  mobile: {
    width: "100%",
    height: "${sidebarHeightMobile}",
    minHeight: "${sidebarHeightMobile}",
    maxHeight: "${sidebarHeightMobile}",
  },
},

// WhimsicalLoader container sizes
whimsicalContainer: {
  desktop: {
    height: "${whimsicalHeightDesktop}",
  },
  mobile: {
    width: "${whimsicalSizeMobile}",
    height: "${whimsicalSizeMobile}",
  },
},

// Unified container spacing
unifiedContainer: {
  gap: {
    desktop: "${containerGapDesktop}",
    mobile: "${containerGapMobile}",
  },
  padding: {
    desktop: "${containerPaddingDesktop}",
    mobile: "${containerPaddingMobile}",
  },
},

// Animation durations
sidebarSlideIn: ${sidebarSlideInDuration},
sidebarSlideOut: ${sidebarSlideOutDuration},
unifiedContainerFadeIn: ${containerFadeInDuration},
summaryExpansion: ${summaryExpansionDuration},`;

    try {
      await navigator.clipboard.writeText(configText);
      alert('Config copied to clipboard! Paste it into visual-effects.ts');
    } catch (err) {
      console.error('Failed to copy config:', err);
      alert('Failed to copy config. Check console for details.');
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg relative">
      {/* Layout Preview - Matches production exactly */}
      <div className={cn(spacing.margin.xl, "w-full")}>
        <UnifiedStreamingContainer
          showSidebar={showSidebar}
          sidebar={
            <ProcessingSidebar
              status={status}
              progress={progress}
              message={status === "generating" ? "Generating summary..." : "Processing..."}
              isStreaming={status === "generating"}
              isCompleted={isCompleted}
              videoCount={2}
              completedVideos={isCompleted ? 2 : 1}
            />
          }
        >
          <ResultCard
            summary={mockSummaryForStreaming}
            streamedText={streamedText}
            isStreaming={status === "generating" && !isCompleted}
            progress={progress}
            title={mockSummary.batch_title}
            submittedUrls={mockSummary.source_videos?.map(v => v.url) || []}
          />
        </UnifiedStreamingContainer>
      </div>

      {/* Floating Controls Panel - Right side, above content */}
      <div className="fixed top-4 right-4 w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto z-50 space-y-4">
        {/* State Controls */}
        <div className="bg-theme-bg-card/95 backdrop-blur-sm border border-theme-border-primary rounded-lg p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
                State Controls
              </h2>
              <div className="space-y-4">
                {/* Status Selection */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value as JobStatus | "idle" | "connected";
                      setStatus(newStatus);
                      if (newStatus === "completed") {
                        setIsCompleted(true);
                        setProgress(100);
                        setStreamedText(mockSummary.final_summary_text);
                      } else if (newStatus === "generating") {
                        setIsCompleted(false);
                        setStreamedText(""); // Reset to start streaming fresh
                        setStreamingResetKey((prev) => prev + 1); // Trigger reset
                      } else {
                        setIsCompleted(false);
                        setStreamedText("");
                      }
                    }}
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Progress Control */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Progress: {Math.round(progress)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Sidebar Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSidebar}
                    onChange={(e) => setShowSidebar(e.target.checked)}
                    className="w-5 h-5 rounded border-theme-border-primary text-theme-fg focus:ring-2 focus:ring-theme-fg"
                  />
                  <span className="text-theme-text-secondary">
                    Show Sidebar
                  </span>
                </label>

                {/* Completion Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={(e) => {
                      setIsCompleted(e.target.checked);
                      if (e.target.checked) {
                        setProgress(100);
                        setStreamedText(mockSummary.final_summary_text); // Show full text when completed
                      }
                    }}
                    className="w-5 h-5 rounded border-theme-border-primary text-theme-fg focus:ring-2 focus:ring-theme-fg"
                  />
                  <span className="text-theme-text-secondary">
                    Completed
                  </span>
                </label>
              </div>
            </div>

        {/* Layout Config Controls */}
        <div className="bg-theme-bg-card/95 backdrop-blur-sm border border-theme-border-primary rounded-lg p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
                Layout Config
              </h2>
              <div className="space-y-4">
                {/* Sidebar Width (Desktop) */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Sidebar Width (Desktop): {sidebarWidthDesktop}
                  </label>
                  <input
                    type="text"
                    value={sidebarWidthDesktop}
                    onChange={(e) => setSidebarWidthDesktop(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary"
                    placeholder="280px"
                  />
                </div>

                {/* Sidebar Height (Mobile) */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Sidebar Height (Mobile): {sidebarHeightMobile}
                  </label>
                  <input
                    type="text"
                    value={sidebarHeightMobile}
                    onChange={(e) => setSidebarHeightMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary"
                    placeholder="140px"
                  />
                </div>

                {/* Whimsical Height (Desktop) */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Whimsical Height (Desktop): {whimsicalHeightDesktop}
                  </label>
                  <input
                    type="text"
                    value={whimsicalHeightDesktop}
                    onChange={(e) => setWhimsicalHeightDesktop(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary"
                    placeholder="240px"
                  />
                </div>

                {/* Whimsical Size (Mobile) */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Whimsical Size (Mobile): {whimsicalSizeMobile}
                  </label>
                  <input
                    type="text"
                    value={whimsicalSizeMobile}
                    onChange={(e) => setWhimsicalSizeMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary"
                    placeholder="140px"
                  />
                </div>

                {/* Container Gap (Desktop) */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Container Gap (Desktop): {containerGapDesktop}
                  </label>
                  <input
                    type="text"
                    value={containerGapDesktop}
                    onChange={(e) => setContainerGapDesktop(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary"
                    placeholder="24px"
                  />
                </div>

                {/* Container Gap (Mobile) */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Container Gap (Mobile): {containerGapMobile}
                  </label>
                  <input
                    type="text"
                    value={containerGapMobile}
                    onChange={(e) => setContainerGapMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary"
                    placeholder="16px"
                  />
                </div>

                {/* Container Padding (Desktop) */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Container Padding (Desktop): {containerPaddingDesktop}
                  </label>
                  <input
                    type="text"
                    value={containerPaddingDesktop}
                    onChange={(e) => setContainerPaddingDesktop(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary"
                    placeholder="24px"
                  />
                </div>

                {/* Container Padding (Mobile) */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Container Padding (Mobile): {containerPaddingMobile}
                  </label>
                  <input
                    type="text"
                    value={containerPaddingMobile}
                    onChange={(e) => setContainerPaddingMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border-primary rounded text-theme-text-primary"
                    placeholder="16px"
                  />
                </div>
              </div>
            </div>

        {/* Animation Config Controls */}
        <div className="bg-theme-bg-card/95 backdrop-blur-sm border border-theme-border-primary rounded-lg p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
                Animation Config
              </h2>
              <div className="space-y-4">
                {/* Sidebar Slide In */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Sidebar Slide In: {sidebarSlideInDuration}s
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={sidebarSlideInDuration}
                    onChange={(e) => setSidebarSlideInDuration(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Sidebar Slide Out */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Sidebar Slide Out: {sidebarSlideOutDuration}s
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={sidebarSlideOutDuration}
                    onChange={(e) => setSidebarSlideOutDuration(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Container Fade In */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Container Fade In: {containerFadeInDuration}s
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={containerFadeInDuration}
                    onChange={(e) => setContainerFadeInDuration(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Summary Expansion */}
                <div>
                  <label className="block text-sm text-theme-text-secondary mb-2">
                    Summary Expansion: {summaryExpansionDuration}s
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={summaryExpansionDuration}
                    onChange={(e) => setSummaryExpansionDuration(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-theme-text-quaternary mt-1">
                    Controls how smoothly the summary expands when sidebar exits
                  </p>
                </div>
              </div>
            </div>

        {/* Quick Actions */}
        <div className="bg-theme-bg-card/95 backdrop-blur-sm border border-theme-border-primary rounded-lg p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <button
                  onClick={copyConfigToClipboard}
                  className="w-full px-4 py-2 bg-theme-fg text-theme-text-inverted rounded hover:opacity-90 transition-opacity font-medium"
                >
                  📋 Copy Config to Clipboard
                </button>
                <button
                  onClick={() => {
                    setSidebarWidthDesktop(layoutConfig.processingSidebar.desktop.width);
                    setSidebarHeightMobile(layoutConfig.processingSidebar.mobile.height);
                    setWhimsicalHeightDesktop(layoutConfig.whimsicalContainer.desktop.height);
                    setWhimsicalSizeMobile(layoutConfig.whimsicalContainer.mobile.width);
                    setContainerGapDesktop(layoutConfig.unifiedContainer.gap.desktop);
                    setContainerGapMobile(layoutConfig.unifiedContainer.gap.mobile);
                    setContainerPaddingDesktop(layoutConfig.unifiedContainer.padding.desktop);
                    setContainerPaddingMobile(layoutConfig.unifiedContainer.padding.mobile);
                    setSidebarSlideInDuration(animationDurations.sidebarSlideIn);
                    setSidebarSlideOutDuration(animationDurations.sidebarSlideOut);
                    setContainerFadeInDuration(animationDurations.unifiedContainerFadeIn);
                    setSummaryExpansionDuration(animationDurations.summaryExpansion);
                  }}
                  className="w-full px-4 py-2 bg-theme-bg-secondary text-theme-text-secondary rounded hover:bg-theme-bg-tertiary transition-colors"
                >
                  Reset to Defaults
                </button>
                <button
                  onClick={() => {
                    setStatus("generating");
                    setIsCompleted(false);
                    setShowSidebar(true);
                    setStreamedText(""); // Reset streamed text to start fresh
                    setStreamingResetKey((prev) => prev + 1); // Trigger reset in effect
                  }}
                  className="w-full px-4 py-2 bg-theme-bg-secondary text-theme-text-secondary rounded hover:bg-theme-bg-tertiary transition-colors"
                >
                  Simulate Streaming
                </button>
                <button
                  onClick={() => {
                    setStatus("completed");
                    setProgress(100);
                    setIsCompleted(true);
                    setStreamedText(mockSummary.final_summary_text); // Show full text immediately
                  }}
                  className="w-full px-4 py-2 bg-theme-bg-secondary text-theme-text-secondary rounded hover:bg-theme-bg-tertiary transition-colors"
                >
                  Simulate Completed
                </button>
              </div>
            </div>
      </div>
    </div>
  );
}
