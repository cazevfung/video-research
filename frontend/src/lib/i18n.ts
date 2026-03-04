/**
 * i18n Configuration and Initialization
 * Synchronously initializes i18next at import time to avoid race conditions
 * 
 * This module MUST be imported before any React components that use translations
 * Import order in providers.tsx: import '@/lib/i18n' (first line)
 */

import i18n, { type InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE_CODE } from '@/config/languages';

// Import English translations
import enCommon from '../locales/en/common.json';
import enNavigation from '../locales/en/navigation.json';
import enDashboard from '../locales/en/dashboard.json';
import enHistory from '../locales/en/history.json';
import enSettings from '../locales/en/settings.json';
import enAccount from '../locales/en/account.json';
import enSummary from '../locales/en/summary.json';
import enErrors from '../locales/en/errors.json';
import enValidation from '../locales/en/validation.json';
import enAuth from '../locales/en/auth.json';
import enResearch from '../locales/en/research.json';
import enTasks from '../locales/en/tasks.json';
import enLanding from '../locales/en/landing.json';
import enShared from '../locales/en/shared.json';

// Import Spanish translations
import esCommon from '../locales/es/common.json';
import esNavigation from '../locales/es/navigation.json';
import esDashboard from '../locales/es/dashboard.json';
import esHistory from '../locales/es/history.json';
import esSettings from '../locales/es/settings.json';
import esAccount from '../locales/es/account.json';
import esSummary from '../locales/es/summary.json';
import esErrors from '../locales/es/errors.json';
import esValidation from '../locales/es/validation.json';
import esAuth from '../locales/es/auth.json';
import esResearch from '../locales/es/research.json';
import esTasks from '../locales/es/tasks.json';
import esLanding from '../locales/es/landing.json';
import esShared from '../locales/es/shared.json';

// Import French translations
import frCommon from '../locales/fr/common.json';
import frNavigation from '../locales/fr/navigation.json';
import frDashboard from '../locales/fr/dashboard.json';
import frHistory from '../locales/fr/history.json';
import frSettings from '../locales/fr/settings.json';
import frAccount from '../locales/fr/account.json';
import frSummary from '../locales/fr/summary.json';
import frErrors from '../locales/fr/errors.json';
import frValidation from '../locales/fr/validation.json';
import frAuth from '../locales/fr/auth.json';
import frResearch from '../locales/fr/research.json';
import frTasks from '../locales/fr/tasks.json';
import frLanding from '../locales/fr/landing.json';
import frShared from '../locales/fr/shared.json';

// Import German translations
import deCommon from '../locales/de/common.json';
import deNavigation from '../locales/de/navigation.json';
import deDashboard from '../locales/de/dashboard.json';
import deHistory from '../locales/de/history.json';
import deSettings from '../locales/de/settings.json';
import deAccount from '../locales/de/account.json';
import deSummary from '../locales/de/summary.json';
import deErrors from '../locales/de/errors.json';
import deValidation from '../locales/de/validation.json';
import deAuth from '../locales/de/auth.json';
import deResearch from '../locales/de/research.json';
import deTasks from '../locales/de/tasks.json';
import deLanding from '../locales/de/landing.json';
import deShared from '../locales/de/shared.json';

// Import Chinese Simplified translations
import zhCommon from '../locales/zh/common.json';
import zhNavigation from '../locales/zh/navigation.json';
import zhDashboard from '../locales/zh/dashboard.json';
import zhHistory from '../locales/zh/history.json';
import zhSettings from '../locales/zh/settings.json';
import zhAccount from '../locales/zh/account.json';
import zhSummary from '../locales/zh/summary.json';
import zhErrors from '../locales/zh/errors.json';
import zhValidation from '../locales/zh/validation.json';
import zhAuth from '../locales/zh/auth.json';
import zhResearch from '../locales/zh/research.json';
import zhTasks from '../locales/zh/tasks.json';
import zhLanding from '../locales/zh/landing.json';
import zhShared from '../locales/zh/shared.json';

// Import Chinese Traditional translations
import zhTwCommon from '../locales/zh-tw/common.json';
import zhTwNavigation from '../locales/zh-tw/navigation.json';
import zhTwDashboard from '../locales/zh-tw/dashboard.json';
import zhTwHistory from '../locales/zh-tw/history.json';
import zhTwSettings from '../locales/zh-tw/settings.json';
import zhTwAccount from '../locales/zh-tw/account.json';
import zhTwSummary from '../locales/zh-tw/summary.json';
import zhTwErrors from '../locales/zh-tw/errors.json';
import zhTwValidation from '../locales/zh-tw/validation.json';
import zhTwAuth from '../locales/zh-tw/auth.json';
import zhTwResearch from '../locales/zh-tw/research.json';
import zhTwTasks from '../locales/zh-tw/tasks.json';
import zhTwLanding from '../locales/zh-tw/landing.json';
import zhTwShared from '../locales/zh-tw/shared.json';

