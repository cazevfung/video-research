"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResearchProgressSidebar } from "@/components/research/ResearchProgressSidebar";
import { UnifiedStreamingContainer } from "@/components/dashboard/UnifiedStreamingContainer";
import { ResearchResultCard } from "@/components/research/ResearchResultCard";
import { QuestionApprovalCard } from "@/components/research/QuestionApprovalCard";
import { SearchTermApprovalCard } from "@/components/research/SearchTermApprovalCard";
import { VideoApprovalCard } from "@/components/research/VideoApprovalCard";
import type { ResearchStatus, SelectedVideo } from "@/types";
import { layoutConfig, animationDurations, spacing, researchParticleConfig } from "@/config/visual-effects";
import { cn } from "@/lib/utils";

/**
 * Test page for Smart Research Layout (ResearchProgressSidebar + Content Area)
 * Simulates how the smart research page layout works during different workflow stages
 * 
 * Features:
 * - Shows UnifiedStreamingContainer with ResearchProgressSidebar
 * - Displays different content areas based on state (approval cards, result card)
 * - Simulates workflow states (generating questions, search terms, videos, summary)
 * - Simulates streaming behavior for questions, search terms, and summary
 * - Config controls for reference (components use configs from visual-effects.ts)
 * 
 * Note: Config values are stored for reference/testing. Components use configs
 * directly from visual-effects.ts. To test different configs, modify visual-effects.ts
 * and the page will hot-reload with the new values.
 * 
 * Accessible at /test/research-layout
 */
