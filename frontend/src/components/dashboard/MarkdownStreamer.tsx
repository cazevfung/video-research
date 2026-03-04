"use client";

import * as React from "react";
import { Component, ErrorInfo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, useReducedMotion } from "framer-motion";
import { animationDurations, layoutConfig, markdownConfig, streamingConfig, colors, spacing, typography, borderRadius } from "@/config/visual-effects";
import { infoMessages, markdownMessages } from "@/config/messages";

// Phase 1: Centralized configuration constants (Phase 5: from config, not hardcoded)
const MAX_CONTENT_LENGTH = streamingConfig.content.maxLength;
const TRUNCATION_MESSAGE = streamingConfig.content.truncationMessage;

/** Fullwidth asterisk (U+FF0A ＊) used in CJK contexts; markdown only recognizes ASCII * (U+002A). */
const FULLWIDTH_ASTERISK = "\uFF0A";

/**
 * Normalize fullwidth asterisks to ASCII so bold parses correctly.
 * - **text** (ASCII) and ＊＊text＊＊ (fullwidth) both become **text** and render bold.
 * - Mixed runs like ＊*text*＊ also normalize to **text** and render bold.
 * - Mismatched counts (e.g. ＊text**) stay as *text** and do not render bold.
 */
function normalizeFullwidthAsterisks(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text.split(FULLWIDTH_ASTERISK).join("*");
}

/** Convert a leading line that is only **bold** into # headline so it renders as H1. */
function normalizeBoldHeadlineToH1(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text.replace(/^\s*\*\*(.+?)\*\*(\s*(?:\r?\n|$))/, "# $1$2");
}
import { Code } from "@/components/ui/Code";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { slugify } from "@/utils/markdown";
import { CitationTextProcessor } from "@/components/research/citations/CitationTextProcessor";
import { CitationTooltip } from "@/components/research/citations";
import { useCitation } from "@/contexts/CitationContext";
import { isSourcesHeading } from "@/utils/citationParser";

