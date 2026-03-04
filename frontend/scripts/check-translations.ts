/**
 * Translation Coverage Checker
 * 
 * This script checks that all translation files have the same keys as the English base.
 * It ensures complete translation coverage across all supported languages.
 * 
 * Usage: npm run i18n:check
 */

import * as fs from 'fs';
import * as path from 'path';

interface TranslationCheckResult {
  language: string;
  namespace: string;
  missingKeys: string[];
  extraKeys: string[];
  totalKeys: number;
  missingCount: number;
  extraCount: number;
}

interface CheckSummary {
  language: string;
  namespaces: TranslationCheckResult[];
  totalMissing: number;
  totalExtra: number;
  hasErrors: boolean;
}

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const BASE_LANGUAGE = 'en';
const NAMESPACES = [
  'common',
  'navigation',
  'dashboard',
  'history',
  'settings',
  'account',
  'summary',
  'errors',
  'validation',
  'auth',
];

/**
 * Get all language directories
 */
function getLanguageDirs(): string[] {
  const entries = fs.readdirSync(LOCALES_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory() && entry.name !== 'node_modules')
    .map(entry => entry.name);
}

/**
 * Load a translation file
 */
function loadTranslationFile(language: string, namespace: string): any {
  const filePath = path.join(LOCALES_DIR, language, `${namespace}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

/**
 * Get all keys from a nested object (flattened with dot notation)
 */
function getAllKeys(obj: any, prefix: string = ''): string[] {
  const keys: string[] = [];
  
  if (obj === null || obj === undefined) {
    return keys;
  }
  
  if (typeof obj !== 'object') {
    return keys;
  }
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively get keys from nested objects
        keys.push(...getAllKeys(value, fullKey));
      } else {
        // Leaf key
        keys.push(fullKey);
      }
    }
  }
  
  return keys;
}

/**
 * Check translation coverage for a single namespace
 */
function checkNamespace(
  baseLanguage: string,
  targetLanguage: string,
  namespace: string
): TranslationCheckResult {
  const baseTranslation = loadTranslationFile(baseLanguage, namespace);
  const targetTranslation = loadTranslationFile(targetLanguage, namespace);
  
  if (!baseTranslation) {
    throw new Error(`Base translation file not found: ${baseLanguage}/${namespace}.json`);
  }
  
  if (!targetTranslation) {
    return {
      language: targetLanguage,
      namespace,
      missingKeys: getAllKeys(baseTranslation),
      extraKeys: [],
      totalKeys: getAllKeys(baseTranslation).length,
      missingCount: getAllKeys(baseTranslation).length,
      extraCount: 0,
    };
  }
  
  const baseKeys = new Set(getAllKeys(baseTranslation));
  const targetKeys = new Set(getAllKeys(targetTranslation));
  
  const missingKeys = Array.from(baseKeys).filter(key => !targetKeys.has(key));
  const extraKeys = Array.from(targetKeys).filter(key => !baseKeys.has(key));
  
  return {
    language: targetLanguage,
    namespace,
    missingKeys,
    extraKeys,
    totalKeys: baseKeys.size,
    missingCount: missingKeys.length,
    extraCount: extraKeys.length,
  };
}

/**
 * Check all translations for a language
 */
function checkLanguage(language: string): CheckSummary {
  if (language === BASE_LANGUAGE) {
    // Skip base language
    return {
      language,
      namespaces: [],
      totalMissing: 0,
      totalExtra: 0,
      hasErrors: false,
    };
  }
  
  const namespaces: TranslationCheckResult[] = [];
  let totalMissing = 0;
  let totalExtra = 0;
  
  for (const namespace of NAMESPACES) {
    const result = checkNamespace(BASE_LANGUAGE, language, namespace);
    namespaces.push(result);
    totalMissing += result.missingCount;
    totalExtra += result.extraCount;
  }
  
  return {
    language,
    namespaces,
    totalMissing,
    totalExtra,
    hasErrors: totalMissing > 0 || totalExtra > 0,
  };
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Checking translation coverage...\n');
  
  const languageDirs = getLanguageDirs();
  const summaries: CheckSummary[] = [];
  let hasAnyErrors = false;
  
  for (const language of languageDirs) {
    const summary = checkLanguage(language);
    summaries.push(summary);
    if (summary.hasErrors) {
      hasAnyErrors = true;
    }
  }
  
  // Print results
  for (const summary of summaries) {
    if (summary.language === BASE_LANGUAGE) {
      continue;
    }
    
    console.log(`\n📁 ${summary.language.toUpperCase()}`);
    console.log('─'.repeat(50));
    
    if (!summary.hasErrors) {
      console.log('✅ All translations complete!');
      continue;
    }
    
    for (const nsResult of summary.namespaces) {
      if (nsResult.missingCount === 0 && nsResult.extraCount === 0) {
        continue;
      }
      
      console.log(`\n  📄 ${nsResult.namespace}.json`);
      
      if (nsResult.missingCount > 0) {
        console.log(`  ❌ Missing ${nsResult.missingCount} key(s):`);
        nsResult.missingKeys.slice(0, 10).forEach(key => {
          console.log(`     - ${key}`);
        });
        if (nsResult.missingKeys.length > 10) {
          console.log(`     ... and ${nsResult.missingKeys.length - 10} more`);
        }
      }
      
      if (nsResult.extraCount > 0) {
        console.log(`  ⚠️  Extra ${nsResult.extraCount} key(s) (not in base):`);
        nsResult.extraKeys.slice(0, 10).forEach(key => {
          console.log(`     - ${key}`);
        });
        if (nsResult.extraKeys.length > 10) {
          console.log(`     ... and ${nsResult.extraKeys.length - 10} more`);
        }
      }
    }
    
    console.log(`\n  Summary: ${summary.totalMissing} missing, ${summary.totalExtra} extra`);
  }
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  const languagesWithErrors = summaries.filter(s => s.hasErrors).length;
  const totalLanguages = summaries.filter(s => s.language !== BASE_LANGUAGE).length;
  
  if (hasAnyErrors) {
    console.log(`❌ Found issues in ${languagesWithErrors}/${totalLanguages} languages`);
    process.exit(1);
  } else {
    console.log(`✅ All ${totalLanguages} languages have complete translations!`);
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { checkLanguage, checkNamespace, getAllKeys };


