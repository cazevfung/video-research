/**
 * Markdown Utility Functions
 * Utilities for parsing and processing markdown content
 */

/**
 * Header Item Interface
 * Represents a single header extracted from markdown content
 */
export interface HeaderItem {
  level: number; // 1-6 for h1-h6
  text: string; // Header text content
  id: string; // Anchor ID (slugified)
}

/**
 * Slugify Text
 * Converts text to a URL-friendly slug for anchor IDs
 * 
 * @param text - The text to slugify
 * @returns A slugified string suitable for use as an anchor ID
 * 
 * @example
 * slugify("Installation Guide") // "installation-guide"
 * slugify("API Reference (v2)") // "api-reference-v2"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

/**
 * Extract Headers from Markdown Content
 * Parses markdown content and extracts all headers (h1-h6) with their text and anchor IDs
 * 
 * @param content - The markdown content to parse
 * @returns An array of HeaderItem objects representing all headers found in the content
 * 
 * @example
 * const content = "# Installation\n## Prerequisites\n### Step 1";
 * const headers = extractHeaders(content);
 * // Returns:
 * // [
 * //   { level: 1, text: "Installation", id: "installation" },
 * //   { level: 2, text: "Prerequisites", id: "prerequisites" },
 * //   { level: 3, text: "Step 1", id: "step-1" }
 * // ]
 */
export function extractHeaders(content: string): HeaderItem[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const headers: HeaderItem[] = [];
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  const idCounts: Record<string, number> = {}; // Track duplicate IDs

  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    const level = match[1].length; // Number of # characters (1-6)
    const text = match[2].trim(); // Header text without leading #

    // Skip empty headers
    if (!text) {
      continue;
    }

    // Generate base ID
    let id = slugify(text);

    // Handle duplicate headers by appending counter
    if (idCounts[id] !== undefined) {
      idCounts[id]++;
      id = `${id}-${idCounts[id]}`;
    } else {
      idCounts[id] = 0;
    }

    // Fallback: if slugification fails or results in empty string, use index-based ID
    if (!id) {
      id = `header-${headers.length + 1}`;
    }

    headers.push({
      level,
      text,
      id,
    });
  }

  return headers;
}
