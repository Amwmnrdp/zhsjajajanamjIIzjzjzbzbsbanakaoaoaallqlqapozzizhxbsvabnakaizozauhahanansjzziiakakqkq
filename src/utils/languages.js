const translate = require('google-translate-api-x');
const { readLanguagesFile, writeLanguagesFile } = require('./storage');
const { SUPPORTED_LANGUAGES, LEGACY_LANGUAGE_MAP } = require('./constants');

const serverLanguages = new Map();
const translationCache = new Map();

function loadServerLanguages() {
    const languages = readLanguagesFile();
    let needsSave = false;
    
    for (const [guildId, langCode] of Object.entries(languages)) {
        const normalizedCode = LEGACY_LANGUAGE_MAP[langCode.toLowerCase()] || langCode;
        if (normalizedCode !== langCode) {
            languages[guildId] = normalizedCode;
            needsSave = true;
        }
        serverLanguages.set(guildId, normalizedCode);
    }
    
    if (needsSave) {
        writeLanguagesFile(languages);
        console.log('✅ Migrated legacy language codes to ISO format');
    }
}

function saveServerLanguage(guildId, langCode) {
    const languages = readLanguagesFile();
    languages[guildId] = langCode;
    writeLanguagesFile(languages);
    serverLanguages.set(guildId, langCode);
}

function getServerLanguage(guildId) {
    return serverLanguages.get(guildId) || 'en';
}

async function t(text, langCode) {
    if (!text || langCode === 'en') return text;
    
    const cacheKey = `${langCode}:${text}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }
    
    try {
        const translateCode = SUPPORTED_LANGUAGES[langCode]?.translateCode || langCode;
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Translation timeout')), 5000)
        );
        
        const result = await Promise.race([
            translate(text, { from: 'en', to: translateCode }),
            timeoutPromise
        ]);
        
        const translated = result.text;
        translationCache.set(cacheKey, translated);
        
        if (translationCache.size > 10000) {
            const keysToDelete = Array.from(translationCache.keys()).slice(0, 2000);
            keysToDelete.forEach(key => translationCache.delete(key));
        }
        
        return translated;
    } catch (error) {
        console.error('⚠️ Translation error:', error.message);
        return text;
    }
}

async function preWarmCache() {
    const commonMessages = [
        'Pong!', 'Gateway latency:', 'Response time:', 'Permission Settings', 'Allow', 'Refuse'
    ];
    
    setImmediate(async () => {
        for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
            if (lang !== 'en') {
                for (const msg of commonMessages) {
                    t(msg, lang).catch(() => {});
                }
            }
        }
        console.log('✅ Cache pre-warming in progress (non-blocking)');
    });
}

module.exports = {
    serverLanguages,
    translationCache,
    loadServerLanguages,
    saveServerLanguage,
    getServerLanguage,
    t,
    preWarmCache
};
