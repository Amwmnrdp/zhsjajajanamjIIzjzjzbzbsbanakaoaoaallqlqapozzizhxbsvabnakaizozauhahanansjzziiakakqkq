const fs = require('fs');
const path = require('path');

const helpFile = path.join(__dirname, '../../data/help.json');
const suggestionsFile = path.join(__dirname, '../../data/suggestions.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize files
function initializeFiles() {
    if (!fs.existsSync(helpFile)) {
        fs.writeFileSync(helpFile, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(suggestionsFile)) {
        fs.writeFileSync(suggestionsFile, JSON.stringify([], null, 2));
    }
}

// Help functions
function getHelp() {
    try {
        const data = fs.readFileSync(helpFile, 'utf-8');
        return JSON.parse(data).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
        return [];
    }
}

function addHelp(title, content, timestamp) {
    try {
        initializeFiles();
        const help = getHelp();
        help.unshift({ title, content, timestamp, id: Date.now() });
        fs.writeFileSync(helpFile, JSON.stringify(help, null, 2));
        return true;
    } catch (error) {
        console.error('Error adding help:', error);
        return false;
    }
}

// Suggestions functions
function getSuggestions() {
    try {
        const data = fs.readFileSync(suggestionsFile, 'utf-8');
        return JSON.parse(data).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
        return [];
    }
}

function addSuggestion(title, content, timestamp) {
    try {
        initializeFiles();
        const suggestions = getSuggestions();
        suggestions.unshift({ title, content, timestamp, id: Date.now() });
        fs.writeFileSync(suggestionsFile, JSON.stringify(suggestions, null, 2));
        return true;
    } catch (error) {
        console.error('Error adding suggestion:', error);
        return false;
    }
}

module.exports = {
    getHelp,
    addHelp,
    getSuggestions,
    addSuggestion,
    initializeFiles
};
