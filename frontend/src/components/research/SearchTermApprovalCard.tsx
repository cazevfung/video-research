"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { ApprovalCard } from "./ApprovalCard";
import { SearchTermItem } from "./SearchTermItem";
import { useConfig } from "@/hooks/useConfig";
import { cn } from "@/lib/utils";

export interface SearchTermApprovalCardProps {
  searchTerms: string[];
  questions?: string[];
  researchQuery: string;
  feedbackCount: number;
  isProcessing: boolean;
  onApprove: () => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
  // Phase 3: Streaming support
  isStreaming?: boolean;
  partialSearchTerms?: string[];
}

/**
 * SearchTermApprovalCard Component
 * Phase 3: Approval card specifically for search terms
 * 
 * Features:
 * - Displays generated search terms
 * - Optionally shows related questions
 * - Uses ApprovalCard for common functionality
 * - Config-driven regeneration limits
 */
export function SearchTermApprovalCard({
  searchTerms,
  questions,
  researchQuery,
  feedbackCount,
  isProcessing,
  onApprove,
  onRequestChanges,
  // Phase 3: Streaming support
  isStreaming = false,
  partialSearchTerms,
}: SearchTermApprovalCardProps) {
  const { t } = useTranslation('research');
  const { config } = useConfig();
  
  const maxFeedbackPerStage = config?.research?.max_feedback_per_stage ?? 1;
  const regenerationsRemaining = maxFeedbackPerStage - feedbackCount;
  const showFeedback = regenerationsRemaining > 0;

  // Phase 3: Use partial search terms during streaming, complete terms otherwise
  const displaySearchTerms = isStreaming && partialSearchTerms && partialSearchTerms.length > 0
    ? partialSearchTerms
    : searchTerms;

  // Map search terms to questions if available
  const getRelatedQuestion = (index: number): string | undefined => {
    if (!questions || questions.length === 0) return undefined;
    const termsPerQuestion = config?.research?.search_terms_per_question ?? 2;
    const questionIndex = Math.floor(index / termsPerQuestion);
    return questions[questionIndex];
  };

  return (
    <ApprovalCard
      title={t('approval.searchTerms.title')}
      subtitle={t('approval.searchTerms.subtitle')}
      items={displaySearchTerms}
      renderItem={(term, index) => (
        <SearchTermItem
          key={index}
          term={term}
          index={index}
          relatedQuestion={getRelatedQuestion(index)}
        />
      )}
      showFeedback={showFeedback}
      onApprove={onApprove}
      onRequestChanges={onRequestChanges}
      feedbackPlaceholder={t('approval.searchTerms.feedbackPlaceholder')}
      regenerationsRemaining={regenerationsRemaining}
      isProcessing={isProcessing}
      isStreaming={isStreaming}
      streamingMessage={t('approval.searchTerms.streaming')}
      contextInfo={
        questions && questions.length > 0 && (
          <div className={cn(
            "p-3 rounded-md",
            "bg-theme-bg-secondary",
            "border border-theme-border-primary"
          )}>
            <p className={cn("text-sm font-medium text-theme-text-secondary mb-2")}>
              {t('approval.searchTerms.relatedQuestions')}
            </p>
            <ul className="space-y-1">
              {questions.map((question, idx) => (
                <li key={idx} className={cn("text-sm text-theme-text-primary")}>
                  {idx + 1}. {question}
                </li>
              ))}
            </ul>
          </div>
        )
      }
    />
  );
}