export default function ResearchLayoutTestPage() {
  const [status, setStatus] = React.useState<ResearchStatus>("generating_questions");
  const [progress, setProgress] = React.useState(10);
  const [showSidebar, setShowSidebar] = React.useState(true);
  const [streamedText, setStreamedText] = React.useState<string>("");
  const [streamingResetKey, setStreamingResetKey] = React.useState(0);

  // Mock data for different stages
  const [questions, setQuestions] = React.useState<string[]>([
    "What are the latest developments in AI healthcare?",
    "How does AI improve medical diagnosis accuracy?",
    "What are the challenges in implementing AI in healthcare?",
  ]);
  const [partialQuestions, setPartialQuestions] = React.useState<string[]>([]);
  const [isStreamingQuestions, setIsStreamingQuestions] = React.useState(false);

  const [searchTerms, setSearchTerms] = React.useState<string[]>([
    "AI healthcare diagnosis",
    "Medical AI accuracy",
    "Healthcare AI 2026",
    "AI diagnostic tools",
    "Medical AI research",
  ]);
  const [partialSearchTerms, setPartialSearchTerms] = React.useState<string[]>([]);
  const [isStreamingSearchTerms, setIsStreamingSearchTerms] = React.useState(false);

  const [selectedVideos, setSelectedVideos] = React.useState<SelectedVideo[]>([
    {
      video_id: "test1",
      title: "AI in Healthcare: Latest Developments",
      channel: "Tech Channel",
      thumbnail: "https://i.ytimg.com/vi/test1/default.jpg",
      duration_seconds: 600,
      url: "https://youtube.com/watch?v=test1",
      classification: "Direct",
      why_selected: "Directly addresses the research query",
      fills_gap: "Provides current information on AI healthcare",
    },
    {
      video_id: "test2",
      title: "Medical AI: Challenges and Opportunities",
      channel: "Health Tech",
      thumbnail: "https://i.ytimg.com/vi/test2/default.jpg",
      duration_seconds: 720,
      url: "https://youtube.com/watch?v=test2",
      classification: "Foundational",
      why_selected: "Provides foundational knowledge",
      fills_gap: "Explains core concepts",
    },
  ]);

  const [generatedQueries, setGeneratedQueries] = React.useState<string[]>([]);
  const [rawVideoResults, setRawVideoResults] = React.useState<Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration_seconds: number;
    view_count: number;
    upload_date: string;
    url: string;
  }>>([]);

  // Config overrides for real-time testing
  const [sidebarWidthDesktop, setSidebarWidthDesktop] = React.useState<string>(layoutConfig.processingSidebar.desktop.width);
  const [sidebarHeightMobile, setSidebarHeightMobile] = React.useState<string>(layoutConfig.processingSidebar.mobile.height);
  const [whimsicalHeightDesktop, setWhimsicalHeightDesktop] = React.useState<string>(layoutConfig.whimsicalContainer.desktop.height);
  const [whimsicalSizeMobile, setWhimsicalSizeMobile] = React.useState<string>(layoutConfig.whimsicalContainer.mobile.width);
  const [containerGapDesktop, setContainerGapDesktop] = React.useState<string>(layoutConfig.unifiedContainer.gap.desktop);
  const [containerGapMobile, setContainerGapMobile] = React.useState<string>(layoutConfig.unifiedContainer.gap.mobile);
  const [containerPaddingDesktop, setContainerPaddingDesktop] = React.useState<string>(layoutConfig.unifiedContainer.padding.desktop);
  const [containerPaddingMobile, setContainerPaddingMobile] = React.useState<string>(layoutConfig.unifiedContainer.padding.mobile);
  const [stateTransitionDuration, setStateTransitionDuration] = React.useState<number>(researchParticleConfig.animationTiming.stateTransition);

  // Mock research data
  const mockResearch = React.useMemo(() => ({
    _id: "test-id",
    research_query: "AI in Healthcare",
    language: "en",
    final_summary_text: `# AI in Healthcare: Latest Developments

AI has revolutionized healthcare in recent years, bringing transformative changes to diagnosis, treatment, and patient care.

## Key Developments

### Diagnostic Accuracy
AI-powered diagnostic tools have shown remarkable improvements in accuracy, particularly in medical imaging. These systems can detect anomalies that might be missed by human eyes.

### Treatment Personalization
Machine learning algorithms analyze patient data to create personalized treatment plans, improving outcomes and reducing side effects.

### Challenges
Despite the promise, implementing AI in healthcare faces several challenges:
- Data privacy concerns
- Regulatory hurdles
- Integration with existing systems
- Cost of implementation

## Future Outlook

The future of AI in healthcare looks promising, with ongoing research focusing on improving accuracy, reducing costs, and ensuring ethical implementation.`,
    selected_videos: selectedVideos,
    created_at: new Date().toISOString(),
  }), [selectedVideos]);

  // Mock summary for streaming
  const mockSummaryForStreaming = React.useMemo(() => {
    if (status === "generating_summary" || status === "completed") {
      if (status === "generating_summary" && streamedText.length < mockResearch.final_summary_text.length) {
        return {
          ...mockResearch,
          final_summary_text: '', // Empty during streaming; ResearchResultCard uses streamedText
        };
      }
      return mockResearch;
    }
    return null;
  }, [status, streamedText, mockResearch]);

  // Simulate streaming for summary
  const streamingIndexRef = React.useRef<number>(0);
  const streamingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  
  React.useEffect(() => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    
    if (status === "generating_summary" && streamedText.length < mockResearch.final_summary_text.length) {
      const fullText = mockResearch.final_summary_text;
      const chunkSize = 50;
      const chunkDelay = 30;
      
      const shouldReset = streamingResetKey !== streamingIndexRef.current || streamingIndexRef.current >= fullText.length;
      if (shouldReset) {
        streamingIndexRef.current = 0;
        setStreamedText("");
        setProgress(85);
      }
      
      streamingIntervalRef.current = setInterval(() => {
        const currentIndex = streamingIndexRef.current;
        const nextChunk = fullText.slice(currentIndex, currentIndex + chunkSize);
        
        if (nextChunk.length === 0) {
          if (streamingIntervalRef.current) {
            clearInterval(streamingIntervalRef.current);
            streamingIntervalRef.current = null;
          }
          setStatus("completed");
          setProgress(100);
          setStreamedText(fullText);
          streamingIndexRef.current = fullText.length;
          return;
        }
        
        const newIndex = currentIndex + nextChunk.length;
        streamingIndexRef.current = newIndex;
        setStreamedText(fullText.slice(0, newIndex));
        
        const textProgress = newIndex / fullText.length;
        const progressRange = 99 - 85;
        const newProgress = Math.min(85 + (textProgress * progressRange), 99);
        setProgress(newProgress);
      }, chunkDelay);
      
      return () => {
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
      };
    } else if (status === "completed") {
      setStreamedText(mockResearch.final_summary_text);
      setProgress(100);
      streamingIndexRef.current = mockResearch.final_summary_text.length;
    } else {
      streamingIndexRef.current = 0;
      if ((status as string) !== "generating_summary" && (status as string) !== "completed") {
        setStreamedText("");
      }
    }
  }, [status, mockResearch.final_summary_text, streamingResetKey]);

  // Simulate streaming for questions
  React.useEffect(() => {
    if (status === "generating_questions" && !isStreamingQuestions) {
      setIsStreamingQuestions(true);
      setPartialQuestions([]);
      
      const fullQuestions = questions;
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        if (currentIndex < fullQuestions.length) {
          setPartialQuestions(fullQuestions.slice(0, currentIndex + 1));
          currentIndex++;
          setProgress(5 + (currentIndex / fullQuestions.length) * 5);
        } else {
          clearInterval(interval);
          setIsStreamingQuestions(false);
          setStatus("awaiting_question_approval");
          setProgress(10);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [status, questions, isStreamingQuestions]);

  // Simulate streaming for search terms
  React.useEffect(() => {
    if (status === "generating_search_terms" && !isStreamingSearchTerms) {
      setIsStreamingSearchTerms(true);
      setPartialSearchTerms([]);
      
      const fullTerms = searchTerms;
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        if (currentIndex < fullTerms.length) {
          setPartialSearchTerms(fullTerms.slice(0, currentIndex + 1));
          currentIndex++;
          setProgress(20 + (currentIndex / fullTerms.length) * 5);
        } else {
          clearInterval(interval);
          setIsStreamingSearchTerms(false);
          setStatus("awaiting_search_term_approval");
          setProgress(25);
        }
      }, 800);
      
      return () => clearInterval(interval);
    }
  }, [status, searchTerms, isStreamingSearchTerms]);

  // Determine content area based on state
  // Approval cards show during both generation and approval stages
  const getContentArea = () => {
    if (
      status === "generating_questions" ||
      status === "awaiting_question_approval" ||
      status === "generating_search_terms" ||
      status === "awaiting_search_term_approval" ||
      status === "awaiting_video_approval"
    ) {
      return "approval";
    }
    if (status === "generating_summary" || status === "completed") {
      return "result";
    }
    return "processing";
  };

  const contentArea = getContentArea();
  const showUnifiedContainer = status !== "idle";

  // Status options
  const statuses: ResearchStatus[] = [
    "idle",
    "generating_questions",
    "awaiting_question_approval",
    "generating_search_terms",
    "awaiting_search_term_approval",
    "searching_videos",
    "filtering_videos",
    "awaiting_video_approval",
    "fetching_transcripts",
    "generating_summary",
    "completed",
  ];

  // Get status message
  const getStatusMessage = (): string | null => {
    switch (status) {
      case "generating_questions":
        return "Generating research questions...";
      case "awaiting_question_approval":
        return "Awaiting question approval";
      case "generating_search_terms":
        return "Generating search terms...";
      case "awaiting_search_term_approval":
        return "Awaiting search term approval";
      case "searching_videos":
        return "Searching for videos...";
      case "filtering_videos":
        return "Filtering videos...";
      case "awaiting_video_approval":
        return "Awaiting video approval";
      case "fetching_transcripts":
        return "Fetching transcripts...";
      case "generating_summary":
        return "Generating summary...";
      case "completed":
        return "Research completed";
      default:
        return null;
    }
  };

  // Mock handlers
  const handleApproveQuestions = async () => {
    setStatus("generating_search_terms");
    setProgress(15);
  };

  const handleRequestChangesQuestions = async () => {
    setStatus("generating_questions");
    setProgress(5);
    setIsStreamingQuestions(false);
  };

  const handleApproveSearchTerms = async () => {
    setStatus("searching_videos");
    setProgress(30);
  };

  const handleRequestChangesSearchTerms = async () => {
    setStatus("generating_search_terms");
    setProgress(20);
    setIsStreamingSearchTerms(false);
  };

  const handleApproveVideos = async () => {
    setStatus("fetching_transcripts");
    setProgress(50);
  };

  const handleRequestChangesVideos = async () => {
    setStatus("filtering_videos");
    setProgress(45);
  };

  return (
    <div className="min-h-screen bg-theme-bg relative">
      {/* Layout Preview - Matches production exactly */}
      {!showUnifiedContainer && (
        <div className={cn(spacing.margin.xl, "w-full flex items-center justify-center min-h-[60vh]")}>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-theme-text-primary mb-2">
              Smart Research Layout Test
            </h2>
            <p className="text-theme-text-secondary mb-4">
              Select a status from the controls panel to see the layout simulation
            </p>
          </div>
        </div>
      )}
      {showUnifiedContainer && (
        <div className={cn(spacing.margin.xl, "w-full")}>
          <UnifiedStreamingContainer
            showSidebar={showSidebar}
            sidebar={
              <ResearchProgressSidebar
                status={status}
                progress={progress}
                message={getStatusMessage()}
                generatedQueries={generatedQueries}
                rawVideoResults={rawVideoResults}
                selectedVideos={selectedVideos}
                videoCount={rawVideoResults.length || selectedVideos.length}
              />
            }
          >
            {/* Content Area: Dynamic based on state */}
            <AnimatePresence mode="wait">
              {contentArea === "approval" ? (
                <motion.div
                  key="approval-content"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    duration: stateTransitionDuration,
                    ease: "easeOut",
                  }}
                  className="space-y-6"
                >
                  {/* Question Approval */}
                  {(status === "awaiting_question_approval" || status === "generating_questions") && (
                    <QuestionApprovalCard
                      questions={questions}
                      researchQuery={mockResearch.research_query}
                      feedbackCount={0}
                      isProcessing={false}
                      onApprove={handleApproveQuestions}
                      onRequestChanges={handleRequestChangesQuestions}
                      isStreaming={isStreamingQuestions}
                      partialQuestions={partialQuestions}
                    />
                  )}

                  {/* Search Term Approval */}
                  {(status === "awaiting_search_term_approval" || status === "generating_search_terms") && (
                    <SearchTermApprovalCard
                      searchTerms={searchTerms}
                      researchQuery={mockResearch.research_query}
                      questions={questions}
                      feedbackCount={0}
                      isProcessing={false}
                      onApprove={handleApproveSearchTerms}
                      onRequestChanges={handleRequestChangesSearchTerms}
                      isStreaming={isStreamingSearchTerms}
                      partialSearchTerms={partialSearchTerms}
                    />
                  )}

                  {/* Video Approval */}
                  {status === "awaiting_video_approval" && (
                    <VideoApprovalCard
                      videos={selectedVideos}
                      researchQuery={mockResearch.research_query}
                      questions={questions}
                      feedbackCount={0}
                      isProcessing={false}
                      onApprove={handleApproveVideos}
                      onRequestChanges={handleRequestChangesVideos}
                    />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="result-content"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{
                    duration: stateTransitionDuration,
                    ease: "easeOut",
                  }}
                >
                  <ResearchResultCard
                    research={mockSummaryForStreaming}
                    streamedText={streamedText}
                    isStreaming={status === "generating_summary"}
                    progress={progress}
                    title={mockResearch.research_query}
                    selectedVideos={selectedVideos}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </UnifiedStreamingContainer>
        </div>
      )}

      {/* Floating Controls Panel - Right side */}
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
                  const newStatus = e.target.value as ResearchStatus;
                  setStatus(newStatus);
                  if (newStatus === "completed") {
                    setProgress(100);
                    setStreamedText(mockResearch.final_summary_text);
                  } else if (newStatus === "generating_summary") {
                    setStreamedText("");
                    setStreamingResetKey((prev) => prev + 1);
                  } else if (newStatus === "generating_questions") {
                    setIsStreamingQuestions(false);
                    setPartialQuestions([]);
                    setProgress(5);
                  } else if (newStatus === "generating_search_terms") {
                    setIsStreamingSearchTerms(false);
                    setPartialSearchTerms([]);
                    setProgress(20);
                  } else {
                    setStreamedText("");
                    setIsStreamingQuestions(false);
                    setIsStreamingSearchTerms(false);
                    setPartialQuestions([]);
                    setPartialSearchTerms([]);
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
              <span className="text-theme-text-secondary">Show Sidebar</span>
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
            {/* State Transition Duration */}
            <div>
              <label className="block text-sm text-theme-text-secondary mb-2">
                State Transition: {stateTransitionDuration}s
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={stateTransitionDuration}
                onChange={(e) => setStateTransitionDuration(Number(e.target.value))}
                className="w-full"
              />
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
              onClick={() => {
                setSidebarWidthDesktop(layoutConfig.processingSidebar.desktop.width);
                setSidebarHeightMobile(layoutConfig.processingSidebar.mobile.height);
                setWhimsicalHeightDesktop(layoutConfig.whimsicalContainer.desktop.height);
                setWhimsicalSizeMobile(layoutConfig.whimsicalContainer.mobile.width);
                setContainerGapDesktop(layoutConfig.unifiedContainer.gap.desktop);
                setContainerGapMobile(layoutConfig.unifiedContainer.gap.mobile);
                setContainerPaddingDesktop(layoutConfig.unifiedContainer.padding.desktop);
                setContainerPaddingMobile(layoutConfig.unifiedContainer.padding.mobile);
                setStateTransitionDuration(researchParticleConfig.animationTiming.stateTransition);
              }}
              className="w-full px-4 py-2 bg-theme-bg-secondary text-theme-text-secondary rounded hover:bg-theme-bg-tertiary transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => {
                setStatus("generating_questions");
                setProgress(5);
                setIsStreamingQuestions(false);
                setPartialQuestions([]);
              }}
              className="w-full px-4 py-2 bg-theme-bg-secondary text-theme-text-secondary rounded hover:bg-theme-bg-tertiary transition-colors"
            >
              Simulate Question Generation
            </button>
            <button
              onClick={() => {
                setStatus("generating_search_terms");
                setProgress(20);
                setIsStreamingSearchTerms(false);
                setPartialSearchTerms([]);
              }}
              className="w-full px-4 py-2 bg-theme-bg-secondary text-theme-text-secondary rounded hover:bg-theme-bg-tertiary transition-colors"
            >
              Simulate Search Term Generation
            </button>
            <button
              onClick={() => {
                setStatus("generating_summary");
                setProgress(85);
                setStreamedText("");
                setStreamingResetKey((prev) => prev + 1);
              }}
              className="w-full px-4 py-2 bg-theme-bg-secondary text-theme-text-secondary rounded hover:bg-theme-bg-tertiary transition-colors"
            >
              Simulate Summary Streaming
            </button>
            <button
              onClick={() => {
                setStatus("completed");
                setProgress(100);
                setStreamedText(mockResearch.final_summary_text);
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
