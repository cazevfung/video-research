"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Copy, Check, Expand, ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { markdownConfig, animationDurations, streamingConfig, typography, mermaidConfig } from "@/config/visual-effects";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";

/** Set to true to enable verbose MermaidDiagram/MermaidExpandedView console logs (e.g. for debugging render/content issues). */
const MERMAID_DEBUG = false;
const logMd = (...a: unknown[]) => { if (MERMAID_DEBUG) console.log(...a); };
const warnMd = (...a: unknown[]) => { if (MERMAID_DEBUG) console.warn(...a); };

interface CodeProps {
  children: React.ReactNode;
  className?: string;
  language?: string;
}

// Global mermaid instance and initialization flag
let mermaidInstance: typeof import('mermaid') | null = null;
let mermaidInitialized = false;

/**
 * Initialize mermaid with theme and font configuration
 * @param isDark - Whether dark mode is active
 */
async function initializeMermaid(isDark: boolean) {
  if (mermaidInitialized && mermaidInstance) {
    // Update theme if already initialized
    const mermaid = mermaidInstance.default;
    mermaid.initialize({
      ...mermaidConfig.initialize,
      theme: isDark ? 'dark' : 'default',
      fontFamily: mermaidConfig.fontFamily,
      // Note: fontSize is not supported in Mermaid initialize()
      // Font size is controlled via CSS overrides after rendering
    });
    return mermaid;
  }

  // Dynamically import mermaid to avoid SSR issues
  if (!mermaidInstance) {
    mermaidInstance = await import('mermaid');
  }

  const mermaid = mermaidInstance.default;

  // Initialize mermaid with config-based settings
  mermaid.initialize({
    ...mermaidConfig.initialize,
    theme: isDark ? 'dark' : 'default',
    fontFamily: mermaidConfig.fontFamily,
    // Note: fontSize is not supported in Mermaid initialize()
    // Font size is controlled via CSS overrides after rendering
  });
  
  mermaidInitialized = true;

  return mermaid;
}

/**
 * MermaidExpandedView Component
 * Provides zoom and pan functionality for Mermaid diagrams
 */
