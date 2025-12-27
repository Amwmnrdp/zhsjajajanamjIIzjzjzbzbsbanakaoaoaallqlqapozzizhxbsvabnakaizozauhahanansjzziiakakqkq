const express = require('express');
const path = require('path');
const app = express();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const db = require('./src/utils/database');
const { SUPPORTED_LANGUAGES, COMMAND_DEFINITIONS, OWNER_ONLY_COMMANDS, PUBLIC_COMMANDS, EMOJI_PERMISSION_COMMANDS } = require('./src/utils/constants');
const { t, preWarmCache } = require('./src/utils/languages');

const addemojiCmd = require('./src/commands/emoji/addemoji');
const listemoji = require('./src/commands/emoji/listemoji');
const deletemoji = require('./src/commands/emoji/deletemoji');
const renameemoji = require('./src/commands/emoji/renameemoji');
const emojisearch = require('./src/commands/emoji/emojisearch');
const imagetoemoji = require('./src/commands/emoji/imagetoemoji');
const emojiTosticker = require('./src/commands/emoji/emojiTosticker');
const suggestemojis = require('./src/commands/emoji/suggestemojis');

const addsticker = require('./src/commands/sticker/addsticker');
const deletesticker = require('./src/commands/sticker/deletesticker');
const renamesticker = require('./src/commands/sticker/renamesticker');
const stickertoemi = require('./src/commands/sticker/stickertoemi');
const imagetosticker = require('./src/commands/sticker/imagetosticker');
const liststicker = require('./src/commands/sticker/liststicker');

