const express = require('express');
const path = require('path');
const app = express();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Import submissions utility
const { getHelp, addHelp, getSuggestions, addSuggestion } = require('./src/utils/submissions');

// Import verified users utility
const { verifyUser, isUserVerified, getVerificationStatus, getVerifiedUsersCount, resetAllVerifications, VERIFICATION_DURATION } = require('./src/utils/verifiedUsers');

// Discord OAuth2 Configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}/auth/discord/callback`
    : 'http://localhost:3000/auth/discord/callback';

// Import utilities
const { SUPPORTED_LANGUAGES, COMMAND_DEFINITIONS } = require('./src/utils/constants');
const { readServersFile, writeServersFile } = require('./src/utils/storage');
const { loadServerLanguages, saveServerLanguage, getServerLanguage, t, preWarmCache } = require('./src/utils/languages');
const { allowedServers, setServerPermission } = require('./src/utils/permissions');

// Import emoji commands
const addemojiCmd = require('./src/commands/emoji/addemoji');
const listemoji = require('./src/commands/emoji/listemoji');
const deletemoji = require('./src/commands/emoji/deletemoji');
const renameemoji = require('./src/commands/emoji/renameemoji');
const emojisearch = require('./src/commands/emoji/emojisearch');
const imagetoemoji = require('./src/commands/emoji/imagetoemoji');
const emojiTosticker = require('./src/commands/emoji/emojiTosticker');
const suggestemojis = require('./src/commands/emoji/suggestemojis');

// Import sticker commands
const deletesticker = require('./src/commands/sticker/deletesticker');
const renamesticker = require('./src/commands/sticker/renamesticker');
const stickertoemi = require('./src/commands/sticker/stickertoemi');
const imagetosticker = require('./src/commands/sticker/imagetosticker');
const liststicker = require('./src/commands/sticker/liststicker');

// Import storage commands
const ping = require('./src/commands/storage/ping');
const permission = require('./src/commands/storage/permission');
const language = require('./src/commands/storage/language');
const help = require('./src/commands/storage/help');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

const prefix = '+';
const usedUrls = {};
const stickerDeletionSessions = new Map();
const stickerToEmojiSessions = new Map();
const stickerRenameSessions = new Map();
const convertedEmojisToStickers = new Map();
const convertedImagesToStickers = new Map();
const convertedStickersToEmojis = new Map();

loadServerLanguages();

// Reset all verifications on bot startup/restart
resetAllVerifications();

client.once('ready', async () => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🤖 Bot: ${client.user.tag}`)
    console.log(`✅ Status: Online and Ready!`);
    console.log(`📊 Servers: ${client.guilds.cache.size}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    

    client.user.setPresence({
        status: 'idle',
        activities: [{
            name: '+help | ProEmoji',
            type: 3
        }]
    });

    try {
        await client.application.commands.set(COMMAND_DEFINITIONS);
        console.log('✅ Slash commands registered!');
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        preWarmCache().catch(err => console.error('⚠️ Cache warming error:', err.message));
    } catch (error) {
        console.error('❌ Error:', error);
    }
});

client.on('guildCreate', guild => {
    setServerPermission(guild.id, true);
    saveServerLanguage(guild.id, 'en');
    const servers = readServersFile();
    if (!servers.includes(guild.name)) {
        servers.push(guild.name);
        writeServersFile(servers);
        console.log(`✅ Joined: ${guild.name}`);
    }
});

client.on('guildDelete', guild => {
    allowedServers.delete(guild.id);
    const servers = readServersFile();
    const updatedServers = servers.filter(name => name !== guild.name);
    writeServersFile(updatedServers);
    console.log(`❌ Left: ${guild.name}`);
});

// Website URL for verification
const WEBSITE_URL = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:3000';

// Helper function to check verification and send error message
async function checkVerification(interaction, langCode) {
    const userId = interaction.user.id;
    
    if (!isUserVerified(userId)) {
        const embed = new EmbedBuilder()
            .setTitle('🔐 ' + await t('Verification Required', langCode))
            .setDescription(await t('You must verify your Discord account before using commands.', langCode) + 
                `\n\n**${await t('Verification is required every 5 hours for security.', langCode)}**\n\n` +
                `🔗 **${await t('Click here to verify:', langCode)}** ${WEBSITE_URL}/#activation`)
            .setColor('#FF6B6B')
            .setFooter({ text: await t('This message is only visible to you.', langCode) });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return false;
    }
    return true;
}

