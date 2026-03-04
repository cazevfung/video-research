"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { ApprovalCard } from "./ApprovalCard";
import { QuestionItem } from "./QuestionItem";
import { useConfig } from "@/hooks/useConfig";
import { cn } from "@/lib/utils";

export interface QuestionApprovalCardProps {
  questions: string[];
  researchQuery: string;
  feedbackCount: number;
  isProcessing: boolean;
  onApprove: () => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
  // Phase 3: Streaming support
  isStreaming?: boolean;
  partialQuestions?: string[];
}

/**
 * QuestionApprovalCard Component
 * Phase 3: Approval card specifically for research questions
 * 
 * Features:
 * - Displays generated questions
 * - Shows original research query for context
 * - Uses ApprovalCard for common functionality
 * - Config-driven regeneration limits
 */
export function QuestionApprovalCard({
  questions,
  researchQuery,
  feedbackCount,
  isProcessing,
  onApprove,
  onRequestChanges,
  // Phase 3: Streaming support
  isStreaming = false,
  partialQuestions,
}: QuestionApprovalCardProps) {
  const { t } = useTranslation('research');
  const { config } = useConfig();
  
  const maxFeedbackPerStage = config?.research?.max_feedback_per_stage ?? 1;
  const regenerationsRemaining = maxFeedbackPerStage - feedbackCount;
  const showFeedback = regenerationsRemaining > 0;

  // Phase 3: Use partial questions during streaming, complete questions otherwise
  // Filter out any non-question items (meta-commentary, explanations, etc.)
  const filterValidQuestions = (qs: string[]) => {
    return qs.filter(q => {
      // Skip empty or very short items
      if (!q || q.trim().length < 10) return false;
      
      // Skip items that are clearly meta-commentary (bold markdown, explanatory prefixes)
      if (q.startsWith('**') || 
          q.toLowerCase().includes('preserved') ||
          q.toLowerCase().includes('corrected') ||
          q.toLowerCase().includes('updated') ||
          q.toLowerCase().includes('maintained') ||
          q.toLowerCase().includes('enhanced')) {
        return false;
      }
      
      // Skip items that look like sub-points or analysis points (e.g., "Timing rationale (Q1)")
      if (q.match(/^(timing|international|specific|uk'?s|alliance)\s+/i)) {
        return false;
      }
      
      return true;
    });
  };
  
  const displayQuestions = isStreaming && partialQuestions && partialQuestions.length > 0
    ? filterValidQuestions(partialQuestions)
    : filterValidQuestions(questions);

  return (
    <ApprovalCard
      title={t('approval.questions.title')}
      subtitle={t('approval.questions.subtitle')}
      items={displayQuestions}
      renderItem={(question, index) => (
        <QuestionItem
          key={index}
          question={question}
          index={index}
        />
      )}
      showFeedback={showFeedback}
      onApprove={onApprove}
      onRequestChanges={onRequestChanges}
      feedbackPlaceholder={t('approval.questions.feedbackPlaceholder')}
      regenerationsRemaining={regenerationsRemaining}
      isProcessing={isProcessing}
      isStreaming={isStreaming}
      streamingMessage={t('approval.questions.streaming')}
      contextInfo={
        <div className={cn(
          "p-3 rounded-md",
          "bg-theme-bg-secondary",
          "border border-theme-border-primary"
        )}>
          <p className={cn("text-sm font-medium text-theme-text-secondary mb-1")}>
            {t('approval.questions.originalQuery')}
          </p>
          <p className={cn("text-sm text-theme-text-primary")}>
            {researchQuery}
          </p>
        </div>
      }
    />
  );
}
