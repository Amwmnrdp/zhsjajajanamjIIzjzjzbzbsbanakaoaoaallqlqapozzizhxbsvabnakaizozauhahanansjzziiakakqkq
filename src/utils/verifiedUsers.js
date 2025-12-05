const fs = require('fs');
const path = require('path');

const VERIFIED_USERS_FILE = path.join(__dirname, '../../data/verified_users.json');
const VERIFICATION_DURATION = 5 * 60 * 60 * 1000;

function loadVerifiedUsers() {
    try {
        if (fs.existsSync(VERIFIED_USERS_FILE)) {
            const data = fs.readFileSync(VERIFIED_USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading verified users:', error.message);
    }
    return {};
}

function saveVerifiedUsers(users) {
    try {
        const dir = path.dirname(VERIFIED_USERS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(VERIFIED_USERS_FILE, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving verified users:', error.message);
        return false;
    }
}

function verifyUser(discordId, discordUsername) {
    const users = loadVerifiedUsers();
    users[discordId] = {
        discordId,
        discordUsername,
        verifiedAt: Date.now(),
        expiresAt: Date.now() + VERIFICATION_DURATION
    };
    return saveVerifiedUsers(users);
}

function isUserVerified(discordId) {
    const users = loadVerifiedUsers();
    const user = users[discordId];
    
    if (!user) return false;
    
    if (Date.now() > user.expiresAt) {
        delete users[discordId];
        saveVerifiedUsers(users);
        return false;
    }
    
    return true;
}

function getVerificationStatus(discordId) {
    const users = loadVerifiedUsers();
    const user = users[discordId];
    
    if (!user) return null;
    
    if (Date.now() > user.expiresAt) {
        delete users[discordId];
        saveVerifiedUsers(users);
        return null;
    }
    
    return {
        verified: true,
        expiresAt: user.expiresAt,
        remainingTime: user.expiresAt - Date.now()
    };
}

function getVerifiedUsersCount() {
    const users = loadVerifiedUsers();
    let count = 0;
    const now = Date.now();
    
    for (const userId in users) {
        if (users[userId].expiresAt > now) {
            count++;
        }
    }
    
    return count;
}

function getTotalVerificationsCount() {
    const users = loadVerifiedUsers();
    return Object.keys(users).length;
}

function cleanupExpiredUsers() {
    const users = loadVerifiedUsers();
    const now = Date.now();
    let cleaned = false;
    
    for (const userId in users) {
        if (users[userId].expiresAt <= now) {
            delete users[userId];
            cleaned = true;
        }
    }
    
    if (cleaned) {
        saveVerifiedUsers(users);
    }
}

function resetAllVerifications() {
    console.log('🔄 Resetting all user verifications on bot startup...');
    saveVerifiedUsers({});
    console.log('✅ All verifications have been reset');
}

setInterval(cleanupExpiredUsers, 60 * 60 * 1000);

module.exports = {
    verifyUser,
    isUserVerified,
    getVerificationStatus,
    getVerifiedUsersCount,
    getTotalVerificationsCount,
    cleanupExpiredUsers,
    resetAllVerifications,
    VERIFICATION_DURATION
};