client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'language_select') {
        const langCode = interaction.values[0];
        const langInfo = SUPPORTED_LANGUAGES[langCode];
        saveServerLanguage(interaction.guild.id, langCode);
        
        const embed = new EmbedBuilder()
            .setTitle(await t('Language Updated!', langCode))
            .setDescription(`${langInfo.flag} ${langInfo.native} (${langInfo.name})`)
            .setColor('#00FF00');
        await interaction.update({ embeds: [embed], components: [] });
        return;
    }
    
    if (!interaction.isCommand()) return;
    const langCode = getServerLanguage(interaction.guild.id);

    // Check verification for all commands except ping and help (allow these without verification)
    if (interaction.commandName !== 'ping' && interaction.commandName !== 'help') {
        const isVerified = await checkVerification(interaction, langCode);
        if (!isVerified) return;
    }

    try {
        if (interaction.commandName === 'ping') await ping.execute(interaction);
        else if (interaction.commandName === 'help') await help.execute(interaction, langCode);
        else if (interaction.commandName === 'permission') await permission.execute(interaction, langCode);
        else if (interaction.commandName === 'emoji_search') await emojisearch.execute(interaction, langCode, client);
        else if (interaction.commandName === 'suggestemojis') await suggestemojis.execute(interaction, langCode, client);
        else if (interaction.commandName === 'addemoji') await addemojiCmd.execute(interaction, langCode);
        else if (interaction.commandName === 'image_to_emoji') await imagetoemoji.execute(interaction, langCode, usedUrls);
        else if (interaction.commandName === 'emoji_to_sticker') await emojiTosticker.execute(interaction, langCode, convertedEmojisToStickers);
        else if (interaction.commandName === 'list_emojis') await listemoji.execute(interaction, langCode);
        else if (interaction.commandName === 'language') await language.execute(interaction, langCode);
        else if (interaction.commandName === 'delete_emoji') await deletemoji.execute(interaction, langCode, convertedStickersToEmojis);
        else if (interaction.commandName === 'rename_emoji') await renameemoji.execute(interaction, langCode);
        else if (interaction.commandName === 'delete_sticker') {
            const msg = await deletesticker.execute(interaction, langCode);
            stickerDeletionSessions.set(msg.id, {
                guildId: interaction.guild.id,
                userId: interaction.user.id,
                langCode: langCode,
                messageId: msg.id,
                channelId: msg.channel.id
            });
            setTimeout(() => stickerDeletionSessions.has(msg.id) && stickerDeletionSessions.delete(msg.id), 60000);
        }
        else if (interaction.commandName === 'rename_sticker') {
            const msg = await renamesticker.execute(interaction, langCode);
            const newName = interaction.options.getString('name');
            stickerRenameSessions.set(msg.id, {
                guildId: interaction.guild.id,
                userId: interaction.user.id,
                langCode: langCode,
                messageId: msg.id,
                channelId: msg.channel.id,
                newName: newName
            });
            setTimeout(() => stickerRenameSessions.has(msg.id) && stickerRenameSessions.delete(msg.id), 60000);
        }
        else if (interaction.commandName === 'sticker_to_emoji') {
            const msg = await stickertoemi.execute(interaction, langCode);
            const emojiName = interaction.options.getString('name');
            stickerToEmojiSessions.set(msg.id, {
                guildId: interaction.guild.id,
                userId: interaction.user.id,
                langCode: langCode,
                messageId: msg.id,
                channelId: msg.channel.id,
                emojiName: emojiName
            });
            setTimeout(() => stickerToEmojiSessions.has(msg.id) && stickerToEmojiSessions.delete(msg.id), 60000);
        }
        else if (interaction.commandName === 'image_to_sticker') await imagetosticker.execute(interaction, langCode, convertedImagesToStickers);
        else if (interaction.commandName === 'list_stickers') await liststicker.execute(interaction, langCode);
    } catch (error) {
        console.error('⚠️ Interaction error:', error.message);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild) return;
    const langCode = getServerLanguage(message.guild.id);

    try {
        // Check verification for message commands
        if (message.content.startsWith(prefix)) {
            const userId = message.author.id;
            if (!isUserVerified(userId)) {
                const embed = new EmbedBuilder()
                    .setTitle('🔐 ' + await t('Verification Required', langCode))
                    .setDescription(await t('You must verify your Discord account before using commands.', langCode) + 
                        `\n\n**${await t('Verification is required every 5 hours for security.', langCode)}**\n\n` +
                        `🔗 **${await t('Click here to verify:', langCode)}** ${WEBSITE_URL}/#activation`)
                    .setColor('#FF6B6B')
                    .setFooter({ text: await t('This message is only visible to you.', langCode) });
                
                await message.reply({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 15000));
                return;
            }
        }

        if (message.content === 'نعم' || message.content.toLowerCase() === 'yes') {
            const suggestedEmojis = suggestemojis.getSuggestedEmojis();
            if (suggestedEmojis.length > 0) {
                for (const emoji of suggestedEmojis) {
                    if (!message.guild.emojis.cache.find(e => e.name === emoji.name)) {
                        try {
                            await message.guild.emojis.create({ attachment: emoji.url, name: emoji.name });
                        } catch (error) {
                            console.error(`⚠️ Warning: Could not add emoji ${emoji.name}:`, error.message);
                        }
                    }
                }
                message.channel.send('✅ ' + await t('The suggested emojis have been added successfully!', langCode));
                suggestemojis.setSuggestedEmojis([]);
            }
        } else if (message.content === 'لا' || message.content.toLowerCase() === 'no') {
            const suggestedEmojis = suggestemojis.getSuggestedEmojis();
            if (suggestedEmojis.length > 0) {
                message.channel.send('❌ ' + await t('The suggested emojis were not added.', langCode));
                suggestemojis.setSuggestedEmojis([]);
            }
        }

        if (!message.stickers.size) return;

        const repliedTo = message.reference ? await message.channel.messages.fetch(message.reference.messageId) : null;
        if (!repliedTo) return;

        const deletionSession = stickerDeletionSessions.get(repliedTo.id);
        if (deletionSession && deletionSession.userId === message.author.id && deletionSession.guildId === message.guild.id) {
            const sessionLang = deletionSession.langCode || 'en';
            const sticker = message.stickers.first();
            const serverStickers = message.guild.stickers.cache;
            const stickerToDelete = serverStickers.find(s => s.id === sticker.id);

            if (stickerToDelete) {
                try {
                    await stickerToDelete.delete();
                    convertedEmojisToStickers.forEach((value, key) => {
                        if (value.stickerId === sticker.id) {
                            convertedEmojisToStickers.delete(key);
                        }
                    });
                    const embed = new EmbedBuilder()
                        .setTitle('✅ ' + await t('Sticker Deleted!', sessionLang))
                        .setDescription(await t('Sticker has been deleted successfully.', sessionLang))
                        .setColor('#00FF00')
                        .setFooter({ text: await t('Sticker deletion completed.', sessionLang) });
                    await message.reply({ embeds: [embed] });
                    stickerDeletionSessions.delete(repliedTo.id);
                } catch (error) {
                    const errorMsg = error.code === 50013 ?
                        await t('Missing permissions to delete sticker', sessionLang) :
                        await t('Error:', sessionLang) + ' ' + error.message;
                    const embed = new EmbedBuilder()
                        .setDescription(`❌ ${errorMsg}`)
                        .setColor('#FF0000');
                    await message.reply({ embeds: [embed] });
                    console.error(`⚠️ Discord Error in sticker deletion:`, error.code, error.message);
                }
            } else {
                const embed = new EmbedBuilder()
                    .setDescription('❌ ' + await t('Sticker not found in this server!', sessionLang))
                    .setColor('#FF0000');
                await message.reply({ embeds: [embed] });
            }
        }

        const conversionSession = stickerToEmojiSessions.get(repliedTo?.id);
        if (conversionSession && conversionSession.userId === message.author.id && conversionSession.guildId === message.guild.id) {
            const sessionLang = conversionSession.langCode || 'en';
            const sticker = message.stickers.first();
            const emojiName = conversionSession.emojiName;
            const stickerUrl = sticker.url;
            const stickerTrackingKey = `${message.guild.id}:${sticker.id}`;

            if (convertedStickersToEmojis.has(stickerTrackingKey)) {
                const emojiInfo = convertedStickersToEmojis.get(stickerTrackingKey);
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ ' + await t('Sticker Already Converted!', sessionLang))
                    .setDescription(await t('This sticker has already been converted to an emoji!', sessionLang) + `\n\n**${await t('Existing Emoji Name:', sessionLang)}** ${emojiInfo.emojiName}\n\n${await t('Delete the emoji to convert again.', sessionLang)}`)
                    .setColor('#FF9900')
                    .setFooter({ text: await t('This conversion is already done.', sessionLang) });
                await message.reply({ embeds: [embed] });
                stickerToEmojiSessions.delete(repliedTo.id);
                return;
            }

            try {
                const emoji = await message.guild.emojis.create({ attachment: stickerUrl, name: emojiName });
                const embed = new EmbedBuilder()
                    .setTitle('✅ ' + await t('Emoji Created!', sessionLang))
                    .setDescription(await t('Successfully converted sticker to emoji!', sessionLang) + `\n\n**${await t('Emoji Name:', sessionLang)}** ${emojiName}\n**${await t('Source Sticker:', sessionLang)}** ${sticker.name}`)
                    .setImage(stickerUrl)
                    .setColor('#00FF00')
                    .setFooter({ text: await t('You can now use this emoji in your server!', sessionLang) });
                await message.reply({ embeds: [embed] });
                stickerToEmojiSessions.delete(repliedTo.id);
                convertedStickersToEmojis.set(stickerTrackingKey, {
                    emojiId: emoji.id,
                    emojiName: emojiName,
                    stickerId: sticker.id
                });
            } catch (error) {
                const errorMsg = error.code === 50138 ?
                    await t('Sticker must be under 256KB', sessionLang) :
                    error.code === 50013 ?
                    await t('Missing permissions to create emoji', sessionLang) :
                    await t('Error:', sessionLang) + ' ' + error.message;
                const embed = new EmbedBuilder()
                    .setDescription(`❌ ${errorMsg}`)
                    .setColor('#FF0000');
                await message.reply({ embeds: [embed] });
                console.error(`⚠️ Discord Error in sticker to emoji conversion:`, error.code, error.message);
            }
        }

        const renameSession = stickerRenameSessions.get(repliedTo?.id);
        if (renameSession && renameSession.userId === message.author.id && renameSession.guildId === message.guild.id) {
            const sessionLang = renameSession.langCode || 'en';
            const sticker = message.stickers.first();
            const newName = renameSession.newName;
            const serverStickers = message.guild.stickers.cache;
            const stickerToRename = serverStickers.find(s => s.id === sticker.id);

            if (stickerToRename) {
                try {
                    await stickerToRename.edit({ name: newName });
                    const embed = new EmbedBuilder()
                        .setTitle('✅ ' + await t('Sticker Renamed!', sessionLang))
                        .setDescription(await t('Successfully renamed sticker to:', sessionLang) + ` **${newName}**`)
                        .setColor('#00FF00')
                        .setFooter({ text: await t('Sticker name updated.', sessionLang) });
                    await message.reply({ embeds: [embed] });
                    stickerRenameSessions.delete(repliedTo.id);
                } catch (error) {
                    const errorMsg = error.code === 50013 ?
                        await t('Missing permissions to rename sticker', sessionLang) :
                        error.code === 50035 ?
                        await t('Invalid sticker name', sessionLang) :
                        await t('Error:', sessionLang) + ' ' + error.message;
                    const embed = new EmbedBuilder()
                        .setDescription(`❌ ${errorMsg}`)
                        .setColor('#FF0000');
                    await message.reply({ embeds: [embed] });
                    console.error(`⚠️ Discord Error in sticker rename:`, error.code, error.message);
                }
            } else {
                const embed = new EmbedBuilder()
                    .setDescription('❌ ' + await t('Sticker not found in this server!', sessionLang))
                    .setColor('#FF0000');
                await message.reply({ embeds: [embed] });
            }
        }
    } catch (error) {
        console.error('Message processing error:', error);
    }
});

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'online', bot: 'ProEmoji' });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
    res.json({ 
        servers: client.guilds.cache.size,
        verifiedUsers: getVerifiedUsersCount()
    });
});

