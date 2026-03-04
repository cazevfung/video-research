'use client';

/**
 * CitationTextProcessor Component
 * Phase 3: Processes React children to replace citation patterns with CitationBadge components
 */

import React from 'react';
import { parseCitationsInText } from '@/utils/citationParser';
import { useCitation } from '@/contexts/CitationContext';

interface CitationTextProcessorProps {
  children: React.ReactNode;
  skipProcessing?: boolean; // Skip processing (e.g., in code blocks)
}

/**
 * Recursively process React children to replace citation patterns
 * Handles nested elements, arrays, fragments, and text nodes
 */
function processChildren(children: React.ReactNode, getCitation: (num: number) => any): React.ReactNode {
  // Handle null/undefined
  if (children == null) {
    return children;
  }
  
  // Handle string - process for citations
  if (typeof children === 'string') {
    return parseCitationsInText(children, getCitation);
  }
  
  // Handle number - convert to string and process
  if (typeof children === 'number') {
    return parseCitationsInText(String(children), getCitation);
  }
  
  // Handle boolean - return as-is
  if (typeof children === 'boolean') {
    return children;
  }
  
  // Handle arrays - process each child
  // IMPORTANT: ReactMarkdown often passes children as arrays of mixed content
  // We need to process each element and combine strings when possible
  if (Array.isArray(children)) {
    // Strategy: Combine adjacent strings before processing
    // This handles cases where ReactMarkdown splits "text[3]more" into ["text", "[3]", "more"]
    const processed: React.ReactNode[] = [];
    let stringBuffer: string[] = [];
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      
      if (typeof child === 'string') {
        // Accumulate strings
        stringBuffer.push(child);
      } else {
        // Process accumulated strings first
        if (stringBuffer.length > 0) {
          const combinedText = stringBuffer.join('');
          const parsed = parseCitationsInText(combinedText, getCitation);
          processed.push(...parsed);
          stringBuffer = [];
        }
        
        // Process non-string child
        const processedChild = processChildren(child, getCitation);
        if (React.isValidElement(child) && child.key != null) {
          processed.push(React.cloneElement(processedChild as React.ReactElement, { key: child.key }));
        } else {
          processed.push(<React.Fragment key={`non-string-${i}`}>{processedChild}</React.Fragment>);
        }
      }
    }
    
    // Process any remaining strings
    if (stringBuffer.length > 0) {
      const combinedText = stringBuffer.join('');
      const parsed = parseCitationsInText(combinedText, getCitation);
      processed.push(...parsed);
    }
    
    return processed.length > 0 ? processed : children;
  }
  
  // Handle React elements
  if (React.isValidElement(children)) {
    // Don't process citations inside code elements or pre elements
    const elementType = children.type;
    const props = children.props as any;
    
    if (
      elementType === 'code' || 
      elementType === 'pre' ||
      props?.className?.includes('code') ||
      props?.className?.includes('language-')
    ) {
      return children;
    }
    
    // Process children recursively
    const processedChildren = processChildren(props.children, getCitation);
    
    // Clone element with processed children, preserving all other props
    return React.cloneElement(children, {}, processedChildren);
  }
  
  // Fallback: return as-is
  return children;
}

export function CitationTextProcessor({ children, skipProcessing = false }: CitationTextProcessorProps) {
  const { getCitation, citations } = useCitation();
  
  if (skipProcessing) {
    return <>{children}</>;
  }
  
  // Debug: Log if citations are available (always call useEffect, but only log in development)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const childrenStr = typeof children === 'string' 
        ? children 
        : Array.isArray(children)
          ? children.map(c => typeof c === 'string' ? c : '[ReactElement]').join('')
          : '[ReactElement]';
      
      const hasCitations = citations.size > 0;
      const hasCitationPattern = /\[\d+\]/.test(childrenStr);
      
      if (hasCitationPattern && !hasCitations) {
        console.warn('[CitationTextProcessor] ⚠️ Citation pattern found but no citations loaded', {
          pattern: childrenStr.match(/\[\d+\]/g),
          citationCount: citations.size,
        });
      }
      
      if (hasCitationPattern && hasCitations) {
        console.debug('[CitationTextProcessor] ✅ Processing citations', {
          citationCount: citations.size,
          pattern: childrenStr.match(/\[\d+\]/g),
          childrenType: typeof children,
          isArray: Array.isArray(children),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, citations.size]); // Use citations.size instead of citations object to avoid reference changes
  
  // getCitation function reference changes when citations are updated,
  // which will cause this component to re-render and re-process children
  // This ensures badges get updated citation data when metadata arrives during streaming
  return <>{processChildren(children, getCitation)}</>;
}