// Import Japanese translations
import jaCommon from '../locales/ja/common.json';
import jaNavigation from '../locales/ja/navigation.json';
import jaDashboard from '../locales/ja/dashboard.json';
import jaHistory from '../locales/ja/history.json';
import jaSettings from '../locales/ja/settings.json';
import jaAccount from '../locales/ja/account.json';
import jaSummary from '../locales/ja/summary.json';
import jaErrors from '../locales/ja/errors.json';
import jaValidation from '../locales/ja/validation.json';
import jaAuth from '../locales/ja/auth.json';
import jaResearch from '../locales/ja/research.json';
import jaTasks from '../locales/ja/tasks.json';
import jaLanding from '../locales/ja/landing.json';
import jaShared from '../locales/ja/shared.json';

// Import Korean translations
import koCommon from '../locales/ko/common.json';
import koNavigation from '../locales/ko/navigation.json';
import koDashboard from '../locales/ko/dashboard.json';
import koHistory from '../locales/ko/history.json';
import koSettings from '../locales/ko/settings.json';
import koAccount from '../locales/ko/account.json';
import koSummary from '../locales/ko/summary.json';
import koErrors from '../locales/ko/errors.json';
import koValidation from '../locales/ko/validation.json';
import koAuth from '../locales/ko/auth.json';
import koResearch from '../locales/ko/research.json';
import koTasks from '../locales/ko/tasks.json';
import koLanding from '../locales/ko/landing.json';
import koShared from '../locales/ko/shared.json';

// Import Portuguese translations
import ptCommon from '../locales/pt/common.json';
import ptNavigation from '../locales/pt/navigation.json';
import ptDashboard from '../locales/pt/dashboard.json';
import ptHistory from '../locales/pt/history.json';
import ptSettings from '../locales/pt/settings.json';
import ptAccount from '../locales/pt/account.json';
import ptSummary from '../locales/pt/summary.json';
import ptErrors from '../locales/pt/errors.json';
import ptValidation from '../locales/pt/validation.json';
import ptAuth from '../locales/pt/auth.json';
import ptResearch from '../locales/pt/research.json';
import ptTasks from '../locales/pt/tasks.json';
import ptLanding from '../locales/pt/landing.json';
import ptShared from '../locales/pt/shared.json';

// Import Italian translations
import itCommon from '../locales/it/common.json';
import itNavigation from '../locales/it/navigation.json';
import itDashboard from '../locales/it/dashboard.json';
import itHistory from '../locales/it/history.json';
import itSettings from '../locales/it/settings.json';
import itAccount from '../locales/it/account.json';
import itSummary from '../locales/it/summary.json';
import itErrors from '../locales/it/errors.json';
import itValidation from '../locales/it/validation.json';
import itAuth from '../locales/it/auth.json';
import itResearch from '../locales/it/research.json';
import itTasks from '../locales/it/tasks.json';
import itLanding from '../locales/it/landing.json';
import itShared from '../locales/it/shared.json';

// Import Russian translations
import ruCommon from '../locales/ru/common.json';
import ruNavigation from '../locales/ru/navigation.json';
import ruDashboard from '../locales/ru/dashboard.json';
import ruHistory from '../locales/ru/history.json';
import ruSettings from '../locales/ru/settings.json';
import ruAccount from '../locales/ru/account.json';
import ruSummary from '../locales/ru/summary.json';
import ruErrors from '../locales/ru/errors.json';
import ruValidation from '../locales/ru/validation.json';
import ruAuth from '../locales/ru/auth.json';
import ruResearch from '../locales/ru/research.json';
import ruTasks from '../locales/ru/tasks.json';
import ruLanding from '../locales/ru/landing.json';
import ruShared from '../locales/ru/shared.json';

// Import Arabic translations
import arCommon from '../locales/ar/common.json';
import arNavigation from '../locales/ar/navigation.json';
import arDashboard from '../locales/ar/dashboard.json';
import arHistory from '../locales/ar/history.json';
import arSettings from '../locales/ar/settings.json';
import arAccount from '../locales/ar/account.json';
import arSummary from '../locales/ar/summary.json';
import arErrors from '../locales/ar/errors.json';
import arValidation from '../locales/ar/validation.json';
import arAuth from '../locales/ar/auth.json';
import arResearch from '../locales/ar/research.json';
import arTasks from '../locales/ar/tasks.json';
import arLanding from '../locales/ar/landing.json';
import arShared from '../locales/ar/shared.json';

/**
 * Translation resources organized by language
 * Each language has 14 namespaces for different parts of the app
 */