// User profile endpoint
app.get('/api/user-profile', async (req, res) => {
    try {
        if (!DISCORD_CLIENT_ID) {
            return res.status(400).json({ error: 'Discord not configured' });
        }
        res.json({
            username: 'ProEmoji User',
            avatar: 'https://cdn.discordapp.com/embed/avatars/0.png'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Discord OAuth2 - Redirect to Discord authorization
app.get('/auth/discord', (req, res) => {
    if (!DISCORD_CLIENT_ID) {
        return res.status(500).send('Discord OAuth2 not configured. Please set DISCORD_CLIENT_ID.');
    }
    
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'identify'
    });
    
    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

// Discord OAuth2 Callback
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    
    if (!code) {
        return res.redirect('/verification-failed.html');
    }
    
    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            })
        });
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
            console.error('OAuth2 token error:', tokenData);
            return res.redirect('/verification-failed.html');
        }
        
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });
        
        const userData = await userResponse.json();
        
        if (!userData.id) {
            console.error('User data error:', userData);
            return res.redirect('/verification-failed.html');
        }
        
        verifyUser(userData.id, userData.username);
        console.log(`User verified: ${userData.username} (${userData.id})`);
        
        res.redirect('/verification-success.html');
    } catch (error) {
        console.error('OAuth2 callback error:', error);
        res.redirect('/verification-failed.html');
    }
});

// Help endpoints
app.get('/api/help', (req, res) => {
    res.json(getHelp());
});

app.post('/api/help', (req, res) => {
    const { title, content, timestamp } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    const success = addHelp(title, content, timestamp || new Date().toISOString());
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to add help' });
    }
});

// Suggestions endpoints
app.get('/api/suggestions', (req, res) => {
    res.json(getSuggestions());
});

app.post('/api/suggestions', (req, res) => {
    const { title, content, timestamp } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    const success = addSuggestion(title, content, timestamp || new Date().toISOString());
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to add suggestion' });
    }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

client.login(process.env.token).catch(err => {
    console.error('❌ Failed to login:', err.message);
    console.error('تأكد من إضافة token في Replit Secrets!');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('⚠️ Uncaught Exception:', error.message);
});
