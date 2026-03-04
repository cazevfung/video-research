/**
 * Citation Parser Service
 * Real-time citation detection and validation during streaming
 */

import { CitationMetadata, CitationUsageMap } from '../types/citation.types';
import { getCitationParserConfig } from '../config';
import logger from '../utils/logger';

/**
 * Citation parsing result
 */
export interface CitationParseResult {
  citations: number[]; // Array of citation numbers found in the chunk
  isValid: boolean; // Whether all citations are valid
  invalidCitations: number[]; // Array of invalid citation numbers
}

/**
 * Section detection result
 */
export interface SectionDetectionResult {
  isNewSection: boolean;
  sectionTitle?: string;
  isSourcesSection: boolean;
}

/**
 * Citation parser state (maintained across chunks)
 */
export interface CitationParserState {
  accumulatedText: string; // Accumulated text for section detection
  currentSection: string | null; // Current section title
  citationUsage: CitationUsageMap; // Tracks citations per section
  allCitationsFound: Set<number>; // All citation numbers found so far
  invalidCitations: Set<number>; // Invalid citation numbers encountered
}

/**
 * Initialize citation parser state
 */
export function createCitationParserState(): CitationParserState {
  return {
    accumulatedText: '',
    currentSection: null,
    citationUsage: {},
    allCitationsFound: new Set<number>(),
    invalidCitations: new Set<number>(),
  };
}

/**
 * Parse citations from a text chunk
 * Detects single citations [1], multiple citations [1, 3, 5], and ranges [1-4]
 * 
 * @param chunk Text chunk to parse
 * @param citationMetadata Available citation metadata for validation
 * @returns Parse result with found citations and validation status
 */
export function parseCitations(
  chunk: string,
  citationMetadata: CitationMetadata
): CitationParseResult {
  const config = getCitationParserConfig();
  const citations: number[] = [];
  const invalidCitations: number[] = [];
  const availableNumbers = new Set(
    Object.keys(citationMetadata).map((n) => parseInt(n, 10))
  );

  // Single citation: [1]
  const singlePattern = new RegExp(config.patterns.single, 'g');
  let match;
  while ((match = singlePattern.exec(chunk)) !== null) {
    const num = parseInt(match[1], 10);
    if (availableNumbers.has(num)) {
      citations.push(num);
    } else {
      invalidCitations.push(num);
    }
  }

  // Multiple citations: [1, 3, 5]
  const multiplePattern = new RegExp(config.patterns.multiple, 'g');
  while ((match = multiplePattern.exec(chunk)) !== null) {
    const numbers = match[1].split(',').map((n) => parseInt(n.trim(), 10));
    for (const num of numbers) {
      if (!isNaN(num)) {
        if (availableNumbers.has(num)) {
          citations.push(num);
        } else {
          invalidCitations.push(num);
        }
      }
    }
  }

  // Range citations: [1-4]
  const rangePattern = new RegExp(config.patterns.range, 'g');
  while ((match = rangePattern.exec(chunk)) !== null) {
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      for (let num = start; num <= end; num++) {
        if (availableNumbers.has(num)) {
          citations.push(num);
        } else {
          invalidCitations.push(num);
        }
      }
    }
  }

  // Remove duplicates
  const uniqueCitations = Array.from(new Set(citations));
  const uniqueInvalid = Array.from(new Set(invalidCitations));

  return {
    citations: uniqueCitations,
    isValid: uniqueInvalid.length === 0,
    invalidCitations: uniqueInvalid,
  };
}

/**
 * Detect section boundaries in text
 * Looks for H2 headings (## Title) and Sources sections (### Sources)
 * 
 * @param accumulatedText Accumulated text so far
 * @param newChunk New chunk to append
 * @param language Report language for Sources heading detection
 * @returns Section detection result
 */
