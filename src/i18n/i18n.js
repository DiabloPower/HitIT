/**
 * Internationalization (i18n) module for HitIT
 * Provides language switching and translation functions
 */

const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'hitit_language';
let currentLanguage = DEFAULT_LANGUAGE;
let translations = {};
let availableLanguages = [];

/**
 * Initialize i18n system
 * @param {Object} locales - Object mapping language codes to translation objects
 */
export function initI18n(locales) {
  availableLanguages = Object.keys(locales);
  translations = locales;
  
  // Load saved language preference or use browser default
  const savedLang = localStorage.getItem(STORAGE_KEY);
  const browserLang = navigator.language.split('-')[0]; // e.g., 'en' from 'en-US'
  
  let preferredLang = savedLang || browserLang;
  
  // Fallback to default if preferred language is not available
  if (!availableLanguages.includes(preferredLang)) {
    preferredLang = DEFAULT_LANGUAGE;
  }
  
  setLanguage(preferredLang);
}

/**
 * Get current language code
 * @returns {string} Current language code (e.g., 'en', 'de')
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Get list of available languages
 * @returns {Array<string>} Array of language codes
 */
export function getAvailableLanguages() {
  return availableLanguages;
}

/**
 * Set active language and update UI
 * @param {string} langCode - Language code (e.g., 'en', 'de')
 */
export function setLanguage(langCode) {
  if (!availableLanguages.includes(langCode)) {
    console.warn(`Language '${langCode}' not available, falling back to '${DEFAULT_LANGUAGE}'`);
    langCode = DEFAULT_LANGUAGE;
  }
  
  currentLanguage = langCode;
  localStorage.setItem(STORAGE_KEY, langCode);
  
  // Update HTML lang attribute
  document.documentElement.lang = langCode;
  
  // Update all elements with data-i18n attribute
  updatePageTranslations();
  
  // Dispatch event for components that need to react to language change
  window.dispatchEvent(new CustomEvent('languagechange', { detail: { language: langCode } }));
}

/**
 * Translate a key to current language
 * @param {string} key - Translation key (dot-notation supported, e.g., 'menu.settings')
 * @param {Object} params - Optional parameters for string interpolation
 * @returns {string} Translated string or key if not found
 */
export function t(key, params = {}) {
  const keys = key.split('.');
  let value = translations[currentLanguage];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation missing: ${currentLanguage}.${key}`);
      return key;
    }
  }
  
  // Handle string interpolation: "Hello {name}" with params.name
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : match;
    });
  }
  
  return value;
}

/**
 * Update all elements with data-i18n attributes
 */
export function updatePageTranslations() {
  const elements = document.querySelectorAll('[data-i18n]');
  
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    
    // Check if element has data-i18n-attr to specify which attribute to translate
    const attr = el.getAttribute('data-i18n-attr');
    
    if (attr) {
      el.setAttribute(attr, translated);
    } else {
      // Default: update text content
      el.textContent = translated;
    }
  });
}

/**
 * Get language display name
 * @param {string} langCode - Language code
 * @returns {string} Display name in its own language
 */
export function getLanguageDisplayName(langCode) {
  const displayNames = {
    'en': 'English',
    'de': 'Deutsch'
  };
  return displayNames[langCode] || langCode;
}

// Make t() available globally for inline usage
window.t = t;
