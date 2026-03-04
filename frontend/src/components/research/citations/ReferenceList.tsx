'use client';

/**
 * ReferenceList Component
 * Phase 3: Displays "### Sources" section with organized citation references
 * Phase 4: Added localization support
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { citationConfig } from '@/config/citations';
import type { ReferenceListProps } from '@/types/citations';
import { ExternalLink } from 'lucide-react';

export function ReferenceList({
  sectionTitle,
  citations,
  onCitationClick,
  onVideoClick,
}: ReferenceListProps) {
  const { t } = useTranslation('research');
  
  if (citations.length === 0) {
    return null;
  }
  
  // Phase 4: Localized Sources heading
  const sourcesHeading = t('citations.sources', 'Sources');
  
  return (
    <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
      {/* Heading */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-4">
        {sourcesHeading}
      </h3>
      
      {/* Citation Items */}
      <div className="space-y-2">
        {citations.map((citation) => (
          <div
            key={citation.number}
            data-reference-number={citation.number}
            className={cn(
              'flex items-start gap-3',
              'p-3 rounded-lg',
              'transition-colors',
              'cursor-pointer',
              'hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            onClick={() => onCitationClick(citation.number)}
          >
            {/* Citation Number Badge */}
            <div
              className={cn(
                'flex-shrink-0',
                'w-8 h-8',
                'flex items-center justify-center',
                'bg-blue-100 dark:bg-blue-900',
                'text-blue-600 dark:text-blue-300',
                'rounded-md',
                'text-sm font-bold'
              )}
            >
              {citation.number}
            </div>
            
            {/* Thumbnail - Phase 4: Lazy loading */}
            <div 
              className="flex-shrink-0 aspect-video bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden"
              style={{ width: `${citationConfig.referenceList.dimensions.thumbnailWidth}px` }}
            >
              <img
                src={citation.thumbnail}
                alt={citation.title}
                className={cn(
                  "w-full h-full",
                  citationConfig.referenceList.thumbnail.objectFit,
                  citationConfig.referenceList.thumbnail.objectPosition
                )}
                loading="lazy"
                decoding="async"
              />
            </div>
            
            {/* Details */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-1 leading-snug">
                {citation.title}
              </h4>
              
              {/* Channel */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {citation.channel}
              </div>
              
              {/* Meta */}
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {citation.durationFormatted} • {citation.uploadDate} • {citation.viewCountFormatted} views
              </div>
              
              {/* Watch Link */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVideoClick(citation.videoId);
                }}
                className={cn(
                  'mt-2',
                  'inline-flex items-center gap-1',
                  'text-xs text-blue-600 dark:text-blue-400',
                  'hover:text-blue-700 dark:hover:text-blue-300',
                  'transition-colors'
                )}
              >
                {t('citations.watchVideo', 'Watch Video')}
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
