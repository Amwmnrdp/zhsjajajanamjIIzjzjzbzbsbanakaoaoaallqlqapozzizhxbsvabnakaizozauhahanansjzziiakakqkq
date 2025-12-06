const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function initDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS servers (
                id SERIAL PRIMARY KEY,
                server_id VARCHAR(255) UNIQUE NOT NULL,
                server_name VARCHAR(255),
                language VARCHAR(10) DEFAULT 'en',
                permission_enabled BOOLEAN DEFAULT true,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                discord_id VARCHAR(255) UNIQUE NOT NULL,
                discord_username VARCHAR(255),
                discord_avatar VARCHAR(512),
                is_owner BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS suggestions (
                id SERIAL PRIMARY KEY,
                discord_id VARCHAR(255) NOT NULL,
                discord_username VARCHAR(255),
                discord_avatar VARCHAR(512),
                title VARCHAR(255),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                discord_id VARCHAR(255) NOT NULL,
                discord_username VARCHAR(255),
                discord_avatar VARCHAR(512),
                title VARCHAR(255),
                description TEXT,
                image_url VARCHAR(1024),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS likes (
                id SERIAL PRIMARY KEY,
                discord_id VARCHAR(255) NOT NULL,
                target_type VARCHAR(50) NOT NULL,
                target_id INTEGER NOT NULL,
                is_like BOOLEAN NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(discord_id, target_type, target_id)
            );

            CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                discord_id VARCHAR(255) NOT NULL,
                discord_username VARCHAR(255),
                discord_avatar VARCHAR(512),
                target_type VARCHAR(50) NOT NULL,
                target_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS verified_users (
                id SERIAL PRIMARY KEY,
                discord_id VARCHAR(255) UNIQUE NOT NULL,
                discord_username VARCHAR(255),
                discord_avatar VARCHAR(512),
                verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 hours')
            );

            CREATE TABLE IF NOT EXISTS emojis_added (
                id SERIAL PRIMARY KEY,
                server_id VARCHAR(255) NOT NULL,
                emoji_id VARCHAR(255) NOT NULL,
                emoji_name VARCHAR(255),
                added_by VARCHAR(255),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Database tables initialized');
    } finally {
        client.release();
    }
}

async function getServer(serverId) {
    const result = await pool.query('SELECT * FROM servers WHERE server_id = $1', [serverId]);
    return result.rows[0];
}

async function addServer(serverId, serverName) {
    await pool.query(
        'INSERT INTO servers (server_id, server_name) VALUES ($1, $2) ON CONFLICT (server_id) DO UPDATE SET server_name = $2',
        [serverId, serverName]
    );
}

async function removeServer(serverId) {
    await pool.query('DELETE FROM servers WHERE server_id = $1', [serverId]);
}

async function getAllServers() {
    const result = await pool.query('SELECT * FROM servers ORDER BY joined_at DESC');
    return result.rows;
}

async function setServerLanguage(serverId, language) {
    await pool.query(
        'UPDATE servers SET language = $1 WHERE server_id = $2',
        [language, serverId]
    );
}

async function getServerLanguage(serverId) {
    const result = await pool.query('SELECT language FROM servers WHERE server_id = $1', [serverId]);
    return result.rows[0]?.language || 'en';
}

async function setServerPermission(serverId, enabled) {
    await pool.query(
        'UPDATE servers SET permission_enabled = $1 WHERE server_id = $2',
        [enabled, serverId]
    );
}

async function isAdmin(discordId) {
    const result = await pool.query('SELECT * FROM admins WHERE discord_id = $1', [discordId]);
    return result.rows.length > 0;
}

async function isOwner(discordId) {
    const result = await pool.query('SELECT * FROM admins WHERE discord_id = $1 AND is_owner = true', [discordId]);
    return result.rows.length > 0;
}

async function addAdmin(discordId, username, avatar, isOwner = false) {
    await pool.query(
        'INSERT INTO admins (discord_id, discord_username, discord_avatar, is_owner) VALUES ($1, $2, $3, $4) ON CONFLICT (discord_id) DO UPDATE SET discord_username = $2, discord_avatar = $3',
        [discordId, username, avatar, isOwner]
    );
}

async function removeAdmin(discordId) {
    const admin = await pool.query('SELECT is_owner FROM admins WHERE discord_id = $1', [discordId]);
    if (admin.rows[0]?.is_owner) {
        throw new Error('Cannot remove the owner');
    }
    await pool.query('DELETE FROM admins WHERE discord_id = $1', [discordId]);
}

async function getAllAdmins() {
    const result = await pool.query('SELECT * FROM admins ORDER BY is_owner DESC, created_at ASC');
    return result.rows;
}

async function createSuggestion(discordId, username, avatar, title, description) {
    const result = await pool.query(
        'INSERT INTO suggestions (discord_id, discord_username, discord_avatar, title, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [discordId, username, avatar, title, description]
    );
    return result.rows[0];
}

async function getSuggestions() {
    const result = await pool.query(`
        SELECT s.*, 
            (SELECT COUNT(*) FROM likes WHERE target_type = 'suggestion' AND target_id = s.id AND is_like = true) as likes,
            (SELECT COUNT(*) FROM likes WHERE target_type = 'suggestion' AND target_id = s.id AND is_like = false) as dislikes
        FROM suggestions s ORDER BY s.created_at DESC
    `);
    return result.rows;
}

async function getSuggestionById(id) {
    const result = await pool.query(`
        SELECT s.*, 
            (SELECT COUNT(*) FROM likes WHERE target_type = 'suggestion' AND target_id = s.id AND is_like = true) as likes,
            (SELECT COUNT(*) FROM likes WHERE target_type = 'suggestion' AND target_id = s.id AND is_like = false) as dislikes
        FROM suggestions s WHERE s.id = $1
    `, [id]);
    return result.rows[0];
}

async function deleteSuggestion(id) {
    await pool.query('DELETE FROM likes WHERE target_type = $1 AND target_id = $2', ['suggestion', id]);
    await pool.query('DELETE FROM comments WHERE target_type = $1 AND target_id = $2', ['suggestion', id]);
    await pool.query('DELETE FROM suggestions WHERE id = $1', [id]);
}

async function createReport(discordId, username, avatar, title, description, imageUrl) {
    const result = await pool.query(
        'INSERT INTO reports (discord_id, discord_username, discord_avatar, title, description, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [discordId, username, avatar, title, description, imageUrl]
    );
    return result.rows[0];
}

async function getReports() {
    const result = await pool.query(`
        SELECT r.*, 
            (SELECT COUNT(*) FROM likes WHERE target_type = 'report' AND target_id = r.id AND is_like = true) as likes,
            (SELECT COUNT(*) FROM likes WHERE target_type = 'report' AND target_id = r.id AND is_like = false) as dislikes
        FROM reports r ORDER BY r.created_at DESC
    `);
    return result.rows;
}

async function getReportById(id) {
    const result = await pool.query(`
        SELECT r.*, 
            (SELECT COUNT(*) FROM likes WHERE target_type = 'report' AND target_id = r.id AND is_like = true) as likes,
            (SELECT COUNT(*) FROM likes WHERE target_type = 'report' AND target_id = r.id AND is_like = false) as dislikes
        FROM reports r WHERE r.id = $1
    `, [id]);
    return result.rows[0];
}

async function deleteReport(id) {
    await pool.query('DELETE FROM likes WHERE target_type = $1 AND target_id = $2', ['report', id]);
    await pool.query('DELETE FROM comments WHERE target_type = $1 AND target_id = $2', ['report', id]);
    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
}

async function toggleLike(discordId, targetType, targetId, isLike) {
    const existing = await pool.query(
        'SELECT * FROM likes WHERE discord_id = $1 AND target_type = $2 AND target_id = $3',
        [discordId, targetType, targetId]
    );
    
    if (existing.rows.length > 0) {
        if (existing.rows[0].is_like === isLike) {
            await pool.query(
                'DELETE FROM likes WHERE discord_id = $1 AND target_type = $2 AND target_id = $3',
                [discordId, targetType, targetId]
            );
            return { action: 'removed' };
        } else {
            await pool.query(
                'UPDATE likes SET is_like = $1 WHERE discord_id = $2 AND target_type = $3 AND target_id = $4',
                [isLike, discordId, targetType, targetId]
            );
            return { action: 'changed' };
        }
    } else {
        await pool.query(
            'INSERT INTO likes (discord_id, target_type, target_id, is_like) VALUES ($1, $2, $3, $4)',
            [discordId, targetType, targetId, isLike]
        );
        return { action: 'added' };
    }
}

async function getUserLike(discordId, targetType, targetId) {
    const result = await pool.query(
        'SELECT is_like FROM likes WHERE discord_id = $1 AND target_type = $2 AND target_id = $3',
        [discordId, targetType, targetId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].is_like;
}

async function addComment(discordId, username, avatar, targetType, targetId, content) {
    const result = await pool.query(
        'INSERT INTO comments (discord_id, discord_username, discord_avatar, target_type, target_id, content) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [discordId, username, avatar, targetType, targetId, content]
    );
    return result.rows[0];
}

async function getComments(targetType, targetId) {
    const result = await pool.query(
        'SELECT * FROM comments WHERE target_type = $1 AND target_id = $2 ORDER BY created_at ASC',
        [targetType, targetId]
    );
    return result.rows;
}

async function deleteComment(id, discordId, isAdmin) {
    if (isAdmin) {
        await pool.query('DELETE FROM comments WHERE id = $1', [id]);
    } else {
        await pool.query('DELETE FROM comments WHERE id = $1 AND discord_id = $2', [id, discordId]);
    }
}

async function verifyUserDb(discordId, username, avatar) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
    await pool.query(
        'INSERT INTO verified_users (discord_id, discord_username, discord_avatar, verified_at, expires_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4) ON CONFLICT (discord_id) DO UPDATE SET discord_username = $2, discord_avatar = $3, verified_at = CURRENT_TIMESTAMP, expires_at = $4',
        [discordId, username, avatar, expiresAt]
    );
    return expiresAt.getTime();
}

async function isUserVerifiedDb(discordId) {
    const result = await pool.query(
        "SELECT * FROM verified_users WHERE discord_id = $1 AND expires_at > NOW()",
        [discordId]
    );
    return result.rows.length > 0;
}

async function getVerifiedUser(discordId) {
    const result = await pool.query('SELECT *, EXTRACT(EPOCH FROM expires_at) * 1000 as expires_at_ms FROM verified_users WHERE discord_id = $1', [discordId]);
    return result.rows[0];
}

async function getVerificationExpiry(discordId) {
    const result = await pool.query(
        "SELECT EXTRACT(EPOCH FROM expires_at) * 1000 as expires_at_ms FROM verified_users WHERE discord_id = $1",
        [discordId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].expires_at_ms;
}

async function resetAllVerificationsDb() {
    await pool.query('DELETE FROM verified_users');
}

async function getVerifiedUsersCountDb() {
    const result = await pool.query(
        "SELECT COUNT(*) FROM verified_users WHERE verified_at > NOW() - INTERVAL '5 hours'"
    );
    return parseInt(result.rows[0].count);
}

async function addEmojiRecord(serverId, emojiId, emojiName, addedBy) {
    await pool.query(
        'INSERT INTO emojis_added (server_id, emoji_id, emoji_name, added_by) VALUES ($1, $2, $3, $4)',
        [serverId, emojiId, emojiName, addedBy]
    );
}

async function getServerEmojis(serverId) {
    const result = await pool.query(
        'SELECT * FROM emojis_added WHERE server_id = $1 ORDER BY added_at DESC',
        [serverId]
    );
    return result.rows;
}

module.exports = {
    pool,
    initDatabase,
    getServer,
    addServer,
    removeServer,
    getAllServers,
    setServerLanguage,
    getServerLanguage,
    setServerPermission,
    isAdmin,
    isOwner,
    addAdmin,
    removeAdmin,
    getAllAdmins,
    createSuggestion,
    getSuggestions,
    getSuggestionById,
    deleteSuggestion,
    createReport,
    getReports,
    getReportById,
    deleteReport,
    toggleLike,
    getUserLike,
    addComment,
    getComments,
    deleteComment,
    verifyUserDb,
    isUserVerifiedDb,
    getVerifiedUser,
    getVerificationExpiry,
    resetAllVerificationsDb,
    getVerifiedUsersCountDb,
    addEmojiRecord,
    getServerEmojis
};
