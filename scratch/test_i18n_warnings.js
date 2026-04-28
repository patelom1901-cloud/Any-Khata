const fs = require('fs');

const filePath = 'c:/Users/acer/OneDrive/Desktop/Any-Khata/any-khata-app/constants/i18n.ts';
const content = fs.readFileSync(filePath, 'utf-8');

// A simple way to check if all dictionaries have the exact same number of keys and same keys
// Let's use a regex to extract the keys
function getKeys(dictionaryStr) {
    const keys = [];
    const lines = dictionaryStr.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('//') || line === '') continue;
        const match = line.match(/^['"]([^'"]+)['"]\s*:/);
        if (match) {
            keys.push(match[1]);
        }
    }
    return keys;
}

const enMatch = content.split('en: {')[1].split('},')[0];
const guMatch = content.split('gu: {')[1].split('},')[0];
const hiMatch = content.split('hi: {')[1].split('}')[0];

const enKeys = getKeys(enMatch);
const guKeys = getKeys(guMatch);
const hiKeys = getKeys(hiMatch);

console.log(`[i18n Test] English keys count: ${enKeys.length}`);
console.log(`[i18n Test] Gujarati keys count: ${guKeys.length}`);
console.log(`[i18n Test] Hindi keys count: ${hiKeys.length}`);

const allKeys = new Set([...enKeys, ...guKeys, ...hiKeys]);

let warnings = 0;
for (const key of allKeys) {
    if (!enKeys.includes(key)) {
        console.log(`[i18n] Missing translation for key '${key}' in locale 'en'`);
        warnings++;
    }
    if (!guKeys.includes(key)) {
        console.log(`[i18n] Missing translation for key '${key}' in locale 'gu'`);
        warnings++;
    }
    if (!hiKeys.includes(key)) {
        console.log(`[i18n] Missing translation for key '${key}' in locale 'hi'`);
        warnings++;
    }
}

if (warnings === 0) {
    console.log('[i18n Test] SUCCESS: Zero warnings in all three languages. All dictionaries are perfectly synced.');
} else {
    console.log(`[i18n Test] FAILED: Found ${warnings} warnings.`);
}