export function detectSection(
  accumulatedText: string,
  newChunk: string,
  language: string
): SectionDetectionResult {
  const config = getCitationParserConfig();
  const combinedText = accumulatedText + newChunk;

  // Check for Sources section heading (localized)
  const sourcesHeadings = config.sources_section_patterns[language] || 
    config.sources_section_patterns['English'] || 
    ['### Sources', '### 来源', '### 來源'];

  for (const heading of sourcesHeadings) {
    const sourcesPattern = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
    if (sourcesPattern.test(combinedText)) {
      return {
        isNewSection: true,
        isSourcesSection: true,
        sectionTitle: heading,
      };
    }
  }

  // Check for H2 section heading (## Title)
  const h2Pattern = new RegExp(config.patterns.section_heading, 'm');
  const h2Match = combinedText.match(h2Pattern);
  if (h2Match) {
    const sectionTitle = h2Match[1].trim();
    // Check if this is a different section than current
    const lastH2Match = accumulatedText.match(h2Pattern);
    const lastSectionTitle = lastH2Match ? lastH2Match[1].trim() : null;
    
    if (sectionTitle !== lastSectionTitle) {
      return {
        isNewSection: true,
        isSourcesSection: false,
        sectionTitle,
      };
    }
  }

  return {
    isNewSection: false,
    isSourcesSection: false,
  };
}

/**
 * Update parser state with new chunk
 * Tracks citations per section and detects section boundaries
 * 
 * @param state Current parser state
 * @param chunk New text chunk
 * @param citationMetadata Available citation metadata
 * @param language Report language
 * @returns Updated state and detection results
 */
export function updateParserState(
  state: CitationParserState,
  chunk: string,
  citationMetadata: CitationMetadata,
  language: string
): {
  updatedState: CitationParserState;
  sectionDetected: SectionDetectionResult;
  parseResult: CitationParseResult;
} {
  const updatedState = { ...state };
  updatedState.accumulatedText += chunk;

  // Detect section boundaries
  const sectionDetected = detectSection(
    state.accumulatedText,
    chunk,
    language
  );

  // If new section detected, update current section
  if (sectionDetected.isNewSection && !sectionDetected.isSourcesSection && sectionDetected.sectionTitle) {
    updatedState.currentSection = sectionDetected.sectionTitle;
    // Initialize citation usage for new section if not exists
    if (!updatedState.citationUsage[sectionDetected.sectionTitle]) {
      updatedState.citationUsage[sectionDetected.sectionTitle] = [];
    }
  }

  // Parse citations from chunk
  const parseResult = parseCitations(chunk, citationMetadata);

  // Update citation usage for current section
  if (updatedState.currentSection && !sectionDetected.isSourcesSection) {
    const sectionCitations = updatedState.citationUsage[updatedState.currentSection] || [];
    for (const citationNum of parseResult.citations) {
      if (!sectionCitations.includes(citationNum)) {
        sectionCitations.push(citationNum);
      }
      updatedState.allCitationsFound.add(citationNum);
    }
    updatedState.citationUsage[updatedState.currentSection] = sectionCitations;
  } else {
    // Add to all citations found even if not in a section
    for (const citationNum of parseResult.citations) {
      updatedState.allCitationsFound.add(citationNum);
    }
  }

  // Track invalid citations
  for (const invalidNum of parseResult.invalidCitations) {
    updatedState.invalidCitations.add(invalidNum);
  }

  return {
    updatedState,
    sectionDetected,
    parseResult,
  };
}

/**
 * Check if a section is complete
 * A section is considered complete when we detect a new section or Sources section
 * 
 * @param state Current parser state
 * @param sectionDetected Section detection result
 * @returns Whether current section is complete
 */
export function isSectionComplete(
  state: CitationParserState,
  sectionDetected: SectionDetectionResult
): boolean {
  if (!state.currentSection) {
    return false;
  }

  // Section is complete if we detect a new section or Sources section
  return sectionDetected.isNewSection;
}

/**
 * Get citations used in a specific section
 * 
 * @param state Parser state
 * @param sectionTitle Section title
 * @returns Array of citation numbers used in the section
 */
export function getSectionCitations(
  state: CitationParserState,
  sectionTitle: string
): number[] {
  return state.citationUsage[sectionTitle] || [];
}
