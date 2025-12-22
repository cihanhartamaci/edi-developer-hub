// i18n.js - Lightweight Internationalization Library
(function (window) {
    'use strict';

    const i18n = {
        currentLang: 'en',
        translations: {},
        fallbackLang: 'en',
        basePath: '/translations/',

        // Initialize i18n
        init: function (defaultLang = 'en', basePath = '/translations/') {
            this.basePath = basePath;
            this.fallbackLang = defaultLang;

            // Get saved language or browser language
            const savedLang = localStorage.getItem('preferredLanguage');
            const browserLang = navigator.language.split('-')[0];

            // Determine initial language
            const supportedLangs = ['en', 'tr'];
            let initialLang = defaultLang;

            if (savedLang && supportedLangs.includes(savedLang)) {
                initialLang = savedLang;
            } else if (supportedLangs.includes(browserLang)) {
                initialLang = browserLang;
            }

            // Immediately set currentLang and sync selector to prevent visual reset
            this.currentLang = initialLang;
            this.syncSelector();

            return this.loadLanguage(initialLang);
        },

        // Load translation file
        loadLanguage: function (lang) {
            const url = this.basePath + lang + '.json';
            return fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error(`Translation file not found: ${url}`);
                    return response.json();
                })
                .then(translations => {
                    this.translations[lang] = translations;
                    this.currentLang = lang;
                    localStorage.setItem('preferredLanguage', lang);
                    this.applyTranslations();
                    this.updateHtmlLang();

                    // Update selector if it exists
                    this.syncSelector();

                    return lang;
                })
                .catch(error => {
                    console.warn(`Failed to load ${lang}.json, falling back to ${this.fallbackLang}`, error);
                    if (lang !== this.fallbackLang) {
                        return this.loadLanguage(this.fallbackLang);
                    }
                });
        },

        // Get translation by key
        t: function (key, lang = null) {
            lang = lang || this.currentLang;
            const keys = key.split('.');
            let value = this.translations[lang];

            if (!value) return key;

            let current = value;
            let found = true;
            for (let k of keys) {
                if (current && current.hasOwnProperty(k)) {
                    current = current[k];
                } else {
                    found = false;
                    break;
                }
            }

            if (found && current !== undefined) return current;

            // Fallback to default language
            let fallbackValue = this.translations[this.fallbackLang];
            if (!fallbackValue || lang === this.fallbackLang) return key;

            let fallbackCurrent = fallbackValue;
            let fallbackFound = true;
            for (let f of keys) {
                if (fallbackCurrent && fallbackCurrent.hasOwnProperty(f)) {
                    fallbackCurrent = fallbackCurrent[f];
                } else {
                    fallbackFound = false;
                    break;
                }
            }

            return (fallbackFound && fallbackCurrent !== undefined) ? fallbackCurrent : key;
        },

        // Apply translations to DOM
        applyTranslations: function () {
            // Translate elements with data-i18n attribute
            document.querySelectorAll('[data-i18n]').forEach(elem => {
                const key = elem.getAttribute('data-i18n');
                const translation = this.t(key);

                if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') {
                    elem.placeholder = translation;
                } else {
                    elem.textContent = translation;
                }
            });

            // Translate elements with data-i18n-html attribute (for HTML content)
            document.querySelectorAll('[data-i18n-html]').forEach(elem => {
                const key = elem.getAttribute('data-i18n-html');
                elem.innerHTML = this.t(key);
            });

            // Translate title attribute
            document.querySelectorAll('[data-i18n-title]').forEach(elem => {
                const key = elem.getAttribute('data-i18n-title');
                elem.title = this.t(key);
            });

            // Translate placeholder attribute
            document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
                const key = elem.getAttribute('data-i18n-placeholder');
                elem.placeholder = this.t(key);
            });

            // Translate aria-label attribute
            document.querySelectorAll('[data-i18n-aria]').forEach(elem => {
                const key = elem.getAttribute('data-i18n-aria');
                elem.setAttribute('aria-label', this.t(key));
            });
        },

        // Sync selector value
        syncSelector: function () {
            const langSelector = document.getElementById('language-selector');
            if (langSelector) {
                langSelector.value = this.currentLang;
            }
        },

        // Update HTML lang attribute
        updateHtmlLang: function () {
            document.documentElement.lang = this.currentLang;
        },

        // Change language
        changeLanguage: function (lang) {
            if (this.translations[lang]) {
                this.currentLang = lang;
                localStorage.setItem('preferredLanguage', lang);
                this.applyTranslations();
                this.updateHtmlLang();
                this.syncSelector();

                // Trigger custom event
                window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
            } else {
                return this.loadLanguage(lang);
            }
        },

        // Get current language
        getCurrentLanguage: function () {
            return this.currentLang;
        },

        // Get available languages
        getAvailableLanguages: function () {
            return Object.keys(this.translations);
        }
    };

    // Expose to window
    window.i18n = i18n;

    // Auto-initialize language selector if exists
    function initSelector() {
        const langSelector = document.getElementById('language-selector');
        if (langSelector) {
            langSelector.value = i18n.getCurrentLanguage();
            langSelector.removeEventListener('change', onLanguageChange);
            langSelector.addEventListener('change', onLanguageChange);
        }
    }

    function onLanguageChange(e) {
        i18n.changeLanguage(e.target.value);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSelector);
    } else {
        initSelector();
    }

})(window);