function MermaidExpandedView({ 
  svgContent, 
  isOpen, 
  onClose 
}: { 
  svgContent: string; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  if (MERMAID_DEBUG) {
    logMd('🚨 [MermaidExpandedView] COMPONENT FUNCTION CALLED');
    logMd('[MermaidExpandedView] Props: isOpen:', isOpen, 'svgContent length:', svgContent?.length || 0);
    if (!svgContent || typeof svgContent !== 'string') logMd('  - svgContent is NOT a valid string');
  }

  const containerRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = React.useState<number>(mermaidConfig.zoom.default);
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();
  
  logMd('[MermaidExpandedView] State initialized');

  // Use the prop directly - no need for local state that can get out of sync
  const actualSvgContent = React.useMemo(() => {
    logMd('[MermaidExpandedView] Computing actualSvgContent, svgContent length:', svgContent?.length || 0);
    if (svgContent && typeof svgContent !== 'string') {
      if (MERMAID_DEBUG) console.error('[MermaidExpandedView] svgContent is NOT a string:', typeof svgContent);
    }

    // Always use the prop if it's valid
    if (svgContent && typeof svgContent === 'string' && svgContent.trim().length > 0 && svgContent.includes('<svg')) {
      logMd('[MermaidExpandedView] Using svgContent prop, length:', svgContent.length);
      return svgContent;
    }

    warnMd('[MermaidExpandedView] svgContent prop not valid, exists:', !!svgContent, 'includes <svg:', svgContent?.includes?.('<svg'));

    // Fallback: try to extract from DOM if prop is empty and modal is open
    if (isOpen) {
      logMd('[MermaidExpandedView] Prop empty, trying to extract from DOM');
      // Try multiple selectors to find the SVG
      const selectors = [
        '.mermaid-diagram svg',
        '[class*="mermaid"] svg',
        'svg[class*="flowchart"]',
        'svg[class*="graph"]'
      ];
      
      let mermaidDiagram: SVGElement | null = null;
      for (const selector of selectors) {
        mermaidDiagram = document.querySelector(selector);
        if (mermaidDiagram) {
          logMd('[MermaidExpandedView] Found SVG with selector:', selector);
          break;
        }
      }
      
      if (mermaidDiagram && mermaidDiagram.outerHTML) {
        const extractedSvg = mermaidDiagram.outerHTML;
        logMd('[MermaidExpandedView] Extracted SVG from DOM, length:', extractedSvg.length);
        if (extractedSvg && extractedSvg.includes('<svg')) return extractedSvg;
      }
      if (MERMAID_DEBUG) {
        const allSvgs = document.querySelectorAll('svg');
        logMd('[MermaidExpandedView] No SVG found with selectors, total SVGs on page:', allSvgs.length);
      }
    }
    return svgContent || '';
  }, [isOpen, svgContent]);

  // Reset zoom and pan when modal opens
  React.useEffect(() => {
    console.log('[MermaidExpandedView] 🔄 Reset zoom/pan useEffect triggered');
    console.log('[MermaidExpandedView] isOpen:', isOpen);
    if (isOpen) {
      console.log('[MermaidExpandedView] ✅ Modal opened, resetting zoom and pan');
      setZoomLevel(mermaidConfig.zoom.default);
      setPanOffset({ x: 0, y: 0 });
      
      // Check DOM state after a brief delay to see if elements are mounted
      setTimeout(() => {
        console.log('[MermaidExpandedView] 🔍 DOM state check after modal open:');
        console.log('  - svgRef.current:', !!svgRef.current);
        console.log('  - containerRef.current:', !!containerRef.current);
        if (svgRef.current) {
          console.log('  - svgRef.current.innerHTML length:', svgRef.current.innerHTML.length);
          console.log('  - svgRef.current.children count:', svgRef.current.children.length);
          console.log('  - svgRef.current.getBoundingClientRect:', svgRef.current.getBoundingClientRect());
          const svg = svgRef.current.querySelector('svg');
          console.log('  - SVG element found:', !!svg);
          if (svg) {
            console.log('  - SVG getBoundingClientRect:', svg.getBoundingClientRect());
          }
        }
      }, 100);
    }
  }, [isOpen]);

  // Effect to force visibility styles after content is set via dangerouslySetInnerHTML
  React.useLayoutEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[MermaidExpandedView] 🔄 useLayoutEffect triggered (for styling)');
    console.log('[MermaidExpandedView] Conditions check:');
    console.log('  - isOpen:', isOpen);
    console.log('  - svgRef.current:', !!svgRef.current);
    console.log('  - actualSvgContent length:', actualSvgContent?.length || 0);
    console.log('  - actualSvgContent includes <svg:', actualSvgContent?.includes('<svg') || false);
    
    if (!isOpen) {
      console.log('[MermaidExpandedView] ⚠️ Modal not open, skipping useLayoutEffect');
      console.log('═══════════════════════════════════════════════════════════');
      return;
    }
    
    if (!svgRef.current) {
      console.log('[MermaidExpandedView] ⚠️ svgRef.current is null - element not mounted yet');
      console.log('[MermaidExpandedView] This is OK - dangerouslySetInnerHTML will set content on render');
      console.log('═══════════════════════════════════════════════════════════');
      return;
    }
    
    // Content is already set via dangerouslySetInnerHTML, just ensure visibility
    console.log('[MermaidExpandedView] 🔍 Checking container state:');
    console.log('  - Container innerHTML length:', svgRef.current.innerHTML.length);
    console.log('  - Container innerHTML includes <svg:', svgRef.current.innerHTML.includes('<svg'));
    console.log('  - Container children count:', svgRef.current.children.length);
    console.log('  - Container children:', Array.from(svgRef.current.children).map(c => ({
      tagName: c.tagName,
      className: c.className,
      id: c.id
    })));
    
    const containerRect = svgRef.current.getBoundingClientRect();
    const containerStyles = window.getComputedStyle(svgRef.current);
    console.log('[MermaidExpandedView] Container dimensions and styles:');
    console.log('  - getBoundingClientRect:', containerRect);
    console.log('  - offsetWidth:', (svgRef.current as unknown as HTMLElement).offsetWidth);
    console.log('  - offsetHeight:', (svgRef.current as unknown as HTMLElement).offsetHeight);
    console.log('  - clientWidth:', (svgRef.current as unknown as HTMLElement).clientWidth);
    console.log('  - clientHeight:', (svgRef.current as unknown as HTMLElement).clientHeight);
    console.log('  - scrollWidth:', svgRef.current.scrollWidth);
    console.log('  - scrollHeight:', svgRef.current.scrollHeight);
    console.log('  - display:', containerStyles.display);
    console.log('  - visibility:', containerStyles.visibility);
    console.log('  - opacity:', containerStyles.opacity);
    console.log('  - width:', containerStyles.width);
    console.log('  - height:', containerStyles.height);
    console.log('  - position:', containerStyles.position);
    console.log('  - overflow:', containerStyles.overflow);
    console.log('  - z-index:', containerStyles.zIndex);
    
    const svgElement = svgRef.current.querySelector('svg') as SVGSVGElement | null;
    if (svgElement) {
      console.log('[MermaidExpandedView] ✅✅✅ SVG ELEMENT FOUND ✅✅✅');
      console.log('[MermaidExpandedView] SVG attributes:');
      console.log('  - tagName:', svgElement.tagName);
      console.log('  - id:', svgElement.id);
      console.log('  - className:', svgElement.className);
      console.log('  - width attr:', svgElement.getAttribute('width'));
      console.log('  - height attr:', svgElement.getAttribute('height'));
      console.log('  - viewBox:', svgElement.getAttribute('viewBox'));
      
      const svgRect = svgElement.getBoundingClientRect();
      const svgStyles = window.getComputedStyle(svgElement);
      console.log('[MermaidExpandedView] SVG dimensions BEFORE styling:');
      console.log('  - getBoundingClientRect:', svgRect);
      console.log('  - offsetWidth:', (svgElement as unknown as HTMLElement).offsetWidth);
      console.log('  - offsetHeight:', (svgElement as unknown as HTMLElement).offsetHeight);
      console.log('  - clientWidth:', svgElement.clientWidth);
      console.log('  - clientHeight:', svgElement.clientHeight);
      console.log('  - display:', svgStyles.display);
      console.log('  - visibility:', svgStyles.visibility);
      console.log('  - opacity:', svgStyles.opacity);
      console.log('  - width:', svgStyles.width);
      console.log('  - height:', svgStyles.height);
      console.log('  - max-width:', svgStyles.maxWidth);
      console.log('  - max-height:', svgStyles.maxHeight);
      console.log('  - position:', svgStyles.position);
      
      // TESTING: Force a test height first
      console.log('═══════════════════════════════════════════════════════════');
      console.log('[MermaidExpandedView] 🧪 TESTING: FORCING SVG HEIGHT IN useLayoutEffect 🧪');
      const TEST_HEIGHT = 500; // Force 500px height for testing
      
      // CRITICAL: Remove height: auto from inline style attribute if it exists
      const currentStyle = svgElement.getAttribute('style') || '';
      console.log('[MermaidExpandedView] SVG current style attribute:', currentStyle);
      if (currentStyle.includes('height: auto') || currentStyle.includes('height:auto')) {
        const newStyle = currentStyle.replace(/height:\s*auto\s*!important[^;]*;?/gi, '').replace(/height:\s*auto[^;]*;?/gi, '');
        svgElement.setAttribute('style', newStyle);
        console.log('[MermaidExpandedView] ✅ Removed height: auto from style attribute');
        console.log('[MermaidExpandedView] New style attribute:', svgElement.getAttribute('style'));
      }
      
      // Now set the height
      svgElement.style.removeProperty('height'); // Remove any auto value first
      svgElement.style.setProperty('height', `${TEST_HEIGHT}px`, 'important');
      svgElement.style.setProperty('width', '100%', 'important');
      svgElement.style.setProperty('min-height', `${TEST_HEIGHT}px`, 'important');
      svgElement.style.setProperty('display', 'block', 'important');
      svgElement.style.setProperty('visibility', 'visible', 'important');
      svgElement.style.setProperty('opacity', '1', 'important');
      svgRef.current.style.setProperty('min-height', `${TEST_HEIGHT}px`, 'important');
      svgRef.current.style.setProperty('height', 'auto', 'important');
      console.log('[MermaidExpandedView] ✅ FORCED TEST HEIGHT:', TEST_HEIGHT, 'px');
      console.log('[MermaidExpandedView] SVG final style.height:', svgElement.style.height);
      const testRect = svgElement.getBoundingClientRect();
      console.log('[MermaidExpandedView] SVG rect after forcing height:', testRect);
      console.log('[MermaidExpandedView] Container rect after forcing:', svgRef.current.getBoundingClientRect());
      
      // CRITICAL FIX: Calculate SVG height from viewBox aspect ratio
      console.log('═══════════════════════════════════════════════════════════');
      console.log('[MermaidExpandedView] 📏 CALCULATING SVG HEIGHT IN useLayoutEffect 📏');
      const viewBox = svgElement.getAttribute('viewBox');
      console.log('[MermaidExpandedView] viewBox attribute:', viewBox);
      console.log('[MermaidExpandedView] SVG height attribute:', svgElement.getAttribute('height'));
      console.log('[MermaidExpandedView] SVG width attribute:', svgElement.getAttribute('width'));
      console.log('[MermaidExpandedView] SVG current style.height:', svgElement.style.height);
      
      if (viewBox && !svgElement.getAttribute('height')) {
        console.log('[MermaidExpandedView] ✅ viewBox exists and no height attribute - calculating from aspect ratio');
        const viewBoxParts = viewBox.split(/\s+/);
        console.log('[MermaidExpandedView] viewBox parts:', viewBoxParts);
        const [, , vw, vh] = viewBoxParts.map(Number);
        console.log('[MermaidExpandedView] Parsed viewBox values:');
        console.log('  - viewBox x:', viewBoxParts[0]);
        console.log('  - viewBox y:', viewBoxParts[1]);
        console.log('  - viewBox width (vw):', vw);
        console.log('  - viewBox height (vh):', vh);
        
        if (vw && vh) {
          const aspectRatio = vh / vw;
          console.log('[MermaidExpandedView] ✅ Aspect ratio calculated:', aspectRatio, `(${vh}/${vw})`);
          
          const containerWidth = (svgRef.current as unknown as HTMLElement).offsetWidth || (svgRef.current as unknown as HTMLElement).clientWidth;
          const containerClientWidth = (svgRef.current as unknown as HTMLElement).clientWidth;
          const containerScrollWidth = svgRef.current.scrollWidth;
          console.log('[MermaidExpandedView] Container dimensions:');
          console.log('  - offsetWidth:', (svgRef.current as unknown as HTMLElement).offsetWidth);
          console.log('  - clientWidth:', containerClientWidth);
          console.log('  - scrollWidth:', containerScrollWidth);
          console.log('  - offsetHeight:', (svgRef.current as unknown as HTMLElement).offsetHeight);
          console.log('  - clientHeight:', (svgRef.current as unknown as HTMLElement).clientHeight);
          console.log('  - scrollHeight:', svgRef.current.scrollHeight);
          console.log('  - getBoundingClientRect:', svgRef.current.getBoundingClientRect());
          
          if (containerWidth > 0) {
            const calculatedHeight = containerWidth * aspectRatio;
            console.log('[MermaidExpandedView] ✅✅✅ CALCULATED HEIGHT:', calculatedHeight, 'px');
            console.log('[MermaidExpandedView] Calculation: containerWidth (', containerWidth, ') × aspectRatio (', aspectRatio, ') = ', calculatedHeight);
            
            // CRITICAL: Also ensure container has height
            const containerHeight = (svgRef.current as unknown as HTMLElement).offsetHeight || (svgRef.current as unknown as HTMLElement).clientHeight;
            console.log('[MermaidExpandedView] Container height check:');
            console.log('  - offsetHeight:', (svgRef.current as unknown as HTMLElement).offsetHeight);
            console.log('  - clientHeight:', (svgRef.current as unknown as HTMLElement).clientHeight);
            console.log('  - scrollHeight:', svgRef.current.scrollHeight);
            
            if (containerHeight === 0 || containerHeight < calculatedHeight) {
              console.warn('[MermaidExpandedView] ⚠️ Container has zero or insufficient height, setting min-height');
              svgRef.current.style.setProperty('min-height', `${calculatedHeight}px`, 'important');
              svgRef.current.style.setProperty('height', 'auto', 'important');
            }
            
            const beforeHeight = svgElement.style.height || svgElement.getAttribute('height') || 'none';
            const beforeRect = svgElement.getBoundingClientRect();
            console.log('[MermaidExpandedView] SVG dimensions BEFORE setting height:');
            console.log('  - style.height:', beforeHeight);
            console.log('  - height attribute:', svgElement.getAttribute('height'));
            console.log('  - getBoundingClientRect:', beforeRect);
            console.log('  - offsetWidth:', (svgElement as unknown as HTMLElement).offsetWidth);
            console.log('  - offsetHeight:', (svgElement as unknown as HTMLElement).offsetHeight);
            
            // Set both width and height explicitly
            svgElement.style.setProperty('width', '100%', 'important');
            svgElement.style.setProperty('height', `${calculatedHeight}px`, 'important');
            svgElement.style.setProperty('min-height', `${calculatedHeight}px`, 'important');
            
            // Force a reflow
            void (svgElement as unknown as HTMLElement).offsetHeight;
            
            const afterHeight = svgElement.style.height;
            const afterHeightAttr = svgElement.getAttribute('height');
            const afterRect = svgElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(svgElement);
            const containerComputedStyle = window.getComputedStyle(svgRef.current);
            console.log('[MermaidExpandedView] ✅ SVG dimensions AFTER setting height:');
            console.log('  - style.height:', afterHeight);
            console.log('  - style.min-height:', svgElement.style.minHeight);
            console.log('  - height attribute:', afterHeightAttr);
            console.log('  - computed style.height:', computedStyle.height);
            console.log('  - computed style.width:', computedStyle.width);
            console.log('  - computed style.min-height:', computedStyle.minHeight);
            console.log('  - getBoundingClientRect:', afterRect);
            console.log('  - offsetWidth:', (svgElement as unknown as HTMLElement).offsetWidth);
            console.log('  - offsetHeight:', (svgElement as unknown as HTMLElement).offsetHeight);
            console.log('  - clientWidth:', svgElement.clientWidth);
            console.log('  - clientHeight:', svgElement.clientHeight);
            console.log('[MermaidExpandedView] Container computed styles:');
            console.log('  - height:', containerComputedStyle.height);
            console.log('  - min-height:', containerComputedStyle.minHeight);
            console.log('  - display:', containerComputedStyle.display);
            
            if (afterRect.height === 0) {
              console.error('[MermaidExpandedView] ❌❌❌ SVG STILL HAS ZERO HEIGHT AFTER SETTING! ❌❌❌');
              console.error('[MermaidExpandedView] Container rect:', svgRef.current.getBoundingClientRect());
              console.error('[MermaidExpandedView] This indicates a CSS or layout issue preventing the height from taking effect');
              console.error('[MermaidExpandedView] Possible causes:');
              console.error('  1. Container has zero height');
              console.error('  2. CSS is overriding the height');
              console.error('  3. Parent element has zero height');
              console.error('  4. Display/position issues');
            } else {
              console.log('[MermaidExpandedView] ✅✅✅ SVG HEIGHT SUCCESSFULLY SET TO:', afterRect.height, 'px ✅✅✅');
              console.log('[MermaidExpandedView] SVG dimensions:', afterRect.width, '×', afterRect.height);
            }
          } else {
            console.error('[MermaidExpandedView] ❌ Container width is 0 or invalid:', containerWidth);
            console.error('[MermaidExpandedView] Cannot calculate height - container has no width');
            console.error('[MermaidExpandedView] Container rect:', svgRef.current.getBoundingClientRect());
            console.error('[MermaidExpandedView] Container computed styles:', window.getComputedStyle(svgRef.current));
          }
        } else {
          console.error('[MermaidExpandedView] ❌ Invalid viewBox dimensions:', { vw, vh });
        }
      } else {
        if (!viewBox) {
          console.log('[MermaidExpandedView] ⚠️ No viewBox attribute found - cannot calculate aspect ratio');
        }
        if (svgElement.getAttribute('height')) {
          console.log('[MermaidExpandedView] ⚠️ SVG already has height attribute:', svgElement.getAttribute('height'));
          const existingHeight = svgElement.getAttribute('height');
          const rect = svgElement.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(svgElement);
          console.log('[MermaidExpandedView] Existing height details:');
          console.log('  - height attribute:', existingHeight);
          console.log('  - style.height:', svgElement.style.height);
          console.log('  - computed style.height:', computedStyle.height);
          console.log('  - getBoundingClientRect height:', rect.height);
          console.log('  - offsetHeight:', (svgElement as unknown as HTMLElement).offsetHeight);
          if (rect.height === 0) {
            console.error('[MermaidExpandedView] ❌ SVG has height attribute but getBoundingClientRect shows 0 height!');
          }
        }
      }
      console.log('═══════════════════════════════════════════════════════════');
      
      // Force visibility styles
      svgElement.style.setProperty('display', 'block', 'important');
      svgElement.style.setProperty('visibility', 'visible', 'important');
      svgElement.style.setProperty('opacity', '1', 'important');
      svgElement.style.setProperty('max-width', '100%', 'important');
      svgElement.style.setProperty('max-height', '100%', 'important');
      svgElement.style.setProperty('width', '100%', 'important');
      // CRITICAL: Remove height: auto override - it prevents the height from working
      svgElement.style.removeProperty('height');
      svgElement.style.setProperty('height', `${TEST_HEIGHT}px`, 'important');
      
      svgRef.current.style.setProperty('display', 'flex', 'important');
      svgRef.current.style.setProperty('visibility', 'visible', 'important');
      svgRef.current.style.setProperty('opacity', '1', 'important');
      svgRef.current.style.setProperty('width', '100%', 'important');
      svgRef.current.style.setProperty('height', '100%', 'important');
      
      // Check AFTER applying styles
      const svgRectAfter = svgElement.getBoundingClientRect();
      const svgStylesAfter = window.getComputedStyle(svgElement);
      console.log('[MermaidExpandedView] ✅ SVG styles forced');
      console.log('[MermaidExpandedView] SVG dimensions AFTER styling:');
      console.log('  - getBoundingClientRect:', svgRectAfter);
      console.log('  - offsetWidth:', (svgElement as unknown as HTMLElement).offsetWidth);
      console.log('  - offsetHeight:', (svgElement as unknown as HTMLElement).offsetHeight);
      console.log('  - display:', svgStylesAfter.display);
      console.log('  - visibility:', svgStylesAfter.visibility);
      console.log('  - opacity:', svgStylesAfter.opacity);
      console.log('  - width:', svgStylesAfter.width);
      console.log('  - height:', svgStylesAfter.height);
      
      // Check if SVG is actually visible
      if (svgRectAfter.width === 0 || svgRectAfter.height === 0) {
        console.error('[MermaidExpandedView] ❌❌❌ SVG HAS ZERO DIMENSIONS ❌❌❌');
        console.error('[MermaidExpandedView] This is why it\'s not visible!');
        console.error('[MermaidExpandedView] SVG viewBox:', svgElement.getAttribute('viewBox'));
        console.error('[MermaidExpandedView] SVG width attr:', svgElement.getAttribute('width'));
        console.error('[MermaidExpandedView] SVG height attr:', svgElement.getAttribute('height'));
      } else {
        console.log('[MermaidExpandedView] ✅ SVG has dimensions:', svgRectAfter.width, 'x', svgRectAfter.height);
      }
    } else {
      console.error('[MermaidExpandedView] ❌❌❌ NO SVG ELEMENT FOUND IN CONTAINER ❌❌❌');
      console.error('[MermaidExpandedView] Container innerHTML:', svgRef.current.innerHTML.substring(0, 1000));
      console.error('[MermaidExpandedView] Container children:', Array.from(svgRef.current.children).map(c => ({
        tagName: c.tagName,
        className: c.className,
        id: c.id,
        innerHTML: c.innerHTML.substring(0, 200)
      })));
    }
    console.log('═══════════════════════════════════════════════════════════');
  }, [isOpen, actualSvgContent]);


  // Fallback: Use MutationObserver + delayed attempts to catch portal-rendered content
  React.useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[MermaidExpandedView] ⏰ FALLBACK useEffect triggered');
    console.log('[MermaidExpandedView] Conditions check:');
    console.log('  - isOpen:', isOpen);
    console.log('  - actualSvgContent exists:', !!actualSvgContent);
    console.log('  - actualSvgContent length:', actualSvgContent?.length || 0);
    console.log('  - actualSvgContent includes <svg:', actualSvgContent?.includes('<svg') || false);
    console.log('  - svgRef.current:', !!svgRef.current);
    
    if (!isOpen || !actualSvgContent || !actualSvgContent.includes('<svg')) {
      console.log('[MermaidExpandedView] ⏰ Fallback useEffect skipped - conditions not met');
      if (!isOpen) console.log('  ❌ isOpen is false');
      if (!actualSvgContent) console.log('  ❌ actualSvgContent is empty');
      if (actualSvgContent && !actualSvgContent.includes('<svg')) console.log('  ❌ actualSvgContent does not include <svg');
      console.log('═══════════════════════════════════════════════════════════');
      return;
    }

    console.log('[MermaidExpandedView] ✅ All conditions met, starting fallback attempts');
    console.log('[MermaidExpandedView] actualSvgContent length:', actualSvgContent.length);
    console.log('[MermaidExpandedView] actualSvgContent preview:', actualSvgContent.substring(0, 300));
    
    let found = false;
    const timeouts: NodeJS.Timeout[] = [];
    
    // Function to set SVG content
    const setSvgContent = (element: HTMLDivElement, source: string) => {
      if (found) {
        console.log(`[MermaidExpandedView] ⚠️ Already set SVG content, skipping ${source}`);
        return; // Already set
      }
      
      console.log(`[MermaidExpandedView] ✅✅✅ Setting SVG content via ${source}`);
      console.log('[MermaidExpandedView] Element before setting:');
      console.log('  - innerHTML length:', element.innerHTML.length);
      console.log('  - children count:', element.children.length);
      console.log('  - isConnected:', element.isConnected);
      console.log('  - getBoundingClientRect:', element.getBoundingClientRect());
      
      element.innerHTML = actualSvgContent;
      svgRef.current = element; // Update ref
      
      console.log('[MermaidExpandedView] Element after setting:');
      console.log('  - innerHTML length:', element.innerHTML.length);
      console.log('  - children count:', element.children.length);
      console.log('  - innerHTML includes <svg:', element.innerHTML.includes('<svg'));
      
      const svgElement = element.querySelector('svg') as SVGSVGElement | null;
      if (svgElement) {
        console.log('[MermaidExpandedView] ✅✅✅ SVG ELEMENT FOUND AFTER SETTING CONTENT');
        console.log('[MermaidExpandedView] SVG details:');
        console.log('  - tagName:', svgElement.tagName);
        console.log('  - id:', svgElement.id);
        console.log('  - className:', svgElement.className);
        console.log('  - viewBox:', svgElement.getAttribute('viewBox'));
        console.log('  - width:', svgElement.getAttribute('width'));
        console.log('  - height:', svgElement.getAttribute('height'));
        
        svgElement.style.setProperty('display', 'block', 'important');
        svgElement.style.setProperty('visibility', 'visible', 'important');
        svgElement.style.setProperty('opacity', '1', 'important');
        svgElement.style.setProperty('max-width', '100%', 'important');
        svgElement.style.setProperty('max-height', '100%', 'important');
        svgElement.style.setProperty('width', 'auto', 'important');
        svgElement.style.setProperty('height', 'auto', 'important');
        
        element.style.setProperty('display', 'flex', 'important');
        element.style.setProperty('visibility', 'visible', 'important');
        element.style.setProperty('opacity', '1', 'important');
        
        const svgComputedStyle = window.getComputedStyle(svgElement);
        console.log('[MermaidExpandedView] ✅✅✅ SVG CONTENT SET AND VISIBLE!');
        console.log('[MermaidExpandedView] SVG computed styles:');
        console.log('  - display:', svgComputedStyle.display);
        console.log('  - visibility:', svgComputedStyle.visibility);
        console.log('  - opacity:', svgComputedStyle.opacity);
        console.log('[MermaidExpandedView] SVG getBoundingClientRect:', svgElement.getBoundingClientRect());
        console.log('[MermaidExpandedView] SVG offsetWidth:', (svgElement as unknown as HTMLElement).offsetWidth);
        console.log('[MermaidExpandedView] SVG offsetHeight:', (svgElement as unknown as HTMLElement).offsetHeight);
        found = true;
      } else {
        console.error(`[MermaidExpandedView] ❌❌❌ NO SVG ELEMENT FOUND AFTER SETTING INNERHTML via ${source}!`);
        console.error('[MermaidExpandedView] Element innerHTML:', element.innerHTML.substring(0, 500));
        console.error('[MermaidExpandedView] Element children:', Array.from(element.children).map(c => ({
          tagName: c.tagName,
          className: c.className,
          innerHTML: c.innerHTML.substring(0, 100)
        })));
      }
    };
    
    // Try multiple times with increasing delays
    const attempts = [0, 50, 100, 200, 500, 1000];
    attempts.forEach((delay, index) => {
      const timeout = setTimeout(() => {
        if (found) {
          console.log(`[MermaidExpandedView] ⏭️ Attempt ${index + 1}/${attempts.length} skipped - already found`);
          return;
        }
        
        const timestamp = new Date().toISOString();
        console.log(`[MermaidExpandedView] 🔍 Attempt ${index + 1}/${attempts.length} at ${timestamp} (delay: ${delay}ms)`);
        
        // First try the ref
        if (svgRef.current) {
          console.log('[MermaidExpandedView] ✅ Found svgRef.current in attempt');
          setSvgContent(svgRef.current, `attempt-${index + 1}-ref`);
          return;
        }
        
        // Fallback: Try to find the element in the DOM directly
        console.log('[MermaidExpandedView] Querying DOM for dialog...');
        const dialogContent = document.querySelector('[role="dialog"][data-state="open"]');
        if (dialogContent) {
          console.log('[MermaidExpandedView] ✅ Found open dialog in DOM');
          console.log('[MermaidExpandedView] Dialog details:');
          console.log('  - tagName:', dialogContent.tagName);
          console.log('  - className:', dialogContent.className);
          console.log('  - id:', dialogContent.id);
          console.log('  - children count:', dialogContent.children.length);
          console.log('  - innerHTML length:', dialogContent.innerHTML.length);
          console.log('  - getBoundingClientRect:', dialogContent.getBoundingClientRect());
          
          // Log all children
          Array.from(dialogContent.children).forEach((child, idx) => {
            console.log(`[MermaidExpandedView] Dialog child ${idx}:`, {
              tagName: child.tagName,
              className: child.className,
              id: child.id,
              children: child.children.length
            });
          });
          
          const mermaidDiv = dialogContent.querySelector('.mermaid-diagram') as HTMLDivElement | null;
          if (mermaidDiv) {
            console.log('[MermaidExpandedView] ✅✅✅ Found mermaid-diagram div in DOM');
            console.log('[MermaidExpandedView] Mermaid div details:');
            console.log('  - tagName:', mermaidDiv.tagName);
            console.log('  - className:', mermaidDiv.className);
            console.log('  - innerHTML length:', mermaidDiv.innerHTML.length);
            console.log('  - children count:', mermaidDiv.children.length);
            console.log('  - getBoundingClientRect:', mermaidDiv.getBoundingClientRect());
            setSvgContent(mermaidDiv, `attempt-${index + 1}-dom-query`);
          } else {
            console.log('[MermaidExpandedView] ⚠️ Dialog found but no mermaid-diagram div');
            console.log('[MermaidExpandedView] Searching for any div with mermaid class...');
            const allMermaidDivs = dialogContent.querySelectorAll('[class*="mermaid"]');
            console.log('[MermaidExpandedView] Found mermaid-related elements:', allMermaidDivs.length);
            allMermaidDivs.forEach((div, idx) => {
              console.log(`[MermaidExpandedView] Mermaid element ${idx}:`, {
                tagName: div.tagName,
                className: div.className,
                innerHTML: div.innerHTML.substring(0, 100)
              });
            });
          }
        } else {
          console.log('[MermaidExpandedView] ⚠️ No open dialog found in DOM yet');
          const anyDialog = document.querySelector('[role="dialog"]');
          console.log('[MermaidExpandedView] Any dialog found:', !!anyDialog);
          if (anyDialog) {
            console.log('[MermaidExpandedView] Dialog data-state:', anyDialog.getAttribute('data-state'));
            console.log('[MermaidExpandedView] Dialog getBoundingClientRect:', anyDialog.getBoundingClientRect());
          }
          
          // Also check for DialogContent
          const dialogContentElements = document.querySelectorAll('[class*="DialogContent"], [class*="dialog-content"]');
          console.log('[MermaidExpandedView] DialogContent-like elements found:', dialogContentElements.length);
        }
      }, delay);
      timeouts.push(timeout);
    });
    
    // Also use MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      if (found) return;
      
      console.log('[MermaidExpandedView] 🔍 MutationObserver detected DOM change');
      console.log('[MermaidExpandedView] Mutations count:', mutations.length);
      mutations.forEach((mutation, idx) => {
        console.log(`[MermaidExpandedView] Mutation ${idx}:`, {
          type: mutation.type,
          target: mutation.target.nodeName,
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length
        });
      });
      
      const dialogContent = document.querySelector('[role="dialog"][data-state="open"]');
      if (dialogContent) {
        console.log('[MermaidExpandedView] ✅ MutationObserver found open dialog');
        const mermaidDiv = dialogContent.querySelector('.mermaid-diagram') as HTMLDivElement | null;
        if (mermaidDiv) {
          console.log('[MermaidExpandedView] ✅ MutationObserver found mermaid-diagram div');
          console.log('[MermaidExpandedView] Mermaid div innerHTML includes <svg:', mermaidDiv.innerHTML.includes('<svg'));
          if (!mermaidDiv.innerHTML.includes('<svg')) {
            setSvgContent(mermaidDiv, 'mutation-observer');
          } else {
            console.log('[MermaidExpandedView] ⚠️ Mermaid div already has SVG content');
          }
        } else {
          console.log('[MermaidExpandedView] ⚠️ MutationObserver: Dialog found but no mermaid-diagram div');
        }
      }
    });
    
    // Start observing
    console.log('[MermaidExpandedView] 🔍 Starting MutationObserver');
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    return () => {
      console.log('[MermaidExpandedView] 🧹 Cleaning up fallback useEffect');
      timeouts.forEach(timeout => clearTimeout(timeout));
      observer.disconnect();
    };
  }, [isOpen, actualSvgContent]);

  // Handle zoom in
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + mermaidConfig.zoom.step, mermaidConfig.zoom.max));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - mermaidConfig.zoom.step, mermaidConfig.zoom.min));
  };

  // Handle zoom reset
  const handleZoomReset = () => {
    setZoomLevel(mermaidConfig.zoom.default);
    setPanOffset({ x: 0, y: 0 });
  };

  // Handle mouse wheel zoom
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -mermaidConfig.zoom.step : mermaidConfig.zoom.step;
      setZoomLevel((prev) => {
        const newZoom = Math.max(
          mermaidConfig.zoom.min,
          Math.min(mermaidConfig.zoom.max, prev + delta)
        );
        return newZoom;
      });
    }
  }, []);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  // Handle drag
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  // Handle drag end
  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // Attach mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPanOffset((prev) => ({ ...prev, x: prev.x + 20 }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPanOffset((prev) => ({ ...prev, x: prev.x - 20 }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPanOffset((prev) => ({ ...prev, y: prev.y + 20 }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPanOffset((prev) => ({ ...prev, y: prev.y - 20 }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  console.log('🎨🎨🎨 [MermaidExpandedView] RENDER PHASE START 🎨🎨🎨');
  console.log('[MermaidExpandedView] Render conditions:');
  console.log('  - isOpen:', isOpen, typeof isOpen);
  console.log('  - actualSvgContent:', actualSvgContent, typeof actualSvgContent);
  console.log('  - actualSvgContent length:', actualSvgContent?.length || 0);
  console.log('  - actualSvgContent trimmed length:', actualSvgContent?.trim?.()?.length || 0);
  console.log('  - actualSvgContent includes <svg:', actualSvgContent?.includes?.('<svg') || false);
  
  if (!isOpen) {
    console.log('[MermaidExpandedView] ⚠️ Modal not open, returning null');
    console.log('[MermaidExpandedView] isOpen value:', isOpen);
    return null;
  }

  // Validate SVG content before rendering
  const isValidSvg = actualSvgContent && typeof actualSvgContent === 'string' && actualSvgContent.trim().length > 0 && actualSvgContent.includes('<svg');
  
  console.log('[MermaidExpandedView] ✅ Modal is open, checking content:');
  console.log('  - isValidSvg:', isValidSvg);
  console.log('  - actualSvgContent exists:', !!actualSvgContent);
  console.log('  - actualSvgContent is string:', typeof actualSvgContent === 'string');
  console.log('  - actualSvgContent length:', actualSvgContent?.length || 0);
  console.log('  - actualSvgContent trimmed length:', actualSvgContent?.trim?.()?.length || 0);
  console.log('  - actualSvgContent includes <svg:', actualSvgContent?.includes?.('<svg') || false);
  console.log('  - svgRef.current:', !!svgRef.current);
  console.log('  - containerRef.current:', !!containerRef.current);
  if (actualSvgContent && typeof actualSvgContent === 'string') {
    console.log('  - actualSvgContent preview (first 500 chars):', actualSvgContent.substring(0, 500));
    console.log('  - actualSvgContent preview (last 200 chars):', actualSvgContent.substring(Math.max(0, actualSvgContent.length - 200)));
  } else {
    console.error('  - ❌ actualSvgContent is NOT a string!');
    console.error('  - actualSvgContent value:', actualSvgContent);
    console.error('  - actualSvgContent type:', typeof actualSvgContent);
  }

  console.log('[MermaidExpandedView] 🎬 Rendering Dialog component');
  console.log('[MermaidExpandedView] Dialog open prop:', isOpen);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('[MermaidExpandedView] 🔄 Dialog onOpenChange called with:', open);
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent
        className={cn(
          mermaidConfig.expandedView.maxWidth,
          mermaidConfig.expandedView.maxHeight,
          mermaidConfig.expandedView.padding,
          mermaidConfig.expandedView.background,
          mermaidConfig.expandedView.borderRadius,
          mermaidConfig.expandedView.border,
          // CRITICAL: give the flex container a real height so the `flex-1` diagram
          // area doesn't collapse (max-height alone is not enough).
          "flex flex-col p-0 overflow-hidden h-[95vh]"
        )}
        onWheel={handleWheel}
        ref={(el) => {
          console.log('[MermaidExpandedView] 📦 DialogContent ref callback fired');
          console.log('[MermaidExpandedView] DialogContent element:', !!el);
          if (el) {
            console.log('[MermaidExpandedView] DialogContent getBoundingClientRect:', el.getBoundingClientRect());
            console.log('[MermaidExpandedView] DialogContent children:', el.children.length);
          }
        }}
      >
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">Mermaid Diagram - Expanded View</DialogTitle>
        
        {/* Header with controls */}
        <div className="flex items-center justify-between p-4 border-b border-theme-border-primary">
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= mermaidConfig.zoom.min}
              className={cn(
                "p-2 rounded-md",
                "bg-theme-bg-secondary hover:bg-theme-bg-tertiary",
                "border border-theme-border-primary",
                "text-theme-text-secondary hover:text-theme-text-primary",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all"
              )}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className={cn(typography.fontSize.base, "text-theme-text-primary min-w-[60px] text-center")}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= mermaidConfig.zoom.max}
              className={cn(
                "p-2 rounded-md",
                "bg-theme-bg-secondary hover:bg-theme-bg-tertiary",
                "border border-theme-border-primary",
                "text-theme-text-secondary hover:text-theme-text-primary",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all"
              )}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomReset}
              className={cn(
                "p-2 rounded-md",
                "bg-theme-bg-secondary hover:bg-theme-bg-tertiary",
                "border border-theme-border-primary",
                "text-theme-text-secondary hover:text-theme-text-primary",
                "transition-all"
              )}
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-md",
              "bg-theme-bg-secondary hover:bg-theme-bg-tertiary",
              "border border-theme-border-primary",
              "text-theme-text-secondary hover:text-theme-text-primary",
              "transition-all"
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Diagram container with zoom and pan */}
        <div
          ref={(el) => {
            containerRef.current = el;
            console.log('[MermaidExpandedView] 📦 Container ref callback fired');
            console.log('[MermaidExpandedView] Container element:', !!el);
            if (el) {
              console.log('[MermaidExpandedView] Container getBoundingClientRect:', el.getBoundingClientRect());
              console.log('[MermaidExpandedView] Container children:', el.children.length);
            }
          }}
          className="flex-1 min-h-0 overflow-hidden relative bg-theme-bg-tertiary"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
        >
          {/* Debug indicator */}
          {isOpen && (
            <div className="absolute top-2 left-2 z-50 bg-red-500/90 text-white text-xs p-2 rounded">
              Debug: contentLen={actualSvgContent?.length || 0}, isValid={String(isValidSvg)}, hasRef={!!svgRef.current}, children={svgRef.current?.children.length || 0}
              {svgRef.current && (() => {
                const svg = svgRef.current?.querySelector('svg');
                if (svg) {
                  const rect = svg.getBoundingClientRect();
                  return `, SVG: ${Math.round(rect.width)}×${Math.round(rect.height)}px`;
                }
                return ', SVG: not found';
              })()}
            </div>
          )}
          {isValidSvg && actualSvgContent ? (
            (() => {
              console.log('🎯🎯🎯 [MermaidExpandedView] RENDERING SVG DIV 🎯🎯🎯');
              console.log('[MermaidExpandedView] isValidSvg:', isValidSvg);
              console.log('[MermaidExpandedView] actualSvgContent exists:', !!actualSvgContent);
              console.log('[MermaidExpandedView] actualSvgContent length:', actualSvgContent?.length || 0);
              console.log('[MermaidExpandedView] About to set dangerouslySetInnerHTML with:', actualSvgContent?.substring(0, 200));
              return (
                <div
                  ref={(el) => {
                    svgRef.current = el;
                    // Element is null during unmount - normal React behavior.
                    if (!el) return;
                    console.log('🔗🔗🔗 [MermaidExpandedView] SVG DIV REF CALLBACK FIRED 🔗🔗🔗');
                    console.log('[MermaidExpandedView] Element:', !!el);
                    if (el) {
                      console.log('[MermaidExpandedView] Element details:', {
                        tagName: el.tagName,
                        className: el.className,
                        innerHTML: el.innerHTML.length,
                        children: el.children.length,
                        isConnected: el.isConnected,
                        innerHTMLPreview: el.innerHTML.substring(0, 200)
                      });
                      // Force visibility styles on the container
                      el.style.setProperty('display', 'flex', 'important');
                      el.style.setProperty('visibility', 'visible', 'important');
                      el.style.setProperty('opacity', '1', 'important');
                      
                      // Also force styles on any SVG inside
                      const svg = el.querySelector('svg');
                      if (svg) {
                        console.log('[MermaidExpandedView] ✅✅✅ SVG FOUND IN REF CALLBACK ✅✅✅');
                        console.log('[MermaidExpandedView] SVG details:', {
                          tagName: svg.tagName,
                          className: svg.className,
                          width: svg.getAttribute('width'),
                          height: svg.getAttribute('height'),
                          viewBox: svg.getAttribute('viewBox'),
                          getBoundingClientRect: svg.getBoundingClientRect()
                        });
                        
                        // TESTING: Force a test height to see if that's the issue
                        console.log('═══════════════════════════════════════════════════════════');
                        console.log('[MermaidExpandedView] 🧪 TESTING: FORCING SVG HEIGHT 🧪');
                        const TEST_HEIGHT = 500; // Force 500px height for testing
                        
                        // CRITICAL: Remove height: auto from inline style attribute if it exists
                        const currentStyle = svg.getAttribute('style') || '';
                        console.log('[MermaidExpandedView] SVG current style attribute:', currentStyle);
                        if (currentStyle.includes('height: auto')) {
                          const newStyle = currentStyle.replace(/height:\s*auto[^;]*;?/gi, '').replace(/height:\s*auto\s*!important[^;]*;?/gi, '');
                          svg.setAttribute('style', newStyle);
                          console.log('[MermaidExpandedView] ✅ Removed height: auto from style attribute');
                          console.log('[MermaidExpandedView] New style attribute:', svg.getAttribute('style'));
                        }
                        
                        // Now set the height
                        svg.style.setProperty('height', `${TEST_HEIGHT}px`, 'important');
                        svg.style.setProperty('width', '100%', 'important');
                        svg.style.setProperty('min-height', `${TEST_HEIGHT}px`, 'important');
                        svg.style.setProperty('display', 'block', 'important');
                        svg.style.setProperty('visibility', 'visible', 'important');
                        svg.style.setProperty('opacity', '1', 'important');
                        svg.style.removeProperty('height'); // Remove any auto value
                        svg.style.setProperty('height', `${TEST_HEIGHT}px`, 'important'); // Set explicit height
                        console.log('[MermaidExpandedView] ✅ FORCED TEST HEIGHT:', TEST_HEIGHT, 'px');
                        console.log('[MermaidExpandedView] SVG final style.height:', svg.style.height);
                        const testRect = svg.getBoundingClientRect();
                        console.log('[MermaidExpandedView] SVG rect after forcing height:', testRect);
                        console.log('[MermaidExpandedView] SVG offsetHeight:', (svg as unknown as HTMLElement).offsetHeight);
                        console.log('[MermaidExpandedView] SVG clientHeight:', svg.clientHeight);
                        
                        // Also force container height
                        el.style.setProperty('min-height', `${TEST_HEIGHT}px`, 'important');
                        el.style.setProperty('height', 'auto', 'important');
                        console.log('[MermaidExpandedView] ✅ FORCED CONTAINER MIN-HEIGHT:', TEST_HEIGHT, 'px');
                        const containerRect = el.getBoundingClientRect();
                        console.log('[MermaidExpandedView] Container rect after forcing:', containerRect);
                        
                        // CRITICAL FIX: SVG needs explicit height or container needs height
                        // If SVG has viewBox but no height, calculate aspect ratio
                        console.log('═══════════════════════════════════════════════════════════');
                        console.log('[MermaidExpandedView] 📏 CALCULATING SVG HEIGHT 📏');
                        const viewBox = svg.getAttribute('viewBox');
                        console.log('[MermaidExpandedView] viewBox attribute:', viewBox);
                        console.log('[MermaidExpandedView] SVG height attribute:', svg.getAttribute('height'));
                        console.log('[MermaidExpandedView] SVG width attribute:', svg.getAttribute('width'));
                        
                        if (viewBox && !svg.getAttribute('height')) {
                          console.log('[MermaidExpandedView] ✅ viewBox exists and no height attribute - calculating from aspect ratio');
                          const viewBoxParts = viewBox.split(/\s+/);
                          console.log('[MermaidExpandedView] viewBox parts:', viewBoxParts);
                          const [, , vw, vh] = viewBoxParts.map(Number);
                          console.log('[MermaidExpandedView] Parsed viewBox values:');
                          console.log('  - viewBox x:', viewBoxParts[0]);
                          console.log('  - viewBox y:', viewBoxParts[1]);
                          console.log('  - viewBox width (vw):', vw);
                          console.log('  - viewBox height (vh):', vh);
                          
                          if (vw && vh) {
                            const aspectRatio = vh / vw;
                            console.log('[MermaidExpandedView] ✅ Aspect ratio calculated:', aspectRatio, `(${vh}/${vw})`);
                            
                            // Set height based on container width
                            const containerWidth = el.offsetWidth || el.clientWidth;
                            const containerClientWidth = el.clientWidth;
                            const containerScrollWidth = el.scrollWidth;
                            console.log('[MermaidExpandedView] Container dimensions:');
                            console.log('  - offsetWidth:', el.offsetWidth);
                            console.log('  - clientWidth:', containerClientWidth);
                            console.log('  - scrollWidth:', containerScrollWidth);
                            console.log('  - offsetHeight:', el.offsetHeight);
                            console.log('  - clientHeight:', el.clientHeight);
                            console.log('  - scrollHeight:', el.scrollHeight);
                            console.log('  - getBoundingClientRect:', el.getBoundingClientRect());
                            
                            if (containerWidth > 0) {
                              const calculatedHeight = containerWidth * aspectRatio;
                              console.log('[MermaidExpandedView] ✅✅✅ CALCULATED HEIGHT:', calculatedHeight, 'px');
                              console.log('[MermaidExpandedView] Calculation: containerWidth (', containerWidth, ') × aspectRatio (', aspectRatio, ') = ', calculatedHeight);
                              
                              // CRITICAL: Also ensure container has height
                              const containerHeight = el.offsetHeight || el.clientHeight;
                              console.log('[MermaidExpandedView] Container height check:');
                              console.log('  - offsetHeight:', el.offsetHeight);
                              console.log('  - clientHeight:', el.clientHeight);
                              console.log('  - scrollHeight:', el.scrollHeight);
                              
                              if (containerHeight === 0 || containerHeight < calculatedHeight) {
                                console.warn('[MermaidExpandedView] ⚠️ Container has zero or insufficient height, setting min-height');
                                el.style.setProperty('min-height', `${calculatedHeight}px`, 'important');
                                el.style.setProperty('height', 'auto', 'important');
                              }
                              
                              const beforeHeight = svg.style.height || svg.getAttribute('height') || 'none';
                              const beforeRect = svg.getBoundingClientRect();
                              console.log('[MermaidExpandedView] SVG height BEFORE setting:');
                              console.log('  - style.height:', beforeHeight);
                              console.log('  - getBoundingClientRect:', beforeRect);
                              
                              // Set both width and height explicitly
                              svg.style.setProperty('width', '100%', 'important');
                              svg.style.setProperty('height', `${calculatedHeight}px`, 'important');
                              svg.style.setProperty('min-height', `${calculatedHeight}px`, 'important');
                              
                              // Force a reflow
                              void (svg as unknown as HTMLElement).offsetHeight;
                              
                              const afterHeight = svg.style.height;
                              const afterHeightAttr = svg.getAttribute('height');
                              const afterRect = svg.getBoundingClientRect();
                              const computedStyle = window.getComputedStyle(svg);
                              console.log('[MermaidExpandedView] ✅ SVG height AFTER setting:');
                              console.log('  - style.height:', afterHeight);
                              console.log('  - style.min-height:', svg.style.minHeight);
                              console.log('  - height attribute:', afterHeightAttr);
                              console.log('  - computed style.height:', computedStyle.height);
                              console.log('  - computed style.width:', computedStyle.width);
                              console.log('  - getBoundingClientRect:', afterRect);
                              console.log('  - offsetWidth:', (svg as unknown as HTMLElement).offsetWidth);
                              console.log('  - offsetHeight:', (svg as unknown as HTMLElement).offsetHeight);
                              console.log('  - clientWidth:', svg.clientWidth);
                              console.log('  - clientHeight:', svg.clientHeight);
                              
                              if (afterRect.height === 0) {
                                console.error('[MermaidExpandedView] ❌❌❌ SVG STILL HAS ZERO HEIGHT AFTER SETTING! ❌❌❌');
                                console.error('[MermaidExpandedView] Container rect:', el.getBoundingClientRect());
                                console.error('[MermaidExpandedView] Container computed styles:', {
                                  display: window.getComputedStyle(el).display,
                                  height: window.getComputedStyle(el).height,
                                  minHeight: window.getComputedStyle(el).minHeight,
                                  maxHeight: window.getComputedStyle(el).maxHeight
                                });
                                console.error('[MermaidExpandedView] SVG computed styles:', {
                                  display: computedStyle.display,
                                  height: computedStyle.height,
                                  width: computedStyle.width,
                                  minHeight: computedStyle.minHeight,
                                  maxHeight: computedStyle.maxHeight
                                });
                              } else {
                                console.log('[MermaidExpandedView] ✅✅✅ SVG HEIGHT SUCCESSFULLY SET TO:', afterRect.height, 'px ✅✅✅');
                              }
                            } else {
                              console.error('[MermaidExpandedView] ❌ Container width is 0 or invalid:', containerWidth);
                              console.error('[MermaidExpandedView] Container rect:', el.getBoundingClientRect());
                              console.error('[MermaidExpandedView] Container computed styles:', window.getComputedStyle(el));
                            }
                          } else {
                            console.error('[MermaidExpandedView] ❌ Invalid viewBox dimensions:', { vw, vh });
                          }
                        } else {
                          if (!viewBox) {
                            console.log('[MermaidExpandedView] ⚠️ No viewBox attribute found');
                          }
                          if (svg.getAttribute('height')) {
                            console.log('[MermaidExpandedView] ⚠️ SVG already has height attribute:', svg.getAttribute('height'));
                            const existingHeight = svg.getAttribute('height');
                            const rect = svg.getBoundingClientRect();
                            console.log('[MermaidExpandedView] Existing height details:');
                            console.log('  - height attribute:', existingHeight);
                            console.log('  - getBoundingClientRect height:', rect.height);
                            console.log('  - offsetHeight:', (svg as unknown as HTMLElement).offsetHeight);
                          }
                        }
                        console.log('═══════════════════════════════════════════════════════════');
                        
                        svg.style.setProperty('display', 'block', 'important');
                        svg.style.setProperty('visibility', 'visible', 'important');
                        svg.style.setProperty('opacity', '1', 'important');
                        svg.style.setProperty('max-width', '100%', 'important');
                        svg.style.setProperty('max-height', '100%', 'important');
                        // CRITICAL: Remove height: auto override - it prevents the height from working
                        svg.style.removeProperty('height');
                        svg.style.setProperty('height', `${TEST_HEIGHT}px`, 'important');
                        svg.style.setProperty('width', '100%', 'important');
                        // Don't override height if we just set it
                        if (!svg.style.height || svg.style.height === 'auto') {
                          svg.style.setProperty('height', 'auto', 'important');
                        }
                      } else {
                        console.error('[MermaidExpandedView] ❌❌❌ NO SVG FOUND IN REF CALLBACK ❌❌❌');
                        console.error('[MermaidExpandedView] Element innerHTML:', el.innerHTML.substring(0, 500));
                        console.error('[MermaidExpandedView] Element children:', Array.from(el.children).map(c => ({
                          tagName: c.tagName,
                          className: c.className
                        })));
                      }
                        }
                  }}
                  className="absolute inset-0 flex items-center justify-center mermaid-diagram"
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    transition: shouldReduceMotion ? 'none' : 'transform 0.1s ease-out',
                    width: '100%',
                    height: '100%',
                    minWidth: '100%',
                    minHeight: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto',
                  }}
                  dangerouslySetInnerHTML={{ __html: actualSvgContent }}
                />
              );
            })()
          ) : (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
              <div className="text-theme-text-secondary text-sm">
                Unable to display diagram. The diagram may contain syntax errors.
              </div>
              <div className="text-theme-text-tertiary text-xs">
                Debug: isValidSvg={String(isValidSvg)}, contentLength={actualSvgContent?.length || 0}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className={cn(
          "p-2 border-t border-theme-border-primary",
          "bg-theme-bg-secondary",
          typography.fontSize.sm,
          "text-theme-text-tertiary text-center"
        )}>
          Drag to pan • Scroll to zoom • Arrow keys to pan • +/- to zoom • 0 to reset • ESC to close
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * MermaidDiagram Component
 * Renders Mermaid diagrams client-side with proper font sizing and theme support
 * Works in both localhost and Firebase hosting (static deployment)
 * Enhanced with real-time rendering and intelligent error suppression during streaming
 */
function MermaidDiagram({ code }: { code: string }) {
  const mermaidRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastSuccessfulSvgRef = React.useRef<string>("");
  const expandedSvgContentRef = React.useRef<string>("");
  const [isRendering, setIsRendering] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [showError, setShowError] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [expandedSvgContent, setExpandedSvgContent] = React.useState<string>("");
  const [containerHeight, setContainerHeight] = React.useState<number | null>(null);
  const [retryCounter, setRetryCounter] = React.useState(0);
  const { theme, resolvedTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const renderTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const errorTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastCodeChangeRef = React.useRef<number>(Date.now());

  // Determine if dark mode is active
  const isDark = React.useMemo(() => {
    return resolvedTheme === 'dark' || theme === 'dark';
  }, [theme, resolvedTheme]);

  // Detect if code is actively changing (streaming/typing)
  const isActivelyChanging = React.useRef(false);
  
  React.useEffect(() => {
    // Mark that code is actively changing
    isActivelyChanging.current = true;
    lastCodeChangeRef.current = Date.now();
    
    // Clear the "actively changing" flag after a delay
    const timer = setTimeout(() => {
      isActivelyChanging.current = false;
    }, 500); // Consider stable after 0.5 seconds of no changes
    
    return () => clearTimeout(timer);
  }, [code]);
  
  // Reset retry counter when code changes
  React.useEffect(() => {
    setRetryCounter(0);
  }, [code]);

  React.useLayoutEffect(() => {
    let cancelled = false;
    let uniqueId: string;

    const renderMermaid = async () => {
      // Clear any existing render timer
      if (renderTimerRef.current) {
        clearTimeout(renderTimerRef.current);
      }

      // Debounce renders to avoid excessive attempts during rapid changes
      renderTimerRef.current = setTimeout(async () => {
        try {
          setIsRendering(true);
          setHasError(false);

          const mermaid = await initializeMermaid(isDark);

          if (!mermaidRef.current || cancelled) return;

          // Generate unique ID for this diagram
          uniqueId = `mermaid-${Math.random().toString(36).slice(2, 11)}`;

          // Trim the code to remove leading/trailing whitespace and normalize line breaks
          let trimmedCode = code.trim().replace(/\r\n/g, '\n');

          // Skip rendering if code is too short or empty
          if (trimmedCode.length < 10) {
            setIsRendering(false);
            return;
          }

          // Validate syntax completeness before rendering to avoid parse errors
          // Check for incomplete edge statements (common during streaming)
          const lines = trimmedCode.split('\n');
          const hasIncompleteSyntax = lines.some(line => {
            const trimmedLine = line.trim();
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('%%')) {
              return false;
            }
            
            // Check for incomplete edges: ends with -- or --> without a target
            // Patterns: "F --", "F -->", "F --|label|", "F -->|label|"
            // Match: node followed by -- or --> at end of line (with optional whitespace)
            if (/-->\s*$/.test(trimmedLine)) {
              return true; // Incomplete edge with arrow: "F -->"
            }
            // Match: node followed by -- at end of line (but not --- which is valid)
            if (/\w+\s+--\s*$/.test(trimmedLine)) {
              return true; // Incomplete edge without arrow: "F --"
            }
            // Match: edge with label but no target: "F -->|label|" or "F --|label|"
            if (/-->\s*\|[^|]*\|\s*$/.test(trimmedLine)) {
              return true; // Edge with label but no target (with arrow)
            }
            if (/\w+\s+--\s*\|[^|]*\|\s*$/.test(trimmedLine)) {
              return true; // Edge with label but no target (without arrow)
            }
            
            // Check for incomplete node definitions: starts with [ or { but doesn't close on same line
            // Pattern: "A[" or "A{" at end of line without closing bracket
            if (/^\s*\w+\[\s*$/.test(trimmedLine)) {
              return true; // Node label started but not closed: "A["
            }
            if (/^\s*\w+\{\s*$/.test(trimmedLine)) {
              return true; // Decision node started but not closed: "A{"
            }
            
            return false;
          });

          // If syntax is incomplete, skip rendering (will retry when more content arrives)
          if (hasIncompleteSyntax) {
            setIsRendering(false);
            return;
          }

          // Fix common Mermaid syntax issues
          // 1. Convert <br> to <br/> (self-closing) in node labels
          trimmedCode = trimmedCode.replace(/<br>/gi, '<br/>');
          
          // 2. Fix unclosed HTML tags in node labels (common in AI-generated diagrams)
          // Match patterns like [text<tag>text] and close the tag
          trimmedCode = trimmedCode.replace(/\[([^\]]*?)<(\w+)>([^\]]*?)\]/g, (match, before, tag, after) => {
            // Check if tag is already closed
            if (after.includes(`</${tag}>`)) {
              return match;
            }
            // Self-closing tags don't need closing
            if (['br', 'hr', 'img', 'input'].includes(tag.toLowerCase())) {
              return match;
            }
            // Close the tag
            return `[${before}<${tag}>${after}</${tag}>]`;
          });

          // Render the diagram
          const { svg } = await mermaid.render(uniqueId, trimmedCode);

          // Never display Mermaid's error SVGs (e.g. "Syntax error in text") on any page
          const isMermaidErrorSvg =
            typeof svg === 'string' &&
            (svg.includes('Syntax error in text') ||
              svg.includes('aria-roledescription="error"') ||
              svg.includes('class="error-icon"') ||
              svg.includes('class="error-text"'));
          if (isMermaidErrorSvg) {
            if (!cancelled && mermaidRef.current) {
              mermaidRef.current.innerHTML = '';
            }
            setHasError(true);
            setIsRendering(false);
            setShowError(true);
            return;
          }

          if (!cancelled && mermaidRef.current) {
            // Capture current height before updating to prevent jumping
            if (mermaidRef.current.firstElementChild) {
              const currentHeight = mermaidRef.current.firstElementChild.getBoundingClientRect().height;
              if (currentHeight > 0) {
                setContainerHeight(currentHeight);
              }
            }

            mermaidRef.current.innerHTML = svg;
            
            // Apply font size override to all text elements in the SVG
            const svgElement = mermaidRef.current.querySelector('svg');
            if (svgElement) {
              // Override font-size in the SVG's internal style tag
              const styleElement = svgElement.querySelector('style');
              if (styleElement && styleElement.textContent) {
                styleElement.textContent = styleElement.textContent.replace(
                  /font-size:\s*[\d.]+px/g, 
                  `font-size: ${mermaidConfig.fontSize}`
                );
              }

              // Override font-size on the SVG element itself
              svgElement.style.setProperty('font-size', mermaidConfig.fontSize, 'important');

              // Override font sizes in all text elements
              const textElements = svgElement.querySelectorAll('text');
              textElements.forEach((textEl) => {
                const el = textEl as SVGTextElement;
                el.style.setProperty('font-size', mermaidConfig.fontSize, 'important');
                el.setAttribute('font-size', mermaidConfig.fontSize);
              });

              // Override font sizes in tspan elements
              const tspanElements = svgElement.querySelectorAll('tspan');
              tspanElements.forEach((tspanEl) => {
                const el = tspanEl as SVGTSpanElement;
                el.style.setProperty('font-size', mermaidConfig.fontSize, 'important');
                el.setAttribute('font-size', mermaidConfig.fontSize);
              });

              // Override font sizes in foreignObject divs
              const foreignObjects = svgElement.querySelectorAll('foreignObject');
              foreignObjects.forEach((fo) => {
                const divs = fo.querySelectorAll('div');
                divs.forEach((div) => {
                  div.style.setProperty('font-size', mermaidConfig.fontSize, 'important');
                });
                const spans = fo.querySelectorAll('span');
                spans.forEach((span) => {
                  span.style.setProperty('font-size', mermaidConfig.fontSize, 'important');
                });
                const paragraphs = fo.querySelectorAll('p');
                paragraphs.forEach((p) => {
                  p.style.setProperty('font-size', mermaidConfig.fontSize, 'important');
                });
              });

              // Update container height to match new diagram
              const newHeight = svgElement.getBoundingClientRect().height;
              if (newHeight > 0) {
                setContainerHeight(newHeight);
              }
            }

            // Store successful SVG for later use and expanded view
            console.log('✅ [MermaidDiagram] SVG rendered successfully, length:', svg.length);
            console.log('[MermaidDiagram] SVG preview (first 200 chars):', svg.substring(0, 200));
            console.log('[MermaidDiagram] SVG includes <svg:', svg.includes('<svg'));
            lastSuccessfulSvgRef.current = svg;
            expandedSvgContentRef.current = svg;
            setExpandedSvgContent(svg);
            console.log('✅ [MermaidDiagram] Stored SVG in refs and state');
            console.log('[MermaidDiagram] Verification - lastSuccessfulSvgRef.current length:', lastSuccessfulSvgRef.current.length);
            console.log('[MermaidDiagram] Verification - expandedSvgContentRef.current length:', expandedSvgContentRef.current.length);
            setIsRendering(false);
            setHasError(false);
            setShowError(false);
            
            // Clear any pending error display timer
            if (errorTimerRef.current) {
              clearTimeout(errorTimerRef.current);
            }
          }
        } catch (err) {
          if (!cancelled) {
            // During streaming, syntax errors are expected - suppress them
            // BUT only if we have a previous successful render to fall back to
            const hasLastSuccessfulRender = lastSuccessfulSvgRef.current && lastSuccessfulSvgRef.current.trim().length > 0;
            
            // Check if error is due to incomplete syntax (common during streaming)
            const errorMessage = err instanceof Error ? err.message : String(err);
            const isIncompleteSyntaxError = 
              errorMessage.includes('Parse error') ||
              errorMessage.includes('Expecting') ||
              (isActivelyChanging.current && hasLastSuccessfulRender);
            
            if (isIncompleteSyntaxError && isActivelyChanging.current) {
              // Code is still streaming and error is likely due to incomplete syntax, silently fail
              setIsRendering(false);
              return;
            }
            
            // Code has stabilized OR no previous render, proceed with error handling
            // Only log errors for stable code or when we don't have a previous render
            if (!isActivelyChanging.current || !hasLastSuccessfulRender) {
              console.error('[MermaidDiagram] Rendering error:', err);
              console.error('[MermaidDiagram] Failed code:', code);
            }
            setHasError(true);
            setIsRendering(false);
            
            // If code is actively changing, don't show error yet
            // Wait to see if the next render succeeds
            if (errorTimerRef.current) {
              clearTimeout(errorTimerRef.current);
            }
            
            // If we don't have a previous render, retry after a short delay
            // This handles cases where Mermaid is still initializing
            // Limit retries to prevent infinite loops
            if (!hasLastSuccessfulRender && retryCounter < 3 && renderTimerRef.current === null) {
              console.log(`[MermaidDiagram] No previous render, scheduling retry ${retryCounter + 1}/3...`);
              renderTimerRef.current = setTimeout(() => {
                renderTimerRef.current = null;
                // Trigger a re-render by incrementing retry counter
                setRetryCounter(prev => prev + 1);
              }, 1000); // Retry after 1 second
            }
            
            // Only show error if code hasn't changed for a while
            errorTimerRef.current = setTimeout(() => {
              const timeSinceLastChange = Date.now() - lastCodeChangeRef.current;
              if (timeSinceLastChange > 2000) {
                // Code has been stable for 2 seconds, show the error
                setShowError(true);
              }
            }, 2000);
            
            // Keep last successful render visible on error
            // Don't clear the display - lastSuccessfulSvgRef.current remains
          }
        }
      }, 200); // 200ms debounce for smooth real-time updates
    };

    renderMermaid();

    return () => {
      cancelled = true;
      if (renderTimerRef.current) {
        clearTimeout(renderTimerRef.current);
      }
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, [code, isDark, retryCounter]); // Re-render when code, theme, or retry counter changes


  const handleExpand = () => {
    const timestamp = new Date().toISOString();
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🚀🚀🚀 [MermaidDiagram] handleExpand CALLED at ${timestamp} 🚀🚀🚀`);
    console.log('[MermaidDiagram] Call stack:', new Error().stack?.split('\n').slice(1, 5).join('\n'));
    
    console.log('[MermaidDiagram] Current state:');
    console.log('  - mermaidRef.current:', !!mermaidRef.current);
    console.log('  - mermaidRef.current element:', mermaidRef.current?.tagName, mermaidRef.current?.className);
    console.log('  - lastSuccessfulSvgRef.current length:', lastSuccessfulSvgRef.current?.length || 0);
    console.log('  - expandedSvgContentRef.current length:', expandedSvgContentRef.current?.length || 0);
    console.log('  - expandedSvgContent state length:', expandedSvgContent?.length || 0);
    console.log('  - isExpanded:', isExpanded);
    
    // Extract SVG content directly from the rendered DOM element
    // This ensures we always have the latest content, even if state is stale
    let svgToUse = '';
    let svgSource = '';
    
    // First, try to get SVG from the rendered DOM element
    if (mermaidRef.current) {
      console.log('[MermaidDiagram] ✅ mermaidRef.current exists');
      console.log('[MermaidDiagram] mermaidRef.current details:');
      console.log('  - tagName:', mermaidRef.current.tagName);
      console.log('  - className:', mermaidRef.current.className);
      console.log('  - innerHTML length:', mermaidRef.current.innerHTML.length);
      console.log('  - children count:', mermaidRef.current.children.length);
      console.log('  - isConnected:', mermaidRef.current.isConnected);
      console.log('  - getBoundingClientRect:', mermaidRef.current.getBoundingClientRect());
      
      const svgElement = mermaidRef.current.querySelector('svg');
      console.log('[MermaidDiagram] SVG element query result:', !!svgElement);
      if (svgElement) {
        console.log('[MermaidDiagram] ✅✅✅ Found SVG element in DOM');
        console.log('[MermaidDiagram] SVG element details:');
        console.log('  - tagName:', svgElement.tagName);
        console.log('  - id:', svgElement.id);
        console.log('  - className:', svgElement.className);
        console.log('  - viewBox:', svgElement.getAttribute('viewBox'));
        console.log('  - width:', svgElement.getAttribute('width'));
        console.log('  - height:', svgElement.getAttribute('height'));
        console.log('  - outerHTML length:', svgElement.outerHTML.length);
        console.log('  - getBoundingClientRect:', svgElement.getBoundingClientRect());
        
        svgToUse = svgElement.outerHTML;
        svgSource = 'DOM-extraction';
        console.log('[MermaidDiagram] ✅ Extracted SVG from DOM');
        console.log('[MermaidDiagram] Extracted SVG length:', svgToUse.length);
        console.log('[MermaidDiagram] SVG preview (first 300 chars):', svgToUse.substring(0, 300));
        console.log('[MermaidDiagram] SVG includes <svg:', svgToUse.includes('<svg'));
      } else {
        console.log('[MermaidDiagram] ⚠️ No SVG element found in mermaidRef.current');
        console.log('[MermaidDiagram] Searching for SVG in children...');
        Array.from(mermaidRef.current.children).forEach((child, idx) => {
          console.log(`[MermaidDiagram] Child ${idx}:`, {
            tagName: child.tagName,
            className: child.className,
            innerHTML: child.innerHTML.substring(0, 100)
          });
        });
        console.log('[MermaidDiagram] mermaidRef.current.innerHTML preview:', mermaidRef.current.innerHTML.substring(0, 300));
      }
    } else {
      console.log('[MermaidDiagram] ❌ mermaidRef.current is null');
    }
    
    // Fallback to stored ref if DOM extraction fails
    if (!svgToUse && lastSuccessfulSvgRef.current) {
      svgToUse = lastSuccessfulSvgRef.current;
      svgSource = 'lastSuccessfulSvgRef';
      console.log('[MermaidDiagram] ✅ Using lastSuccessfulSvgRef fallback');
      console.log('[MermaidDiagram] lastSuccessfulSvgRef length:', svgToUse.length);
      console.log('[MermaidDiagram] lastSuccessfulSvgRef preview:', svgToUse.substring(0, 200));
    }
    
    // Fallback to ref if state is empty
    if (!svgToUse && expandedSvgContentRef.current) {
      svgToUse = expandedSvgContentRef.current;
      svgSource = 'expandedSvgContentRef';
      console.log('[MermaidDiagram] ✅ Using expandedSvgContentRef fallback');
      console.log('[MermaidDiagram] expandedSvgContentRef length:', svgToUse.length);
    }
    
    // Fallback to state if ref is also empty
    if (!svgToUse && expandedSvgContent) {
      svgToUse = expandedSvgContent;
      svgSource = 'expandedSvgContent-state';
      console.log('[MermaidDiagram] ✅ Using expandedSvgContent state fallback');
      console.log('[MermaidDiagram] expandedSvgContent length:', svgToUse.length);
    }
    
    console.log('[MermaidDiagram] Final decision:');
    console.log('  - svgToUse length:', svgToUse.length);
    console.log('  - svgSource:', svgSource);
    console.log('  - svgToUse includes <svg:', svgToUse.includes('<svg'));
    console.log('  - svgToUse trimmed length:', svgToUse.trim().length);
    
    // Only open if we have valid SVG content
    if (svgToUse && svgToUse.trim().length > 0 && svgToUse.includes('<svg')) {
      console.log('✅✅✅ [MermaidDiagram] VALID SVG FOUND - Opening expanded view');
      console.log('[MermaidDiagram] Source:', svgSource);
      console.log('[MermaidDiagram] svgToUse length:', svgToUse.length);
      console.log('[MermaidDiagram] svgToUse preview:', svgToUse.substring(0, 300));
      
      // Store in both ref (immediate) and state (for React)
      expandedSvgContentRef.current = svgToUse;
      setExpandedSvgContent(svgToUse);
      
      console.log('[MermaidDiagram] ✅ Stored in ref and state');
      console.log('[MermaidDiagram] Ref verification length:', expandedSvgContentRef.current.length);
      console.log('[MermaidDiagram] Ref verification includes <svg:', expandedSvgContentRef.current.includes('<svg'));
      
      setIsExpanded(true);
      console.log('[MermaidDiagram] ✅ isExpanded set to true');
      
      // Verify state update
      setTimeout(() => {
        console.log('[MermaidDiagram] 🔍 Post-expand verification (100ms delay):');
        console.log('  - expandedSvgContentRef.current length:', expandedSvgContentRef.current?.length || 0);
        console.log('  - isExpanded state:', isExpanded);
      }, 100);
    } else {
      console.error('❌❌❌ [MermaidDiagram] NO VALID SVG CONTENT FOUND! Cannot expand.');
      console.error('[MermaidDiagram] svgToUse length:', svgToUse?.length || 0);
      console.error('[MermaidDiagram] svgToUse includes <svg:', svgToUse?.includes('<svg') || false);
      console.error('[MermaidDiagram] svgToUse trimmed length:', svgToUse?.trim().length || 0);
      console.error('[MermaidDiagram] svgToUse preview:', svgToUse?.substring(0, 200) || 'EMPTY');
    }
    console.log('═══════════════════════════════════════════════════════════');
  };

  // Check if we have valid content for expansion
  const hasValidContent = expandedSvgContent && expandedSvgContent.trim().length > 0;
  const hasLastSuccessfulRender = lastSuccessfulSvgRef.current && lastSuccessfulSvgRef.current.trim().length > 0;

  // Only show persistent error if we have no successful render AND code has been stable
  if (showError && !hasLastSuccessfulRender) {
    return (
      <div className={cn(
        markdownConfig.code.background,
        markdownConfig.code.text,
        markdownConfig.code.blockPadding,
        markdownConfig.code.borderRadius,
        "border border-red-500/30",
        "my-4"
      )}>
        <p className="text-red-500 text-sm mb-2">Unable to render Mermaid diagram</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400">Show diagram code</summary>
          <pre className="mt-2 text-xs overflow-x-auto p-2 bg-theme-bg-tertiary rounded border border-theme-border-secondary">
            <code>{code}</code>
          </pre>
        </details>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative my-4 group">
        {/* Subtle rendering indicator - only show when actively parsing */}
        {isRendering && (
          <div className="absolute top-2 left-2 z-10">
            <div className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-md",
              "bg-theme-bg-secondary/80 backdrop-blur-sm",
              "border border-theme-border-secondary",
              "text-xs text-theme-text-tertiary"
            )}>
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-blue-500"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <span>Updating...</span>
            </div>
          </div>
        )}
        
        {/* Warning indicator if there's an error but we have a last successful render */}
        {hasError && hasLastSuccessfulRender && !isActivelyChanging.current && (
          <div className="absolute top-2 right-2 z-10">
            <div className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-md",
              "bg-yellow-500/10 backdrop-blur-sm",
              "border border-yellow-500/30",
              "text-xs text-yellow-600 dark:text-yellow-400"
            )}>
              <span>⚠</span>
              <span>Showing last valid diagram</span>
            </div>
          </div>
        )}
        
        <div
          ref={mermaidRef}
          className={cn(
            "mermaid-diagram",
            "flex justify-center",
            "overflow-x-auto",
            "transition-opacity duration-300"
          )}
          style={{ 
            minHeight: containerHeight ? `${containerHeight}px` : 'auto',
            opacity: isRendering ? 0.7 : 1
          }}
        />
        
        {/* Expand button - only show if we have valid content */}
        {(hasValidContent || hasLastSuccessfulRender) && !isRendering && (
          <motion.button
            onClick={handleExpand}
            className={cn(
              mermaidConfig.expandButton.position,
              mermaidConfig.expandButton.size,
              mermaidConfig.expandButton.padding,
              mermaidConfig.expandButton.background,
              mermaidConfig.expandButton.backgroundHover,
              mermaidConfig.expandButton.border,
              mermaidConfig.expandButton.borderRadius,
              mermaidConfig.expandButton.text,
              mermaidConfig.expandButton.textHover,
              mermaidConfig.expandButton.transition,
              "opacity-0 group-hover:opacity-100",
              "flex items-center justify-center"
            )}
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            aria-label="Expand diagram"
          >
            <Expand className={mermaidConfig.expandButton.iconSize} />
          </motion.button>
        )}
      </div>

      {/* Expanded view modal - use last successful content if available. Only render when we have content to avoid log spam and unnecessary work. */}
      {(() => {
        const shouldRender = hasValidContent || hasLastSuccessfulRender;
        if (!shouldRender) {
          if (MERMAID_DEBUG) {
            logMd('📦 [MermaidDiagram] Skipping expanded view - no valid content');
            logMd('  - hasValidContent:', hasValidContent, 'hasLastSuccessfulRender:', hasLastSuccessfulRender);
          }
          return null;
        }
        const content = expandedSvgContentRef.current || expandedSvgContent || lastSuccessfulSvgRef.current || '';
        if (MERMAID_DEBUG) {
          logMd('📤 [MermaidDiagram] RENDERING MermaidExpandedView');
          logMd('  - content length:', content?.length, 'isOpen:', isExpanded);
        }
        return (
          <MermaidExpandedView
            key={`mermaid-expanded-${isExpanded ? 'open' : 'closed'}`}
            svgContent={content}
            isOpen={isExpanded}
            onClose={() => {
              if (MERMAID_DEBUG) logMd('[MermaidDiagram] onClose called');
              setIsExpanded(false);
            }}
          />
        );
      })()}
    </>
  );
}

/**
 * Code Component
 * Displays code blocks with syntax highlighting and copy button
 * Matches PRD Section 4.2.4.2 specifications
 * Phase 4: Animate UI Code component integration
 */
export function Code({ children, className, language }: CodeProps) {
  const shouldReduceMotion = useReducedMotion();
  const [copied, setCopied] = React.useState(false);
  const codeRef = React.useRef<HTMLPreElement>(null);

  // Extract language from className (format: "language-{lang}")
  const detectedLanguage = React.useMemo(() => {
    if (language) return language;
    const match = className?.match(/language-(\w+)/);
    return match ? match[1] : undefined;
  }, [className, language]);

  const codeString = React.useMemo(() => {
    if (typeof children === "string") return children;
    if (React.isValidElement(children) && typeof (children.props as any).children === "string") {
      return (children.props as any).children;
    }
    return String(children);
  }, [children]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), streamingConfig.copyButton.resetTimeout);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const isInline = !className || !className.includes("language-");
  const isMermaid = detectedLanguage?.toLowerCase() === 'mermaid';

  // Render Mermaid diagram if language is mermaid
  if (!isInline && isMermaid) {
    return <MermaidDiagram code={codeString} />;
  }

  if (isInline) {
    return (
      <code
        className={cn(
          markdownConfig.code.background,
          markdownConfig.code.text,
          markdownConfig.code.fontSize,
          markdownConfig.code.inlinePadding,
          "rounded",
          className
        )}
      >
        {children}
      </code>
    );
  }

  return (
    <motion.div
      className="relative group my-4"
      initial={shouldReduceMotion ? {} : { opacity: 0, y: animationDurations.codeBlockSlideOffset }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: animationDurations.codeBlockFadeIn, ease: "easeOut" as const }}
    >
      {/* Copy Button - appears on hover */}
      <motion.button
        onClick={handleCopy}
        className={cn(
          "absolute top-2 right-2 z-10",
          "p-2 rounded-md",
          markdownConfig.code.copyButton.background,
          markdownConfig.code.copyButton.backgroundHover,
          "border",
          markdownConfig.code.copyButton.border,
          markdownConfig.code.copyButton.text,
          markdownConfig.code.copyButton.textHover,
          "opacity-0 group-hover:opacity-100 transition-opacity",
          cn("flex items-center gap-1.5", typography.fontSize.xs),
          "backdrop-blur-sm"
        )}
        whileHover={shouldReduceMotion ? {} : { scale: streamingConfig.copyButton.animations.hoverScale }}
        whileTap={shouldReduceMotion ? {} : { scale: streamingConfig.copyButton.animations.tapScale }}
        aria-label="Copy code"
      >
        {copied ? (
          <>
            <Check className={cn(markdownConfig.code.copyButton.iconSize, streamingConfig.copyButton.animations.successColor)} />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy className={markdownConfig.code.copyButton.iconSize} />
            <span>Copy</span>
          </>
        )}
      </motion.button>

      {/* Code Block */}
      <pre
        ref={codeRef}
        className={cn(
          markdownConfig.code.background,
          markdownConfig.code.text,
          markdownConfig.code.fontSize,
          markdownConfig.code.blockPadding,
          markdownConfig.code.borderRadius,
          "overflow-x-auto",
          "border",
          markdownConfig.code.border,
          className
        )}
      >
        <code className={cn("block", className)}>{children}</code>
      </pre>

      {/* Language Badge (optional) */}
      {detectedLanguage && (
        <div className={cn(
          "absolute bottom-2 right-2",
          markdownConfig.code.languageBadge.fontSize,
          markdownConfig.code.languageBadge.color,
          markdownConfig.code.languageBadge.fontFamily
        )}>
          {detectedLanguage}
        </div>
      )}
    </motion.div>
  );
}
