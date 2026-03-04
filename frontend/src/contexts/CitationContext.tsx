'use client';

/**
 * Citation Context
 * Phase 3: Centralized citation state management
 * Provides citation metadata, hover state, and interaction handlers
 */

import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';
import type { CitationMetadata, CitationUsageMap, CitationData } from '@/types/citations';

/**
 * Format duration from seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format view count (e.g., 72755 -> "72K")
 */
function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K`;
  }
  return count.toString();
}

/**
 * Convert CitationMetadata to Map<number, CitationData>
 */
function processCitations(metadata: CitationMetadata | null): Map<number, CitationData> {
  const map = new Map<number, CitationData>();
  
  if (!metadata) {
    return map;
  }
  
  Object.entries(metadata).forEach(([numStr, data]) => {
    const num = parseInt(numStr, 10);
    if (!isNaN(num)) {
      map.set(num, {
        number: num,
        videoId: data.videoId,
        title: data.title,
        channel: data.channel,
        thumbnail: data.thumbnail,
        url: data.url,
        durationFormatted: formatDuration(data.duration_seconds),
        uploadDate: data.upload_date,
        viewCountFormatted: formatViewCount(data.view_count),
      });
    }
  });
  
  return map;
}

interface CitationContextValue {
  // State
  citations: Map<number, CitationData>;
  hoveredCitation: number | null;
  tooltipPosition: { x: number; y: number } | null;
  activeVideoId: string | null;
  citationUsage: CitationUsageMap;
  currentSection: string | null;
  
  // Actions
  setCitations: (metadata: CitationMetadata | null) => void;
  setCitationUsage: React.Dispatch<React.SetStateAction<CitationUsageMap>>;
  setHoveredCitation: (num: number | null) => void;
  setTooltipPosition: (position: { x: number; y: number } | null) => void;
  openVideo: (videoId: string) => void;
  closeVideo: () => void;
  scrollToCitation: (num: number) => void;
  scrollToReference: (num: number) => void;
  setCurrentSection: (section: string | null) => void;
  
  // Helpers
  getCitation: (num: number) => CitationData | undefined;
  getCitationsForSection: (sectionTitle: string) => CitationData[];
}

const CitationContext = createContext<CitationContextValue | undefined>(undefined);

interface CitationProviderProps {
  children: ReactNode;
}

export function CitationProvider({ children }: CitationProviderProps) {
  const [citations, setCitationsMap] = useState<Map<number, CitationData>>(new Map());
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [citationUsage, setCitationUsage] = useState<CitationUsageMap>({});
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  
  // Set citations from metadata
  const setCitations = useCallback((metadata: CitationMetadata | null) => {
    const processed = processCitations(metadata);
    setCitationsMap(processed);
  }, []);
  
  // Get citation by number
  const getCitation = useCallback((num: number): CitationData | undefined => {
    return citations.get(num);
  }, [citations]);
  
  // Get citations for a section
  const getCitationsForSection = useCallback((sectionTitle: string): CitationData[] => {
    const citationNumbers = citationUsage[sectionTitle] || [];
    return citationNumbers
      .map(num => citations.get(num))
      .filter((c): c is CitationData => c !== undefined)
      .sort((a, b) => a.number - b.number);
  }, [citations, citationUsage]);
  
  // Open video player
  const openVideo = useCallback((videoId: string) => {
    setActiveVideoId(videoId);
    // TODO: Open video modal/player (Phase 4)
  }, []);
  
  // Close video player
  const closeVideo = useCallback(() => {
    setActiveVideoId(null);
  }, []);
  
  // Scroll to citation in text
  const scrollToCitation = useCallback((num: number) => {
    // First, try to find the Sources section containing this citation
    // Look for all Sources sections
    const sourcesSections = document.querySelectorAll('[data-sources-section="true"]');
    
    // Find the Sources section that contains this citation number
    for (const section of Array.from(sourcesSections)) {
      // Get the section element (should be an h3)
      const sectionElement = section as HTMLElement;
      
      // Find the next sibling element (usually a paragraph or list containing citations)
      let currentElement: Element | null = sectionElement.nextElementSibling;
      
      // Look through siblings until we find another heading or reach the end
      while (currentElement) {
        // Check if this element or its children contain the citation badge
        const citationBadge = currentElement.querySelector(`[data-citation-number="${num}"]`);
        const citationReference = currentElement.querySelector(`[data-reference-number="${num}"]`);
        const citationInSection = citationBadge || citationReference;
        
        if (citationInSection) {
          // Found the citation in this Sources section
          // Scroll to the Sources section heading
          sectionElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
          
          // Highlight the Sources section briefly
          sectionElement.style.transition = 'background-color 0.3s ease';
          sectionElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; // blue highlight
          setTimeout(() => {
            sectionElement.style.backgroundColor = '';
            setTimeout(() => {
              sectionElement.style.transition = '';
            }, 300);
          }, 1500);
          
          // Also highlight the specific citation item if found
          if (citationInSection instanceof HTMLElement) {
            citationInSection.style.transition = 'background-color 0.3s ease, transform 0.3s ease';
            citationInSection.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
            citationInSection.style.transform = 'scale(1.05)';
            setTimeout(() => {
              citationInSection.style.backgroundColor = '';
              citationInSection.style.transform = '';
              setTimeout(() => {
                citationInSection.style.transition = '';
              }, 300);
            }, 1500);
          }
          
          return;
        }
        
        // Check if we've hit another heading (end of this Sources section)
        if (currentElement.tagName.match(/^H[1-6]$/)) {
          break;
        }
        
        // Also check if current element contains citation text like [num]
        const textContent = currentElement.textContent || '';
        if (textContent.includes(`[${num}]`)) {
          // Found citation text in this Sources section
          sectionElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
          
          // Highlight the Sources section briefly
          sectionElement.style.transition = 'background-color 0.3s ease';
          sectionElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
          setTimeout(() => {
            sectionElement.style.backgroundColor = '';
            setTimeout(() => {
              sectionElement.style.transition = '';
            }, 300);
          }, 1500);
          
          return;
        }
        
        currentElement = currentElement.nextElementSibling;
      }
    }
    
    // Fallback: If no Sources section found, scroll to the citation badge itself
    const citationElement = document.querySelector(`[data-citation-number="${num}"]`);
    if (citationElement) {
      citationElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      // Highlight briefly
      if (citationElement instanceof HTMLElement) {
        citationElement.style.transition = 'background-color 0.3s ease';
        citationElement.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
        setTimeout(() => {
          citationElement.style.backgroundColor = '';
          setTimeout(() => {
            citationElement.style.transition = '';
          }, 300);
        }, 1000);
      }
    }
  }, []);
  
  // Scroll to reference in reference list
  const scrollToReference = useCallback((num: number) => {
    const referenceElement = document.querySelector(`[data-reference-number="${num}"]`);
    if (referenceElement) {
      referenceElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, []);
  
  const value: CitationContextValue = useMemo(() => ({
    citations,
    hoveredCitation,
    tooltipPosition,
    activeVideoId,
    citationUsage,
    currentSection,
    setCitations,
    setCitationUsage,
    setHoveredCitation,
    setTooltipPosition,
    openVideo,
    closeVideo,
    scrollToCitation,
    scrollToReference,
    setCurrentSection,
    getCitation,
    getCitationsForSection,
  }), [
    citations,
    hoveredCitation,
    tooltipPosition,
    activeVideoId,
    citationUsage,
    currentSection,
    setCitations,
    setCitationUsage,
    setHoveredCitation,
    setTooltipPosition,
    openVideo,
    closeVideo,
    scrollToCitation,
    scrollToReference,
    setCurrentSection,
    getCitation,
    getCitationsForSection,
  ]);
  
  return (
    <CitationContext.Provider value={value}>
      {children}
    </CitationContext.Provider>
  );
}

/**
 * Hook to access citation context
 */
export function useCitation(): CitationContextValue {
  const context = useContext(CitationContext);
  if (context === undefined) {
    throw new Error('useCitation must be used within a CitationProvider');
  }
  return context;
}