const ping = require('./src/commands/storage/ping');
const permission = require('./src/commands/storage/permission');
const language = require('./src/commands/storage/language');
const help = require('./src/commands/storage/help');

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}/auth/discord/callback`
    : 'http://localhost:3000/auth/discord/callback';

const WEBSITE_URL = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:3000';

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
const stickerAddSessions = new Map();
const convertedEmojisToStickers = new Map();
const convertedImagesToStickers = new Map();
const convertedStickersToEmojis = new Map();

let currentVerifiedUser = null;

async function initializeBot() {
    try {
        await db.initDatabase();
        console.log('✅ Database const expre');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
    }
}

initializeBot();

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

client.on('guildCreate', async guild => {
    try {
        await db.addServer(guild.id, guild.name);
        console.log(`✅ Joined: ${guild.name}`);
    } catch (error) {
        console.error('Error adding server:', error.message);
    }
});

client.on('guildDelete', async guild => {
    try {
        await db.removeServer(guild.id);
        console.log(`❌ Left: ${guild.name}`);
    } catch (error) {
        console.error('Error removing server:', error.message);
    }
});

async function checkVerification(interaction, langCode) {
    const userId = interaction.user.id;
    const isVerified = await db.isUserVerifiedDb(userId);
    
    if (!isVerified) {
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

async function checkPermissions(interaction, langCode) {
    const commandName = interaction.commandName;
    
    if (PUBLIC_COMMANDS.includes(commandName)) {
        return true;
    }
    
    if (OWNER_ONLY_COMMANDS.includes(commandName)) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const embed = new EmbedBuilder()
                .setTitle('🚫 ' + await t('Permission Denied', langCode))
                .setDescription(await t('Only the server owner or administrators can use this command.', langCode))
                .setColor('#FF0000');
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return false;
        }
        return true;
    }
    
    if (EMOJI_PERMISSION_COMMANDS.includes(commandName)) {
        const hasManageEmoji = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) ||
                               interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);
        
        if (!hasManageEmoji) {
            const embed = new EmbedBuilder()
                .setTitle('🚫 ' + await t('Permission Denied', langCode))
                .setDescription(await t('You need the "Manage Emojis and Stickers" permission to use this command.', langCode))
                .setColor('#FF0000');
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return false;
        }
        return true;
    }
    
    return true;
}

client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'language_select') {
        const langCode = interaction.values[0];
        const langInfo = SUPPORTED_LANGUAGES[langCode];
        await db.setServerLanguage(interaction.guild.id, langCode);
        
        const embed = new EmbedBuilder()
            .setTitle(await t('Language Updated!', langCode))
            .setDescription(`${langInfo.flag} ${langInfo.native} (${langInfo.name})`)
            .setColor('#00FF00');
        await interaction.update({ embeds: [embed], components: [] });
        return;
    }
    
    if (!interaction.isCommand()) return;
    
    const langCode = await db.getServerLanguage(interaction.guild.id);

    if (!PUBLIC_COMMANDS.includes(interaction.commandName)) {
        const isVerified = await checkVerification(interaction, langCode);
        if (!isVerified) return;
    }

    const hasPermission = await checkPermissions(interaction, langCode);
    if (!hasPermission) return;

    try {
        if (interaction.commandName === 'ping') await ping.execute(interaction);
        else if (interaction.commandName === 'help') await help.execute(interaction, langCode);
        else if (interaction.commandName === 'permission') await permission.execute(interaction, langCode);
        else if (interaction.commandName === 'emoji_search') await emojisearch.execute(interaction, langCode, client);
        else if (interaction.commandName === 'suggest_emojis') await suggestemojis.execute(interaction, langCode, client);
        else if (interaction.commandName === 'add_emoji') await addemojiCmd.execute(interaction, langCode);
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
        else if (interaction.commandName === 'add_sticker') {
            const msg = await addsticker.execute(interaction, langCode);
            const customName = interaction.options.getString('name');
            stickerAddSessions.set(msg.id, {
                guildId: interaction.guild.id,
                userId: interaction.user.id,
                langCode: langCode,
                messageId: msg.id,
                channelId: msg.channel.id,
                customName: customName
            });
            setTimeout(() => stickerAddSessions.has(msg.id) && stickerAddSessions.delete(msg.id), 60000);
        }
    } catch (error) {
        console.error('⚠️ Interaction error:', error.message);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild) return;
    const langCode = await db.getServerLanguage(message.guild.id);

    try {
        if (message.content.startsWith(prefix)) {
            const userId = message.author.id;
            const isVerified = await db.isUserVerifiedDb(userId);
            if (!isVerified) {
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

        const addSession = stickerAddSessions.get(repliedTo?.id);
        if (addSession && addSession.userId === message.author.id && addSession.guildId === message.guild.id) {
            const sessionLang = addSession.langCode || 'en';
            const sticker = message.stickers.first();
            const stickerName = addSession.customName || sticker.name;
            const serverStickers = message.guild.stickers.cache;
            const duplicateByName = serverStickers.find(s => s.name.toLowerCase() === stickerName.toLowerCase());

            if (duplicateByName) {
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ ' + await t('Sticker Name Already Exists!', sessionLang))
                    .setDescription(await t('A sticker with this name already exists!', sessionLang))
                    .setColor('#FF9900');
                await message.reply({ embeds: [embed] });
                stickerAddSessions.delete(repliedTo.id);
                return;
            }

            try {
                const newSticker = await message.guild.stickers.create({
                    file: sticker.url,
                    name: stickerName,
                    description: await t('Added by', sessionLang) + ` ${message.author.username}`,
                    reason: `Added by ${message.author.tag}`
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ ' + await t('Sticker Added!', sessionLang))
                    .setDescription(await t('Successfully added sticker to server!', sessionLang) + `\n\n**${await t('Sticker Name:', sessionLang)}** ${stickerName}`)
                    .setColor('#00FF00')
                    .setFooter({ text: await t('You can now use this sticker in your server!', sessionLang) });
                await message.reply({ embeds: [embed] });
                stickerAddSessions.delete(repliedTo.id);
            } catch (error) {
                const errorMsg = error.code === 50045 ?
                    await t('Sticker URL is invalid or unavailable', sessionLang) :
                    error.code === 50138 ?
                    await t('File must be under 512KB', sessionLang) :
                    error.code === 50013 ?
                    await t('Missing permissions to create sticker', sessionLang) :
                    await t('Error:', sessionLang) + ' ' + error.message;
                const embed = new EmbedBuilder()
                    .setDescription(`❌ ${errorMsg}`)
                    .setColor('#FF0000');
                await message.reply({ embeds: [embed] });
                console.error(`⚠️ Discord Error in add_sticker:`, error.code, error.message);
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'online', bot: 'ProEmoji' });
});

app.get('/api/stats', async (req, res) => {
    const verifiedCount = await db.getVerifiedUsersCountDb();
    res.json({ 
        servers: client.guilds.cache.size,
        verifiedUsers: verifiedCount
    });
});

app.get('/api/user-profile', async (req, res) => {
    try {
        if (currentVerifiedUser) {
            const isUserAdmin = await db.isAdmin(currentVerifiedUser.discord_id);
            const verifiedUser = await db.getVerifiedUser(currentVerifiedUser.discord_id);
            const verifiedAt = verifiedUser ? new Date(verifiedUser.verified_at).getTime() : null;
            const expiresAt = verifiedAt ? verifiedAt + (5 * 60 * 60 * 1000) : null;
            
            res.json({
                ...currentVerifiedUser,
                is_admin: isUserAdmin,
                verified_at: verifiedAt,
                expires_at: expiresAt
            });
        } else {
            res.json({
                username: 'Guest',
                avatar: 'https://cdn.discordapp.com/embed/avatars/0.png'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/auth/discord', (req, res) => {
    if (!DISCORD_CLIENT_ID) {
        return res.status(500).send('Discord OAuth2 not configured.');
    }
    
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'identify email'
    });
    
    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    
    if (!code) {
        return res.redirect('/#activation?error=no_code');
    }
    
    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
            return res.redirect('/#activation?error=token_failed');
        }
        
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        
        const userData = await userResponse.json();
        
        if (!userData.id) {
            return res.redirect('/#activation?error=user_failed');
        }
        
        const avatarUrl = userData.avatar 
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
        
        await db.verifyUserDb(userData.id, userData.username, avatarUrl);
        
        currentVerifiedUser = {
            discord_id: userData.id,
            username: userData.username,
            avatar: avatarUrl
        };
        
        console.log(`✅ User verified: ${userData.username} (${userData.id})`);
        
        res.redirect('/#home');
    } catch (error) {
        console.error('OAuth2 error:', error);
        res.redirect('/#activation?error=oauth_failed');
    }
});

app.get('/api/suggestions', async (req, res) => {
    try {
        const suggestions = await db.getSuggestions();
        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/suggestions', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const { title, description } = req.body;
        const suggestion = await db.createSuggestion(
            currentVerifiedUser.discord_id,
            currentVerifiedUser.username,
            currentVerifiedUser.avatar,
            title,
            description
        );
        res.json(suggestion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/suggestions/:id', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const suggestion = await db.getSuggestionById(req.params.id);
        const isUserAdmin = await db.isAdmin(currentVerifiedUser.discord_id);
        
        if (suggestion.discord_id !== currentVerifiedUser.discord_id && !isUserAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        await db.deleteSuggestion(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/suggestions/:id/like', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const { is_like } = req.body;
        await db.toggleLike(currentVerifiedUser.discord_id, 'suggestion', req.params.id, is_like);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/suggestions/:id/comments', async (req, res) => {
    try {
        const comments = await db.getComments('suggestion', req.params.id);
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/suggestions/:id/comments', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const { content } = req.body;
        const comment = await db.addComment(
            currentVerifiedUser.discord_id,
            currentVerifiedUser.username,
            currentVerifiedUser.avatar,
            'suggestion',
            req.params.id,
            content
        );
        res.json(comment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports', async (req, res) => {
    try {
        const reports = await db.getReports();
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reports', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const { title, description, image_url } = req.body;
        const report = await db.createReport(
            currentVerifiedUser.discord_id,
            currentVerifiedUser.username,
            currentVerifiedUser.avatar,
            title,
            description,
            image_url
        );
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/reports/:id', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const report = await db.getReportById(req.params.id);
        const isUserAdmin = await db.isAdmin(currentVerifiedUser.discord_id);
        
        if (report.discord_id !== currentVerifiedUser.discord_id && !isUserAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        await db.deleteReport(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reports/:id/like', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const { is_like } = req.body;
        await db.toggleLike(currentVerifiedUser.discord_id, 'report', req.params.id, is_like);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/:id/comments', async (req, res) => {
    try {
        const comments = await db.getComments('report', req.params.id);
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reports/:id/comments', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const { content } = req.body;
        const comment = await db.addComment(
            currentVerifiedUser.discord_id,
            currentVerifiedUser.username,
            currentVerifiedUser.avatar,
            'report',
            req.params.id,
            content
        );
        res.json(comment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/comments/:id', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const isUserAdmin = await db.isAdmin(currentVerifiedUser.discord_id);
        await db.deleteComment(req.params.id, currentVerifiedUser.discord_id, isUserAdmin);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admins', async (req, res) => {
    try {
        const admins = await db.getAllAdmins();
        res.json(admins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admins', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const isUserOwner = await db.isOwner(currentVerifiedUser.discord_id);
        if (!isUserOwner) {
            return res.status(403).json({ error: 'Only the owner can add admins' });
        }
        
        const { discord_id, username, avatar } = req.body;
        await db.addAdmin(discord_id, username, avatar, false);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admins/:discord_id', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const isUserOwner = await db.isOwner(currentVerifiedUser.discord_id);
        if (!isUserOwner) {
            return res.status(403).json({ error: 'Only the owner can remove admins' });
        }
        
        await db.removeAdmin(req.params.discord_id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/verify-discord-id/:discord_id', async (req, res) => {
    try {
        const { discord_id } = req.params;
        
        if (!/^\d+$/.test(discord_id)) {
            return res.status(400).json({ error: 'Invalid Discord ID format' });
        }
        
        try {
            const user = await client.users.fetch(discord_id);
            if (!user) {
                return res.status(404).json({ error: 'Discord user not found' });
            }
            
            res.json({
                discord_id: user.id,
                username: user.username,
                avatar: user.displayAvatarURL()
            });
        } catch (discordError) {
            return res.status(404).json({ error: 'Discord user not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/set-owner', async (req, res) => {
    try {
        if (!currentVerifiedUser) {
            return res.status(401).json({ error: 'Not verified' });
        }
        
        const admins = await db.getAllAdmins();
        const hasOwner = admins.some(a => a.is_owner);
        
        if (hasOwner) {
            return res.status(400).json({ error: 'Owner already exists' });
        }
        
        await db.addAdmin(
            currentVerifiedUser.discord_id,
            currentVerifiedUser.username,
            currentVerifiedUser.avatar,
            true
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

client.login(process.env.token);
