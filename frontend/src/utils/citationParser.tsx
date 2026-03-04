/**
 * Citation Parser Utility
 * Phase 3: Parses citation patterns in markdown text and replaces with components
 */

import React from 'react';
import { CitationBadge } from '@/components/research/citations';
import { citationConfig } from '@/config/citations';
import { VIDEO_DATE_UNKNOWN } from '@/constants/dates';
import type { CitationData } from '@/types/citations';

/**
 * Parse citation patterns in text and return React nodes
 * Handles: [1], [1, 2, 3], [1-3]
 *
 * @param text - Text to parse
 * @param getCitation - Function to get citation data by number
 * @returns Array of React nodes (text and CitationBadge components)
 */
export function parseCitationsInText(
  text: string,
  getCitation: (num: number) => CitationData | undefined
): React.ReactNode[] {
  if (!text || typeof text !== 'string') {
    return [text];
  }

  // Debug: Log when parsing citations
  if (process.env.NODE_ENV === 'development') {
    const hasCitationPattern = /\[\d+\]/.test(text);
    if (hasCitationPattern) {
      console.debug('[parseCitationsInText] Processing text with citations', {
        textPreview: text.substring(0, 200),
        patterns: text.match(/\[\d+\]/g),
      });
    }
  }

  const nodes: React.ReactNode[] = [];
  const patterns = citationConfig.parsing.patterns;

  // Find all citation patterns
  const matches: Array<{
    index: number;
    length: number;
    type: 'single' | 'multiple' | 'range';
    numbers: number[];
  }> = [];

  // Single citations: [1]
  let match;
  patterns.single.lastIndex = 0;
  while ((match = patterns.single.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: 'single',
        numbers: [num],
      });
    }
  }

  // Multiple citations: [1, 2, 3]
  patterns.multiple.lastIndex = 0;
  while ((match = patterns.multiple.exec(text)) !== null) {
    const numbers = match[1]
      .split(',')
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n));
    if (numbers.length > 0) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: 'multiple',
        numbers,
      });
    }
  }

  // Range citations: [1-3]
  patterns.range.lastIndex = 0;
  while ((match = patterns.range.exec(text)) !== null) {
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      matches.push({
        index: match.index,
        length: match[0].length,
        type: 'range',
        numbers,
      });
    }
  }

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Build nodes array
  let lastIndex = 0;

  for (const match of matches) {
    // Add text before citation
    if (match.index > lastIndex) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore) {
        nodes.push(textBefore);
      }
    }

    // Add citation badges
    for (const num of match.numbers) {
      const citationData = getCitation(num);
      // Always render badge - use real data if available, placeholder if not
      // This ensures citations are always styled as badges, even if metadata isn't loaded yet
      nodes.push(
        <CitationBadge
          key={`citation-${num}-${match.index}`}
          number={num}
          citationData={citationData || {
            number: num,
            videoId: '',
            title: `Citation ${num}`,
            channel: 'Loading...',
            thumbnail: '',
            url: '',
            durationFormatted: '',
            uploadDate: VIDEO_DATE_UNKNOWN,
            viewCountFormatted: '',
          }}
        />
      );
    }

    lastIndex = match.index + match.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

/**
 * Check if text contains citation patterns
 */
export function hasCitations(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const patterns = citationConfig.parsing.patterns;
  return (
    patterns.single.test(text) ||
    patterns.multiple.test(text) ||
    patterns.range.test(text)
  );
}

/**
 * Extract citation numbers from text
 */
export function extractCitationNumbers(text: string): number[] {
  const numbers = new Set<number>();
  const patterns = citationConfig.parsing.patterns;

  // Single citations
  let match;
  patterns.single.lastIndex = 0;
  while ((match = patterns.single.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) {
      numbers.add(num);
    }
  }

  // Multiple citations
  patterns.multiple.lastIndex = 0;
  while ((match = patterns.multiple.exec(text)) !== null) {
    match[1]
      .split(',')
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n))
      .forEach(n => numbers.add(n));
  }

  // Range citations
  patterns.range.lastIndex = 0;
  while ((match = patterns.range.exec(text)) !== null) {
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      for (let i = start; i <= end; i++) {
        numbers.add(i);
      }
    }
  }

  return Array.from(numbers).sort((a, b) => a - b);
}

/**
 * Check if heading is a Sources heading
 */
export function isSourcesHeading(text: string, language: string = 'en'): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const heading = citationConfig.parsing.sourcesHeading[language as keyof typeof citationConfig.parsing.sourcesHeading] || citationConfig.parsing.sourcesHeading.en;
  // Remove markdown heading markers
  const normalizedText = text.replace(/^#+\s*/, '').trim();
  const normalizedHeading = heading.replace(/^#+\s*/, '').trim();

  return normalizedText === normalizedHeading || normalizedText.toLowerCase() === normalizedHeading.toLowerCase();
}