/** Phase 5: Error boundary for markdown rendering – fallback to plain text on parse/render errors */
class MarkdownErrorBoundary extends Component<
  { content: string; onError?: (err: Error) => void; fallbackMessage: string; children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_LOG_MARKDOWN_ERRORS === "true") {
      console.error("[MarkdownStreamer] Markdown parse/render error:", error, errorInfo);
    }
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={cn(colors.text.primary, "space-y-2")}>
          <p className={cn(typography.fontSize.sm, colors.text.muted)}>{this.props.fallbackMessage}</p>
          {this.props.content ? (
            <pre className={cn("whitespace-pre-wrap break-words font-sans", typography.fontSize.sm, colors.text.primary)}>
              {this.props.content}
            </pre>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

interface MarkdownStreamerProps {
  content: string;
  isStreaming: boolean;
  /** Phase 5: Called when markdown fails to render (e.g. for toast). */
  onError?: (err: Error) => void;
}

/**
 * MarkdownStreamer Component
 * Renders streaming markdown content with animations and typing cursor
 * Matches PRD Section 4.2.2 and 4.2.4 specifications
 * 
 * Phase 4: Enhanced with Animate UI components, text chunk animations, and scroll management
 * Phase 1: Text Flashing Fix - Optimized rendering strategy to eliminate text flashing
 * Phase 2: Component Updates - Updated renderers with new markdown config
 * Phase 3: Context Tracking - State-based heading hierarchy tracking with proper resets
 * Phase 3: Integration & Testing - Edge case handling, accessibility, and performance optimizations
 * 
 * Key Features:
 * - Incremental content rendering to prevent text flashing
 * - Separate rendering for existing vs new content
 * - Completion animation when streaming stops
 * - Scroll management with auto-scroll detection
 * - Accessibility support (reduced motion preferences)
 * - Edge case handling (empty content, long content, rapid updates)
 * 
 * Performance Optimizations:
 * - Debounced content updates (50ms) with requestAnimationFrame batching
 * - Memoized content extraction to prevent unnecessary re-renders
 * - React.memo with custom comparison function
 * - Content length tracking to avoid re-rendering existing content
 * 
 * Edge Cases Handled:
 * - Content reset (new summary starts)
 * - Empty content
 * - Very long content (>50K characters)
 * - Rapid content updates
 * - Network interruptions (handled by parent)
 */
const MarkdownStreamer = React.memo(function MarkdownStreamer({
  content,
  isStreaming,
  onError,
}: MarkdownStreamerProps) {
  const { t } = useTranslation(['research', 'summary']);
  const shouldReduceMotion = useReducedMotion();
  // Normalize: fullwidth asterisks (＊＊) → ASCII so bold parses; then **Headline** → # Headline for first line
  const normalizedContent = React.useMemo(
    () => normalizeBoldHeadlineToH1(normalizeFullwidthAsterisks(content)),
    [content]
  );
  // Removed scroll tracking - summary expands naturally without creating scroll containers
  
  // Theme detection for conditional prose-invert class
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Phase 1: Track the length of content that has been fully rendered
  const lastRenderedLengthRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);

  // Phase 3: Context tracking for markdown structure
  // Use refs to track state across ReactMarkdown component renders
  // Flexible detection: works with any markdown structure, not just H1->H2->H3
  // State-based tracking using refs (better performance than useState in renderers)
  const markdownContextRef = React.useRef<{
    isInIntroduction: boolean;
    isInSubsection: boolean;
    hasSeenH2: boolean;
    hasSeenH1: boolean;
    paragraphCount: number;
    lastHeadingLevel: number; // Track last heading level (1, 2, 3, etc.)
    headingStack: Array<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>; // Track heading hierarchy
    hasRenderedContent: boolean; // Track if any content has been rendered (for removing top margin from first element)
  }>({
    isInIntroduction: true, // Start assuming we're in introduction
    isInSubsection: false,
    hasSeenH2: false,
    hasSeenH1: false,
    paragraphCount: 0,
    lastHeadingLevel: 0, // 0 means no heading seen yet
    headingStack: [], // Track heading hierarchy for context
    hasRenderedContent: false, // No content rendered yet
  });

  // Phase 1: Optimized debounce with requestAnimationFrame batching
  const [debouncedContent, setDebouncedContent] = React.useState(content);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Phase 1: Reset rendered length when content is reset (new summary starts)
  // Phase 3: Edge case - Handle content reset gracefully
  React.useEffect(() => {
    if (content.length < lastRenderedLengthRef.current) {
      // Content decreased - new summary started, reset tracking
      lastRenderedLengthRef.current = 0;
    }
  }, [content]);

  // Phase 1: Optimized debounce with requestAnimationFrame batching
  React.useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Throttle updates using config value (default: 50ms)
    debounceTimerRef.current = setTimeout(() => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      rafRef.current = requestAnimationFrame(() => {
        setDebouncedContent(normalizedContent);
      });
    }, animationDurations.markdownDebounce * 1000); // Convert to milliseconds

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [normalizedContent]);

  // Helper function to detect if content ends with an incomplete code block
  // This is critical for Mermaid diagrams - if a code block is split across
  // existingContent and newContent boundaries, ReactMarkdown will parse them
  // as two separate incomplete blocks, preventing Mermaid from rendering
  const detectIncompleteCodeBlock = React.useCallback((content: string): { hasIncomplete: boolean; codeBlockStart: number } => {
    if (!content) return { hasIncomplete: false, codeBlockStart: -1 };
    
    // Find the last occurrence of ``` (code block start)
    // We need to find the actual start, not just any ```
    let lastCodeBlockStart = -1;
    let searchStart = 0;
    
    // Find all code block starts
    while (true) {
      const nextStart = content.indexOf('```', searchStart);
      if (nextStart === -1) break;
      lastCodeBlockStart = nextStart;
      searchStart = nextStart + 3;
    }
    
    if (lastCodeBlockStart === -1) {
      return { hasIncomplete: false, codeBlockStart: -1 };
    }
    
    // Check if there's a closing ``` after the start
    const afterStart = content.slice(lastCodeBlockStart + 3);
    const closingIndex = afterStart.indexOf('```');
    
    // If no closing found, it's incomplete
    if (closingIndex === -1) {
      return { hasIncomplete: true, codeBlockStart: lastCodeBlockStart };
    }
    
    // Check if the closing is at the very end
    // Only consider it incomplete if we're streaming AND there's no content after closing
    const afterClosing = afterStart.slice(closingIndex + 3);
    const trimmedAfterClosing = afterClosing.trim();
    
    // If closing is at the very end with no content after, it might be incomplete during streaming
    // But we need to be careful - a complete block might end with just whitespace
    // Only mark as incomplete if there's literally nothing after the closing ```
    if (afterClosing.length === 0) {
      // This is at the very end - could be incomplete if streaming
      return { hasIncomplete: true, codeBlockStart: lastCodeBlockStart };
    }
    
    // If there's content after closing, it's definitely complete
    return { hasIncomplete: false, codeBlockStart: -1 };
  }, []);

  // Phase 1: Extract existing and new content separately
  // Phase 3: Edge case handling - Gracefully handle content resets and empty content
  // CRITICAL FIX: Handle incomplete code blocks (especially Mermaid) at split boundary
  // Use ref value directly (not as dependency) since refs don't trigger re-renders
  // The ref tracks the length of content that was rendered in the previous render
  const existingContent = React.useMemo(() => {
    const lastRendered = lastRenderedLengthRef.current;
    // Phase 3: Edge case - If content decreased (new summary started), reset tracking
    if (debouncedContent.length < lastRendered) {
      return '';
    }
    // Phase 3: Edge case - Handle empty content
    if (debouncedContent.length === 0 || lastRendered === 0) {
      return '';
    }
    
    const sliced = debouncedContent.slice(0, lastRendered);
    
    // CRITICAL FIX: If existingContent ends with an incomplete code block,
    // we need to exclude it from existingContent and include it in newContent instead.
    // This prevents ReactMarkdown from parsing two separate incomplete code blocks.
    // By including the incomplete block in newContent (starting from its beginning),
    // ReactMarkdown can parse it as one complete block as more content streams in.
    // This ensures Mermaid diagrams render during streaming instead of only after completion.
    const incompleteCheck = detectIncompleteCodeBlock(sliced);
    if (incompleteCheck.hasIncomplete && isStreaming) {
      // Cut existingContent at the start of the incomplete code block
      // The incomplete block will be included in newContent instead
      return sliced.slice(0, incompleteCheck.codeBlockStart);
    }
    
    return sliced;
  }, [debouncedContent, isStreaming, detectIncompleteCodeBlock]);

  const newContent = React.useMemo(() => {
    const lastRendered = lastRenderedLengthRef.current;
    // Phase 3: Edge case - If content decreased (new summary started), show all as new
    if (debouncedContent.length < lastRendered) {
      return debouncedContent;
    }
    // Phase 3: Edge case - Handle empty content
    if (debouncedContent.length === 0) {
      return '';
    }
    
    const sliced = debouncedContent.slice(lastRendered);
    
    // CRITICAL FIX: If existingContent ends with an incomplete code block,
    // we need to include the FULL incomplete block in newContent (starting from
    // where the incomplete block begins) so ReactMarkdown can parse it as one
    // complete block. This ensures Mermaid diagrams render during streaming.
    const existingSlice = debouncedContent.slice(0, lastRendered);
    const incompleteCheck = detectIncompleteCodeBlock(existingSlice);
    if (incompleteCheck.hasIncomplete && isStreaming) {
      // Start newContent from the beginning of the incomplete code block
      // This way ReactMarkdown will see the complete block (incomplete part + new content)
      // and can parse it correctly, allowing Mermaid to render during streaming
      const incompleteBlockStart = incompleteCheck.codeBlockStart;
      return debouncedContent.slice(incompleteBlockStart);
    }
    
    return sliced;
  }, [debouncedContent, isStreaming, detectIncompleteCodeBlock]);

  // Phase 1: Update rendered length after content has been rendered
  // Use layout effect to update after DOM has been updated
  // Note: We update to the actual rendered length, which may be adjusted
  // by the incomplete code block detection logic in existingContent/newContent
  React.useLayoutEffect(() => {
    // Update rendered length to current content length after render
    // The incomplete code block detection in existingContent/newContent will
    // handle adjusting the split point to avoid splitting code blocks
    lastRenderedLengthRef.current = debouncedContent.length;
  }, [debouncedContent]);

  // Phase 1: Memoize parsed markdown for existing content
  const parsedExistingContent = React.useMemo(() => {
    if (!existingContent) return '';
    const contentToParse = existingContent.length > MAX_CONTENT_LENGTH
      ? existingContent.slice(0, MAX_CONTENT_LENGTH) + TRUNCATION_MESSAGE
      : existingContent;
    return contentToParse;
  }, [existingContent]);

  // Phase 1: Memoize parsed markdown for new content
  const parsedNewContent = React.useMemo(() => {
    if (!newContent) return '';
    const contentToParse = newContent.length > MAX_CONTENT_LENGTH
      ? newContent.slice(0, MAX_CONTENT_LENGTH) + TRUNCATION_MESSAGE
      : newContent;
    return contentToParse;
  }, [newContent]);

  // Removed scroll tracking and auto-scroll - summary expands naturally without scroll containers

  // Phase 1: Animation configuration for new content (subtle fade-in)
  const shouldAnimateNewContent = isStreaming && !shouldReduceMotion;
  const newContentAnimation = shouldAnimateNewContent
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: animationDurations.newChunkFadeIn, ease: "easeOut" as const },
      }
    : {};

  // Phase 1: Completion animation (when streaming stops)
  const shouldAnimateCompletion = !isStreaming && debouncedContent.length > 0;
  
  // Phase 1: When streaming completes, merge all content for completion animation
  const fullContentForCompletion = React.useMemo(() => {
    if (!shouldAnimateCompletion) return null;
    const contentToParse = debouncedContent.length > MAX_CONTENT_LENGTH
      ? debouncedContent.slice(0, MAX_CONTENT_LENGTH) + TRUNCATION_MESSAGE
      : debouncedContent;
    return contentToParse;
  }, [shouldAnimateCompletion, debouncedContent]);

  // Phase 3: Reset markdown context when content resets
  // Ensures context tracking is properly reset for new summaries
  React.useEffect(() => {
    if (content.length < lastRenderedLengthRef.current || content.length === 0) {
      // Content reset or empty - reset context tracking to initial state
      markdownContextRef.current = {
        isInIntroduction: true,
        isInSubsection: false,
        hasSeenH2: false,
        hasSeenH1: false,
        paragraphCount: 0,
        lastHeadingLevel: 0,
        headingStack: [],
        hasRenderedContent: false,
      };
    }
  }, [content]);

  // Phase 3: Create markdown renderers with context tracking
  // 
  // Context Tracking Implementation:
  // - Uses refs for state tracking (better performance than useState in renderers)
  // - Tracks heading hierarchy with headingStack array
  // - Tracks introduction state (first paragraph before H2)
  // - Tracks subsection state (content after H3)
  // - Properly resets context when content changes
  // 
  // Flexible Detection Logic:
  // - Works with ANY markdown structure, not just H1->H2->H3
  // - Introduction: First paragraph before any H2 (works even without H1)
  // - Subsection: Content after H3 (works even if H3 appears before H2)
  // - All styling values come from markdownConfig (no hardcoded values)
  // - Handles edge cases:
  //   * No H1: Introduction still detected from first paragraph
  //   * H2 before H1: Major sections still styled correctly
  //   * H3 before H2: Subsections still detected
  //   * Multiple H1s: Each resets context appropriately
  //   * H4-H6: Don't break subsection detection, inherit context
  //   * Nested structures: Context persists correctly
  //
  
  // Helper to extract all text from React children (recursive) – for empty-paragraph detection
  const getTextContent = (node: React.ReactNode): string => {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(getTextContent).join('');
    if (React.isValidElement(node)) {
      const props = (node.props as Record<string, unknown>) || {};
      return getTextContent(props.children as React.ReactNode);
    }
    return String(node);
  };

  // Helper function to check if paragraph contains ONLY a <strong> tag (no other text)
  // This is used to detect titles that were incorrectly written as **bold** instead of # H1
  const isOnlyStrongTag = (children: React.ReactNode): boolean => {
    // Single strong element
    if (React.isValidElement(children) && children.type === 'strong') {
      return true;
    }
    
    // Array with single strong element (common case)
    if (Array.isArray(children) && children.length === 1) {
      const child = children[0];
      if (React.isValidElement(child) && child.type === 'strong') {
        return true;
      }
    }
    
    // Array with only whitespace and a strong element
    if (Array.isArray(children)) {
      const nonWhitespace = children.filter(child => {
        if (typeof child === 'string') {
          return child.trim().length > 0;
        }
        return true;
      });
      
      if (nonWhitespace.length === 1 && React.isValidElement(nonWhitespace[0]) && nonWhitespace[0].type === 'strong') {
        return true;
      }
    }
    
    return false;
  };

  // Helper function to strip leading and trailing quotation marks from blockquote content
  // Blockquotes don't need quotes since the element itself indicates it's a quote
  // Only removes quotes at the very start/end of the blockquote content, preserving quotes within text
  const stripQuotesFromBlockquote = (children: React.ReactNode): React.ReactNode => {
    // First pass: collect all text nodes in order
    const textNodes: string[] = [];
    const collectTextNodes = (node: React.ReactNode): void => {
      if (typeof node === 'string') {
        if (node.trim().length > 0) {
          textNodes.push(node);
        }
      } else if (Array.isArray(node)) {
        node.forEach(child => collectTextNodes(child));
      } else if (React.isValidElement(node)) {
        const props = node.props as Record<string, any>;
        if (props.children) {
          collectTextNodes(props.children);
        }
      }
    };
    collectTextNodes(children);

    // If no text nodes found, return as-is
    if (textNodes.length === 0) return children;

    // Track which text nodes we've processed
    let textNodeIndex = 0;

    // Recursively process nodes, stripping quotes from first and last text nodes only
    const processNode = (node: React.ReactNode): React.ReactNode => {
      if (typeof node === 'string') {
        // Only process non-empty strings
        if (node.trim().length === 0) {
          return node;
        }

        const isFirstTextNode = textNodeIndex === 0;
        const isLastTextNode = textNodeIndex === textNodes.length - 1;
        textNodeIndex++;

        let processed = node;
        // Strip leading quotes only from the very first text node
        if (isFirstTextNode) {
          processed = processed.replace(/^["'""]+/, '');
        }
        // Strip trailing quotes only from the very last text node
        if (isLastTextNode) {
          processed = processed.replace(/["'""]+$/, '');
        }
        return processed;
      }

      if (Array.isArray(node)) {
        return React.Children.map(node, child => processNode(child));
      }

      if (React.isValidElement(node)) {
        const props = node.props as Record<string, any>;
        return React.cloneElement(node, {
          ...props,
          children: processNode(props.children),
        } as any);
      }

      return node;
    };

    // Reset index before processing
    textNodeIndex = 0;
    return processNode(children);
  };
  
  const createMarkdownRenderers = (useAnimations: boolean = false) => {
    const context = markdownContextRef.current;
    const shouldAnimate = useAnimations && shouldAnimateNewContent;

    return {
      h1: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        // Phase 3: H1 resets introduction state and starts new document section
        // Flexible: works even if H1 appears multiple times or not at all
        const isFirstElement = !context.hasRenderedContent;
        context.isInIntroduction = true;
        context.isInSubsection = false;
        context.hasSeenH1 = true;
        context.hasSeenH2 = false;
        context.paragraphCount = 0;
        context.lastHeadingLevel = 1;
        context.headingStack = ['h1']; // Reset stack to H1
        context.hasRenderedContent = true;

        const Component = shouldAnimate ? motion.h1 : 'h1';
        const props = shouldAnimate ? newContentAnimation : {};
        
        // Phase 1: Generate anchor ID for TOC navigation
        const headerText = children?.toString() || '';
        const id = slugify(headerText);
        
        return (
          <Component
            {...props}
            {...restProps}
            id={id}
            className={cn(
              markdownConfig.headerGradient,
              "text-4xl", // 36px - Largest size for H1
              typography.fontWeight.bold,
              isFirstElement ? "mb-4" : spacing.margin.md // Remove top margin from first element
            )}
          >
            {children}
          </Component>
        );
      },
      h2: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        // Phase 3: H2 marks end of introduction and start of major section
        // Flexible: works even if H2 appears before H1 or without H1
        const isFirstElement = !context.hasRenderedContent;
        const isFirstH2 = !context.hasSeenH2; // First H2 in doc gets no top margin (handles leading empty paras)
        context.isInIntroduction = false;
        context.isInSubsection = false;
        context.hasSeenH2 = true;
        context.lastHeadingLevel = 2;
        // Update heading stack - keep H1 if it exists, otherwise start with H2
        if (context.headingStack[0] === 'h1') {
          context.headingStack = ['h1', 'h2'];
        } else {
          context.headingStack = ['h2'];
        }
        context.hasRenderedContent = true;

        const Component = shouldAnimate ? motion.h2 : 'h2';
        const props = shouldAnimate ? newContentAnimation : {};
        
        // Phase 1: Generate anchor ID for TOC navigation
        const headerText = children?.toString() || '';
        const id = slugify(headerText);
        
        return (
          <Component
            {...props}
            {...restProps}
            id={id}
            className={cn(
              (isFirstElement || isFirstH2) ? "!mt-0" : markdownConfig.majorSection.marginTop, // Force no top margin before first title (overrides prose)
              markdownConfig.majorSection.marginBottom,
              markdownConfig.majorSection.fontSize,
              markdownConfig.majorSection.fontWeight,
              (isFirstElement || isFirstH2) ? "" : markdownConfig.majorSection.divider,
              markdownConfig.headerGradient,
              colors.text.primary
            )}
          >
            <CitationTextProcessor>
              {children}
            </CitationTextProcessor>
          </Component>
        );
      },
      h3: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        // Phase 3: H3 marks start of subsection
        // Flexible: works even if H3 appears before H2 or without H2
        // If we see H3, we're definitely not in introduction anymore
        const isFirstElement = !context.hasRenderedContent;
        context.isInIntroduction = false;
        context.isInSubsection = true;
        context.lastHeadingLevel = 3;
        // Update heading stack - maintain hierarchy up to H3
        if (context.headingStack.length >= 2 && context.headingStack[1] === 'h2') {
          context.headingStack = [context.headingStack[0], 'h2', 'h3'];
        } else if (context.headingStack.length >= 1 && context.headingStack[0] === 'h2') {
          context.headingStack = ['h2', 'h3'];
        } else {
          context.headingStack = ['h3'];
        }
        context.hasRenderedContent = true;

        const Component = shouldAnimate ? motion.h3 : 'h3';
        const props = shouldAnimate ? newContentAnimation : {};
        
        // Phase 4: Add hover effects from config - only when using motion component
        const hoverProps = (shouldAnimate && !shouldReduceMotion) ? {
          whileHover: { 
            scale: markdownConfig.subsection.hover.scale,
            transition: { duration: markdownConfig.subsection.hover.transitionDuration }
          }
        } : {};
        
        // Phase 1: Generate anchor ID for TOC navigation
        const headerText = children?.toString() || '';
        const id = slugify(headerText);
        
        // Detect Sources section for citation scrolling
        const isSourcesSection = isSourcesHeading(headerText, 'en'); // TODO: Get language from context
        
        return (
          <Component
            {...props}
            {...hoverProps}
            {...restProps}
            id={id}
            data-sources-section={isSourcesSection ? 'true' : undefined}
            className={cn(
              isFirstElement ? "" : (isSourcesSection ? markdownConfig.sourcesSection.marginTop : markdownConfig.subsection.marginTop), // Extra padding before Sources
              markdownConfig.subsection.marginBottom,
              markdownConfig.subsection.fontSize,
              markdownConfig.subsection.fontWeight,
              markdownConfig.subsection.hover.transition,
              markdownConfig.subsection.hover.opacity,
              markdownConfig.headerGradient,
              colors.text.primary
            )}
          >
            <CitationTextProcessor>
              {children}
            </CitationTextProcessor>
          </Component>
        );
      },
      // Phase 3: H4-H6 - Flexible handling - don't change subsection state
      // They inherit the current context (subsection or not)
      // This allows for nested structures without breaking detection
      h4: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        const isFirstElement = !context.hasRenderedContent;
        context.isInIntroduction = false;
        context.lastHeadingLevel = 4;
        // Keep current subsection state (don't reset it)
        // Update heading stack - maintain hierarchy up to H4
        if (context.headingStack.length >= 3 && context.headingStack[2] === 'h3') {
          context.headingStack = [context.headingStack[0], context.headingStack[1], 'h3', 'h4'];
        } else {
          // If no H3 in stack, just append H4
          context.headingStack = [...context.headingStack.slice(0, 3), 'h4'];
        }
        context.hasRenderedContent = true;
        
        const Component = shouldAnimate ? motion.h4 : 'h4';
        const props = shouldAnimate ? newContentAnimation : {};
        
        // Phase 1: Generate anchor ID for TOC navigation
        const headerText = children?.toString() || '';
        const id = slugify(headerText);
        
        return (
          <Component
            {...props}
            {...restProps}
            id={id}
            className={cn(
              isFirstElement ? "" : markdownConfig.minorSubsection.marginTop,
              markdownConfig.subsection.marginBottom,
              markdownConfig.minorSubsection.fontSize, // Use minorSubsection size for H4
              markdownConfig.minorSubsection.fontWeight,
              markdownConfig.headerGradient,
              colors.text.primary
            )}
          >
            {children}
          </Component>
        );
      },
      h5: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        const isFirstElement = !context.hasRenderedContent;
        context.isInIntroduction = false;
        context.lastHeadingLevel = 5;
        // Update heading stack - maintain hierarchy up to H5
        context.headingStack = [...context.headingStack.slice(0, 4), 'h5'];
        context.hasRenderedContent = true;
        
        const Component = shouldAnimate ? motion.h5 : 'h5';
        const props = shouldAnimate ? newContentAnimation : {};
        
        // Phase 1: Generate anchor ID for TOC navigation
        const headerText = children?.toString() || '';
        const id = slugify(headerText);
        
        return (
          <Component
            {...props}
            {...restProps}
            id={id}
            className={cn(
              isFirstElement ? "" : markdownConfig.subsection.marginTop, // Remove top margin from first element
              markdownConfig.subsection.marginBottom,
              markdownConfig.minorSubsection.fontSize, // Use minorSubsection size for H5
              markdownConfig.minorSubsection.fontWeight,
              markdownConfig.headerGradient,
              colors.text.primary
            )}
          >
            {children}
          </Component>
        );
      },
      h6: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        const isFirstElement = !context.hasRenderedContent;
        context.isInIntroduction = false;
        context.lastHeadingLevel = 6;
        // Update heading stack - maintain hierarchy up to H6
        context.headingStack = [...context.headingStack.slice(0, 5), 'h6'];
        context.hasRenderedContent = true;
        
        const Component = shouldAnimate ? motion.h6 : 'h6';
        const props = shouldAnimate ? newContentAnimation : {};
        
        // Phase 1: Generate anchor ID for TOC navigation
        const headerText = children?.toString() || '';
        const id = slugify(headerText);
        
        return (
          <Component
            {...props}
            {...restProps}
            id={id}
            className={cn(
              isFirstElement ? "" : markdownConfig.subsection.marginTop, // Remove top margin from first element
              markdownConfig.subsection.marginBottom,
              markdownConfig.minorSubsection.fontSize, // Use minorSubsection size for H6
              markdownConfig.minorSubsection.fontWeight,
              markdownConfig.headerGradient,
              colors.text.primary
            )}
          >
            <CitationTextProcessor>
              {children}
            </CitationTextProcessor>
          </Component>
        );
      },
      p: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        // Skip empty/whitespace-only paragraphs – they create unwanted blue intro boxes
        const text = getTextContent(children).replace(/\s/g, '');
        if (!text || text.length === 0) {
          return null;
        }

        const isFirstElement = !context.hasRenderedContent;
        
        // Check if this paragraph is ONLY bold text (likely a title written as **text** instead of # H1)
        // Only apply H1 styling if it's the first element (to avoid converting all bold paragraphs)
        const isOnlyBold = isOnlyStrongTag(children);
        
        // Debug logging - log ALL paragraphs to see what's happening
        if (process.env.NODE_ENV === 'development') {
          console.log('[MarkdownStreamer] Paragraph renderer called:', JSON.stringify({
            isFirstElement,
            hasRenderedContent: context.hasRenderedContent,
            isOnlyBold,
            willConvertToH1: isOnlyBold && isFirstElement,
            useAnimations: useAnimations
          }, null, 2));
        }
        
        if (isOnlyBold && isFirstElement) {
          // This is likely a title that should be H1
          context.hasSeenH1 = true;
          context.isInIntroduction = true;
          context.hasRenderedContent = true;
          
          console.log('[MarkdownStreamer] ✅ CONVERTING FIRST BOLD PARAGRAPH TO H1');
          
          const Component = shouldAnimate ? motion.h1 : 'h1';
          const animProps = shouldAnimate ? newContentAnimation : {};
          
          return (
            <Component
              {...animProps}
              {...restProps}
              className={cn(
                markdownConfig.headerGradient,
                "!text-4xl",  // Use ! to override prose styles
                typography.fontWeight.bold,
                "mb-4"
              )}
            >
              {children}
            </Component>
          );
        }
        
        // Regular paragraph logic
        const isIntro = !context.hasSeenH2 && context.paragraphCount === 0 && text.length >= 20;
        const isInSubsectionPara = context.isInSubsection && !isIntro;
        
        // Increment paragraph count if we're still before H2 (potential introduction)
        if (!context.hasSeenH2) {
          context.paragraphCount++;
        }
        context.hasRenderedContent = true;

        const Component = shouldAnimate ? motion.p : 'p';
        const props = shouldAnimate ? newContentAnimation : {};
        const style = shouldAnimate ? { willChange: "opacity" as const } : undefined;
        
        return (
          <Component
            {...props}
            {...restProps}
            style={style}
            className={cn(
              isIntro
                ? cn(
                    markdownConfig.introduction.border,
                    markdownConfig.introduction.fontSize,
                    markdownConfig.introduction.lineHeight,
                    isFirstElement ? "mb-8" : markdownConfig.introduction.margin, // Remove top margin from first element
                    colors.text.primary
                  )
                : isInSubsectionPara
                ? cn(
                    markdownConfig.subsectionParagraph.margin,
                    markdownConfig.subsectionParagraph.indent,
                    markdownConfig.paragraph.lineHeight,
                    typography.fontSize.base, // All content paragraphs use text-base (14px)
                    colors.text.primary
                  )
                : cn(
                    markdownConfig.paragraph.margin,
                    markdownConfig.paragraph.lineHeight,
                    typography.fontSize.base, // All content paragraphs use text-base (14px)
                    colors.text.primary
                  )
            )}
          >
            <CitationTextProcessor>
              {children}
            </CitationTextProcessor>
          </Component>
        );
      },
      ul: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        // Flexible subsection list detection:
        // - Apply subsection styling if we're currently in a subsection (after H3)
        // - Works regardless of whether H2 exists or not
        // - Top-level lists (not in subsection) get regular styling
        const isFirstElement = !context.hasRenderedContent;
        const isInSubsectionList = context.isInSubsection;
        context.hasRenderedContent = true;
        
        const Component = shouldAnimate ? motion.ul : 'ul';
        const props = shouldAnimate ? newContentAnimation : {};
        
        // Phase 4: Add hover effects for subsection lists (from config) - only when using motion component
        const hoverProps = (shouldAnimate && isInSubsectionList && !shouldReduceMotion) ? {
          whileHover: { 
            transition: { duration: markdownConfig.subsection.hover.transitionDuration }
          }
        } : {};
        
        // Use config values - no hardcoded styling
        // Phase 4: Add background tint and hover effects for subsection lists
        // Custom bullets for perfect alignment with border
        const listClasses = isInSubsectionList
          ? cn(
              markdownConfig.subsectionList.indent,
              markdownConfig.subsectionList.itemSpacing,
              markdownConfig.subsectionList.border,
              markdownConfig.subsectionList.padding,
              isFirstElement ? "mb-3" : markdownConfig.subsectionList.margin, // Remove top margin from first element
              markdownConfig.subsectionList.background,
              markdownConfig.subsectionList.backgroundHover,
              markdownConfig.subsectionList.transition,
              // Custom bullet styling (replaces default list-disc)
              markdownConfig.subsectionList.bullet.listStyle,
              markdownConfig.subsectionList.bullet.bulletClass
            )
          : cn(
              markdownConfig.list.disc,
              markdownConfig.list.spacing,
              isFirstElement ? "mb-4" : markdownConfig.list.margin, // Remove top margin from first element
              markdownConfig.list.padding,
              markdownConfig.list.itemParagraph
            );
        
        return (
          <Component {...props} {...hoverProps} {...restProps} className={listClasses}>
            {children}
          </Component>
        );
      },
      ol: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        const isFirstElement = !context.hasRenderedContent;
        context.hasRenderedContent = true;
        
        const Component = shouldAnimate ? motion.ol : 'ol';
        const props = shouldAnimate ? newContentAnimation : {};
        
        return (
          <Component
            {...props}
            {...restProps}
            className={cn(
              markdownConfig.list.decimal,
              markdownConfig.list.spacing,
              isFirstElement ? "mb-4" : markdownConfig.list.margin, // Remove top margin from first element
              markdownConfig.list.padding,
              markdownConfig.list.itemParagraph
            )}
          >
            {children}
          </Component>
        );
      },
      li: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => (
        <li className={cn(typography.fontSize.base, colors.text.primary)} {...restProps}>
          <CitationTextProcessor>
            {children}
          </CitationTextProcessor>
        </li>
      ),
      code: ({ children, className, ...restProps }: { children?: React.ReactNode; className?: string; [key: string]: any }) => (
        <Code className={className} {...restProps}>{children}</Code>
      ),
      a: ({ children, href, ...props }: { children?: React.ReactNode; href?: string; [key: string]: any }) => (
        <motion.a
          href={href}
          className={cn(
            markdownConfig.link.default,
            markdownConfig.link.hover,
            markdownConfig.link.underline,
            "transition-colors"
          )}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={shouldReduceMotion ? {} : { scale: streamingConfig.textChunk.linkHoverScale }}
          {...props}
        >
          {children}
        </motion.a>
      ),
      blockquote: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        const isFirstElement = !context.hasRenderedContent;
        context.hasRenderedContent = true;
        
        const Component = shouldAnimate ? motion.blockquote : 'blockquote';
        const animationProps = shouldAnimate ? newContentAnimation : {};
        
        // Strip quotation marks from blockquote content (blockquote element already indicates it's a quote)
        const cleanedChildren = stripQuotesFromBlockquote(children);
        
        return (
          <Component
            {...animationProps}
            {...restProps}
            className={cn(
              markdownConfig.blockquote.border,
              markdownConfig.blockquote.text,
              markdownConfig.blockquote.padding,
              isFirstElement ? "mb-4" : markdownConfig.blockquote.margin, // Remove top margin from first element
              markdownConfig.blockquote.style
            )}
          >
            {cleanedChildren}
          </Component>
        );
      },
      table: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        const isFirstElement = !context.hasRenderedContent;
        context.hasRenderedContent = true;
        
        const Component = shouldAnimate ? motion.table : 'table';
        const props = shouldAnimate ? newContentAnimation : {};
        
        return (
          <div className={cn("overflow-x-auto", isFirstElement ? "mb-4" : markdownConfig.table.margin)}>
            <Component
              {...props}
              {...restProps}
              className={cn(
                markdownConfig.table.fontSize,
                markdownConfig.table.width,
                markdownConfig.table.borderCollapse,
                markdownConfig.table.border,
                markdownConfig.table.borderRadius,
                markdownConfig.table.overflow
              )}
            >
              {children}
            </Component>
          </div>
        );
      },
      thead: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        const Component = shouldAnimate ? motion.thead : 'thead';
        const props = shouldAnimate ? newContentAnimation : {};
        
        return (
          <Component
            {...props}
            {...restProps}
            className={cn(
              markdownConfig.thead.background,
              markdownConfig.thead.borderBottom
            )}
          >
            {children}
          </Component>
        );
      },
      tbody: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        const Component = shouldAnimate ? motion.tbody : 'tbody';
        const props = shouldAnimate ? newContentAnimation : {};
        
        return (
          <Component
            {...props}
            {...restProps}
            className={cn(markdownConfig.tbody.background)}
          >
            {children}
          </Component>
        );
      },
      tr: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        const Component = shouldAnimate ? motion.tr : 'tr';
        const props = shouldAnimate ? newContentAnimation : {};
        
        return (
          <Component
            {...props}
            {...restProps}
            className={cn(
              markdownConfig.tr.borderBottom,
              markdownConfig.tr.lastChild
            )}
          >
            {children}
          </Component>
        );
      },
      th: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        const Component = shouldAnimate ? motion.th : 'th';
        const props = shouldAnimate ? newContentAnimation : {};
        
        return (
          <Component
            {...props}
            {...restProps}
            className={cn(
              markdownConfig.th.padding,
              markdownConfig.th.textAlign,
              markdownConfig.th.fontWeight,
              markdownConfig.th.fontSize,
              markdownConfig.th.color,
              markdownConfig.th.background
            )}
          >
            <CitationTextProcessor>
              {children}
            </CitationTextProcessor>
          </Component>
        );
      },
      td: ({ children, ...restProps }: { children?: React.ReactNode; [key: string]: any }) => {
        const Component = shouldAnimate ? motion.td : 'td';
        const props = shouldAnimate ? newContentAnimation : {};
        
        return (
          <Component
            {...props}
            {...restProps}
            className={cn(
              markdownConfig.td.padding,
              markdownConfig.td.fontSize,
              markdownConfig.td.color
            )}
          >
            <CitationTextProcessor>
              {children}
            </CitationTextProcessor>
          </Component>
        );
      },
    };
  };

  // Phase 3: Citation System - Tooltip renderer component
  function CitationTooltipRenderer() {
    const { hoveredCitation, tooltipPosition, getCitation, setHoveredCitation, setTooltipPosition, openVideo } = useCitation();
    
    if (!hoveredCitation || !tooltipPosition) {
      return null;
    }
    
    const citationData = getCitation(hoveredCitation);
    // Allow rendering even with placeholder data during streaming
    // The tooltip will show "Loading..." until real data arrives
    if (!citationData) {
      return null;
    }
    
    return (
      <CitationTooltip
        citationData={citationData}
        position={tooltipPosition}
        onClose={() => {
          setHoveredCitation(null);
          setTooltipPosition(null);
        }}
        onWatchClick={openVideo}
      />
    );
  }

  return (
    <div className={cn("prose prose-lg max-w-none relative break-words", isDark && "prose-invert")}>
      <div
        className={cn(
          colors.background.tertiary, // Use config for background
          borderRadius.lg, // Use config for border radius
          spacing.container.cardPaddingMobile, // Use config for padding
          "min-w-0 break-words", // Prevent flex item from overflowing and ensure text wraps
          // No overflow constraint - let parent handle scrolling for seamless transition
        )}
      >
        {debouncedContent ? (
          <MarkdownErrorBoundary
            content={debouncedContent}
            onError={onError}
            fallbackMessage={markdownMessages.renderFallback}
          >
            <div className={cn(colors.text.primary, "break-words min-w-0")}>
              {/* Phase 1: Render split content when streaming, full content when completed */}
              {!shouldAnimateCompletion ? (
              <>
                {/* Phase 1: Existing content components (no animations, static rendering) */}
                {/* Phase 2+3: Updated to use new markdown config with context tracking */}
                {parsedExistingContent && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={createMarkdownRenderers(false)}
              >
                {parsedExistingContent}
              </ReactMarkdown>
            )}

            {/* Phase 1: New content components (subtle fade-in animations) */}
            {/* Phase 2+3: Updated to use new markdown config with context tracking */}
            {isStreaming && parsedNewContent && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={createMarkdownRenderers(true)}
              >
                {parsedNewContent}
              </ReactMarkdown>
            )}

              </>
            ) : (
              /* Phase 1: Completion animation - render full content when streaming stops */
              /* Phase 2+3: Updated to use new markdown config with context tracking */
              fullContentForCompletion && (
                <motion.div
                  initial={{ opacity: animationDurations.completionInitialOpacity }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: animationDurations.completionFadeIn }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={createMarkdownRenderers(false)}
                  >
                    {fullContentForCompletion}
                  </ReactMarkdown>
                </motion.div>
              )
            )}

            {/* Typing cursor (Phase 5: Optimized animation) */}
            {isStreaming && !shouldReduceMotion && (
              <motion.span
                className={cn(
                  "inline-block",
                  streamingConfig.cursor.width,
                  streamingConfig.cursor.height,
                  streamingConfig.cursor.color,
                  streamingConfig.cursor.margin
                )}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ 
                  duration: animationDurations.markdownCursor, 
                  repeat: Infinity,
                  ease: "easeInOut" as const
                }}
                aria-hidden="true"
                style={{ 
                  willChange: "opacity",
                  // Use CSS animation for better performance - duration matches markdownCursor config
                  animation: `blink ${animationDurations.markdownCursor}s ease-in-out infinite`
                }}
              />
            )}
          </div>
          </MarkdownErrorBoundary>
        ) : (
          <p className={colors.text.muted}>{t('summary:result.waitingForContent', 'Waiting for content...')}</p>
        )}
        {/* Phase 3: Citation System - Render tooltip */}
        <CitationTooltipRenderer />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Phase 1: Custom comparison function for React.memo
  // Only re-render if content or isStreaming actually changed
  return (
    prevProps.content === nextProps.content &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});

MarkdownStreamer.displayName = "MarkdownStreamer";
export { MarkdownStreamer };

