const fs = require('fs');

const SERVERS_FILE = 'servers.json';
const LANGUAGES_FILE = 'languages.json';

function readServersFile() {
    try {
        if (!fs.existsSync(SERVERS_FILE)) {
            fs.writeFileSync(SERVERS_FILE, '[]');
            return [];
        }
        const data = fs.readFileSync(SERVERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('⚠️ Warning: Could not read servers file:', error.message);
        return [];
    }
}

function writeServersFile(servers) {
    try {
        fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2));
    } catch (error) {
        console.error('⚠️ Warning: Could not write servers file:', error.message);
    }
}

function readLanguagesFile() {
    try {
        if (!fs.existsSync(LANGUAGES_FILE)) {
            fs.writeFileSync(LANGUAGES_FILE, '{}');
            return {};
        }
        const data = fs.readFileSync(LANGUAGES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('⚠️ Warning: Could not read languages file:', error.message);
        return {};
    }
}

function writeLanguagesFile(languages) {
    try {
        fs.writeFileSync(LANGUAGES_FILE, JSON.stringify(languages, null, 2));
    } catch (error) {
        console.error('⚠️ Warning: Could not write languages file:', error.message);
    }
}

module.exports = {
    readServersFile,
    writeServersFile,
    readLanguagesFile,
    writeLanguagesFile,
    SERVERS_FILE,
    LANGUAGES_FILE
};