const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    dashboard: enDashboard,
    history: enHistory,
    settings: enSettings,
    account: enAccount,
    summary: enSummary,
    errors: enErrors,
    validation: enValidation,
    auth: enAuth,
    research: enResearch,
    tasks: enTasks,
    landing: enLanding,
    shared: enShared,
  },
  es: {
    common: esCommon,
    navigation: esNavigation,
    dashboard: esDashboard,
    history: esHistory,
    settings: esSettings,
    account: esAccount,
    summary: esSummary,
    errors: esErrors,
    validation: esValidation,
    auth: esAuth,
    research: esResearch,
    tasks: esTasks,
    landing: esLanding,
    shared: esShared,
  },
  fr: {
    common: frCommon,
    navigation: frNavigation,
    dashboard: frDashboard,
    history: frHistory,
    settings: frSettings,
    account: frAccount,
    summary: frSummary,
    errors: frErrors,
    validation: frValidation,
    auth: frAuth,
    research: frResearch,
    tasks: frTasks,
    landing: frLanding,
    shared: frShared,
  },
  de: {
    common: deCommon,
    navigation: deNavigation,
    dashboard: deDashboard,
    history: deHistory,
    settings: deSettings,
    account: deAccount,
    summary: deSummary,
    errors: deErrors,
    validation: deValidation,
    auth: deAuth,
    research: deResearch,
    tasks: deTasks,
    landing: deLanding,
    shared: deShared,
  },
  zh: {
    common: zhCommon,
    navigation: zhNavigation,
    dashboard: zhDashboard,
    history: zhHistory,
    settings: zhSettings,
    account: zhAccount,
    summary: zhSummary,
    errors: zhErrors,
    validation: zhValidation,
    auth: zhAuth,
    research: zhResearch,
    tasks: zhTasks,
    landing: zhLanding,
    shared: zhShared,
  },
  'zh-tw': {
    common: zhTwCommon,
    navigation: zhTwNavigation,
    dashboard: zhTwDashboard,
    history: zhTwHistory,
    settings: zhTwSettings,
    account: zhTwAccount,
    summary: zhTwSummary,
    errors: zhTwErrors,
    validation: zhTwValidation,
    auth: zhTwAuth,
    research: zhTwResearch,
    tasks: zhTwTasks,
    landing: zhTwLanding,
    shared: zhTwShared,
  },
  ja: {
    common: jaCommon,
    navigation: jaNavigation,
    dashboard: jaDashboard,
    history: jaHistory,
    settings: jaSettings,
    account: jaAccount,
    summary: jaSummary,
    errors: jaErrors,
    validation: jaValidation,
    auth: jaAuth,
    research: jaResearch,
    tasks: jaTasks,
    landing: jaLanding,
    shared: jaShared,
  },
  ko: {
    common: koCommon,
    navigation: koNavigation,
    dashboard: koDashboard,
    history: koHistory,
    settings: koSettings,
    account: koAccount,
    summary: koSummary,
    errors: koErrors,
    validation: koValidation,
    auth: koAuth,
    research: koResearch,
    tasks: koTasks,
    landing: koLanding,
    shared: koShared,
  },
  pt: {
    common: ptCommon,
    navigation: ptNavigation,
    dashboard: ptDashboard,
    history: ptHistory,
    settings: ptSettings,
    account: ptAccount,
    summary: ptSummary,
    errors: ptErrors,
    validation: ptValidation,
    auth: ptAuth,
    research: ptResearch,
    shared: ptShared,
  },
  it: {
    common: itCommon,
    navigation: itNavigation,
    dashboard: itDashboard,
    history: itHistory,
    settings: itSettings,
    account: itAccount,
    summary: itSummary,
    errors: itErrors,
    validation: itValidation,
    auth: itAuth,
    research: itResearch,
    tasks: itTasks,
    landing: itLanding,
    shared: itShared,
  },
  ru: {
    common: ruCommon,
    navigation: ruNavigation,
    dashboard: ruDashboard,
    history: ruHistory,
    settings: ruSettings,
    account: ruAccount,
    summary: ruSummary,
    errors: ruErrors,
    validation: ruValidation,
    auth: ruAuth,
    research: ruResearch,
    tasks: ruTasks,
    landing: ruLanding,
    shared: ruShared,
  },
  ar: {
    common: arCommon,
    navigation: arNavigation,
    dashboard: arDashboard,
    history: arHistory,
    settings: arSettings,
    account: arAccount,
    summary: arSummary,
    errors: arErrors,
    validation: arValidation,
    auth: arAuth,
    research: arResearch,
    tasks: arTasks,
    landing: arLanding,
    shared: arShared,
  },
} as const;

/**
 * Get supported language codes from config
 * This ensures we use the centralized language configuration
 */
const supportedLanguageCodes = SUPPORTED_LANGUAGES.map(lang => lang.code);

/**
 * Initialize i18next SYNCHRONOUSLY at import time
 * This ensures i18n is ready before any React components render
 * 
 * Configuration values come from @/config/languages.ts (not hardcoded)
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: supportedLanguageCodes,
    fallbackLng: DEFAULT_LANGUAGE_CODE,
    defaultNS: 'common',
    ns: [
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
      'research',
      'tasks',
      'landing',
      'shared',
    ],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      checkWhitelist: true,
    },
    react: {
      useSuspense: false,
    },
  } as InitOptions);

/**
 * Export the initialized i18n instance
 * This can be imported in any module that needs direct access to i18n
 */
export default i18n;
