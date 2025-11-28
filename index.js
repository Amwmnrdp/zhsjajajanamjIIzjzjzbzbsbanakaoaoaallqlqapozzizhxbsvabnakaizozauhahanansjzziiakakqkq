const express = require('express');
const app = express();
const fs = require('fs');
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ApplicationCommandOptionType, 
    PermissionsBitField,
    StringSelectMenuBuilder
} = require('discord.js');
const isImageUrl = require('is-image-url');
const translate = require('google-translate-api-x');

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
const allowedServers = new Map();
const serverLanguages = new Map();
const usedUrls = {};
let suggestedEmojis = [];
const stickerDeletionSessions = new Map();
const stickerToEmojiSessions = new Map();
const convertedEmojisToStickers = new Map();
const convertedImagesToStickers = new Map();
const convertedStickersToEmojis = new Map();
const SERVERS_FILE = 'servers.json';
const LANGUAGES_FILE = 'languages.json';
const translationCache = new Map();

const SUPPORTED_LANGUAGES = {
    'en': { name: 'English', flag: '🇺🇸', native: 'English', translateCode: 'en' },
    'ar': { name: 'Arabic', flag: '<:Syria:1443915175379079208>', native: 'العربية', translateCode: 'ar' },
    'zh': { name: 'Chinese', flag: '🇨🇳', native: '中文', translateCode: 'zh-CN' },
    'es': { name: 'Spanish', flag: '🇪🇸', native: 'Español', translateCode: 'es' },
    'ru': { name: 'Russian', flag: '🇷🇺', native: 'Русский', translateCode: 'ru' },
    'tr': { name: 'Turkish', flag: '🇹🇷', native: 'Türkçe', translateCode: 'tr' },
    'fr': { name: 'French', flag: '🇫🇷', native: 'Français', translateCode: 'fr' },
    'de': { name: 'German', flag: '🇩🇪', native: 'Deutsch', translateCode: 'de' },
    'it': { name: 'Italian', flag: '🇮🇹', native: 'Italiano', translateCode: 'it' },
    'ja': { name: 'Japanese', flag: '🇯🇵', native: '日本語', translateCode: 'ja' },
    'ko': { name: 'Korean', flag: '🇰🇷', native: '한국어', translateCode: 'ko' },
    'pt': { name: 'Portuguese', flag: '🇵🇹', native: 'Português', translateCode: 'pt' }
};

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

const LEGACY_LANGUAGE_MAP = {
    'english': 'en',
    'arabic': 'ar',
    'chinese': 'zh',
    'spanish': 'es',
    'russian': 'ru',
    'turkish': 'tr',
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'japanese': 'ja',
    'korean': 'ko',
    'portuguese': 'pt'
};

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

loadServerLanguages();

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

function parseEmoji(emoji) {
    const regex = /<(a)?:(\w+):(\d+)>/;
    const match = emoji.match(regex);
    if (match) {
        return {
            animated: !!match[1],
            name: match[2],
            id: match[3]
        };
    }
    return { id: null };
}

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

client.once('ready', async () => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Bot: ${client.user.tag}`);
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
        const commands = [
            {
                name: 'permission',
                description: 'Set permissions for emoji suggestions'
            },
            {
                name: 'suggestemojis',
                description: 'Get 5 emoji suggestions'
            },
            {
                name: 'addemoji',
                description: 'Add an emoji to server',
                options: [
                    {
                        name: 'emoji',
                        type: ApplicationCommandOptionType.String,
                        description: 'The emoji to add',
                        required: true
                    },
                    {
                        name: 'name',
                        type: ApplicationCommandOptionType.String,
                        description: 'Custom name (optional)',
                        required: false
                    }
                ]
            },
            {
                name: 'image_to_emoji',
                description: 'Convert image to emoji',
                options: [
                    {
                        name: 'name',
                        type: ApplicationCommandOptionType.String,
                        description: 'Emoji name',
                        required: true
                    },
                    {
                        name: 'url',
                        type: ApplicationCommandOptionType.String,
                        description: 'Image URL',
                        required: true
                    }
                ]
            },
            {
                name: 'emoji_to_sticker',
                description: 'Convert emoji to sticker',
                options: [
                    {
                        name: 'emoji',
                        type: ApplicationCommandOptionType.String,
                        description: 'The emoji to convert',
                        required: true
                    },
                    {
                        name: 'name',
                        type: ApplicationCommandOptionType.String,
                        description: 'Sticker name',
                        required: true
                    }
                ]
            },
            {
                name: 'image_to_sticker',
                description: 'Convert image to sticker',
                options: [
                    {
                        name: 'url',
                        type: ApplicationCommandOptionType.String,
                        description: 'Image URL',
                        required: true
                    },
                    {
                        name: 'name',
                        type: ApplicationCommandOptionType.String,
                        description: 'Sticker name',
                        required: true
                    }
                ]
            },
            {
                name: 'list_emojis',
                description: 'List all server emojis'
            },
            {
                name: 'language',
                description: 'Change bot language'
            },
            {
                name: 'delete_emoji',
                description: 'Delete an emoji',
                options: [
                    {
                        name: 'emoji',
                        type: ApplicationCommandOptionType.String,
                        description: 'Emoji to delete',
                        required: true
                    }
                ]
            },
            {
                name: 'rename_emoji',
                description: 'Rename an emoji',
                options: [
                    {
                        name: 'emoji',
                        type: ApplicationCommandOptionType.String,
                        description: 'Emoji to rename',
                        required: true
                    },
                    {
                        name: 'name',
                        type: ApplicationCommandOptionType.String,
                        description: 'New name',
                        required: true
                    }
                ]
            },
            {
                name: 'delete_sticker',
                description: 'Delete a sticker'
            },
            {
                name: 'sticker_to_emoji',
                description: 'Convert sticker to emoji',
                options: [
                    {
                        name: 'name',
                        type: ApplicationCommandOptionType.String,
                        description: 'Emoji name',
                        required: true
                    }
                ]
            },
            {
                name: 'ping',
                description: 'Check bot response speed'
            }
        ];

        await client.application.commands.set(commands);
        console.log('✅ Slash commands registered!');
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        preWarmCache().catch(err => console.error('⚠️ Cache warming error:', err.message));
    } catch (error) {
        console.error('❌ Error:', error);
    }
});

client.on('guildCreate', guild => {
    allowedServers.set(guild.id, true);
    serverLanguages.set(guild.id, 'en');
    const servers = readServersFile();
    if (!servers.includes(guild.name)) {
        servers.push(guild.name);
        writeServersFile(servers);
        console.log(`✅ Joined: ${guild.name}`);
    }
});

client.on('guildDelete', guild => {
    allowedServers.delete(guild.id);
    serverLanguages.delete(guild.id);
    const servers = readServersFile();
    const updatedServers = servers.filter(name => name !== guild.name);
    writeServersFile(updatedServers);
    console.log(`❌ Left: ${guild.name}`);
});

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
    const langCode = serverLanguages.get(interaction.guild.id) || 'en';

    try {
        if (interaction.commandName === 'ping') {
            const startTime = Date.now();
            const gatewayLatency = Math.round(client.ws.ping);
            
            const embed = new EmbedBuilder()
                .setTitle('🏓 Pong!')
                .setDescription(
                    'Gateway latency: ' + gatewayLatency + 'ms\n' +
                    'Response time: ' + (Date.now() - startTime) + 'ms'
                )
                .setColor('#00FFFF');
            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (interaction.commandName === 'permission') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                const embed = new EmbedBuilder()
                    .setDescription('❌ ' + await t('Need ADMINISTRATOR permission!', langCode))
                    .setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('allow').setLabel('✅ ' + await t('Allow', langCode)).setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('refuse').setLabel('❌ ' + await t('Refuse', langCode)).setStyle(ButtonStyle.Danger)
            );

            const embed = new EmbedBuilder()
                .setTitle('🔐 ' + await t('Permission Settings', langCode))
                .setDescription(await t('Allow bot to suggest emojis from this server?', langCode))
                .setColor('#00FFFF');

            await interaction.reply({ embeds: [embed], components: [buttonRow] });

            const filter = i => (i.customId === 'allow' || i.customId === 'refuse') && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                await i.deferUpdate();
                if (i.customId === 'allow') {
                    allowedServers.set(interaction.guild.id, true);
                    const e = new EmbedBuilder().setTitle('✅ ' + await t('Permission Granted', langCode)).setDescription(await t('Bot can suggest emojis from this server.', langCode)).setColor('#00FF00');
                    await i.editReply({ embeds: [e], components: [] });
                } else {
                    allowedServers.set(interaction.guild.id, false);
                    const e = new EmbedBuilder().setTitle('❌ ' + await t('Permission Denied', langCode)).setDescription(await t('Bot will NOT suggest emojis.', langCode)).setColor('#FF0000');
                    await i.editReply({ embeds: [e], components: [] });
                }
                collector.stop();
            });
        }

        if (interaction.commandName === 'suggestemojis') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need Manage Emojis permission!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            let emojis = [];
            client.guilds.cache.forEach(guild => {
                if (allowedServers.get(guild.id) === true) {
                    guild.emojis.cache.forEach(emoji => {
                        if (!emojis.includes(emoji) && !interaction.guild.emojis.cache.find(e => e.name === emoji.name)) {
                            emojis.push(emoji);
                        }
                    });
                }
            });

            if (emojis.length === 0) {
                const embed = new EmbedBuilder().setTitle('❌ ' + await t('No Emojis Available', langCode)).setDescription(await t('No emojis available.', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            emojis = emojis.sort(() => Math.random() - 0.5).slice(0, 5);
            const embed = new EmbedBuilder()
                .setTitle('💡 ' + await t('Suggested Emojis', langCode))
                .setDescription(await t('Here are 5 suggestions:', langCode) + '\n' + emojis.map(e => e.toString()).join(' '))
                .setColor('#00FFFF')
                .setFooter({ text: await t('React with checkmark to add or X to cancel.', langCode) });

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            try {
                await msg.react('✅');
                await msg.react('❌');
            } catch (error) {
                console.error('⚠️ Warning: Could not add reactions:', error.message);
            }

            const storedLangCode = langCode;
            const filter = (reaction, user) => ['✅', '❌'].includes(reaction.emoji.name) && user.id === interaction.user.id;
            msg.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                .then(async collected => {
                    const reaction = collected.first();
                    if (reaction.emoji.name === '✅') {
                        for (const emoji of emojis) {
                            if (!interaction.guild.emojis.cache.find(e => e.name === emoji.name)) {
                                try {
                                    await interaction.guild.emojis.create({ attachment: emoji.url, name: emoji.name });
                                } catch (error) {
                                    console.error(`⚠️ Warning: Could not add emoji ${emoji.name}:`, error.message);
                                }
                            }
                        }
                        await interaction.followUp('✅ ' + await t('Emojis added!', storedLangCode));
                    } else {
                        await interaction.followUp('❌ ' + await t('Cancelled.', storedLangCode));
                    }
                })
                .catch(async () => interaction.followUp('⏳ ' + await t('Timeout.', storedLangCode)));
        }

        if (interaction.commandName === 'addemoji') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const emoji = interaction.options.getString('emoji');
            const name = interaction.options.getString('name');
            let info = parseEmoji(emoji);

            if (!info.id) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Invalid emoji!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            if (interaction.guild.emojis.cache.find(e => e.name === info.name)) {
                const embed = new EmbedBuilder().setDescription('⚠️ ' + emoji + ' ' + await t('already exists!', langCode)).setColor('#FF9900');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            try {
                let type = info.animated ? '.gif' : '.png';
                let url = `https://cdn.discordapp.com/emojis/${info.id + type}`;
                const emj = await interaction.guild.emojis.create({ attachment: url, name: name || info.name, reason: `By ${interaction.user.tag}` });
                const embed = new EmbedBuilder().setDescription('✅ ' + await t('Added!', langCode) + ' ' + emj).setColor('#00FF00');
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Error:', langCode) + ' ' + error.message).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
            }
        }

        if (interaction.commandName === 'image_to_emoji') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const nameOption = interaction.options.getString('name');
            const urlOption = interaction.options.getString('url');

            if (!isImageUrl(urlOption)) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Invalid image URL!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            if (usedUrls[urlOption] && usedUrls[urlOption].includes(interaction.guild.id)) {
                const embed = new EmbedBuilder().setDescription('⚠️ ' + await t('Image already used!', langCode)).setColor('#FF9900');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            try {
                await interaction.guild.emojis.create({ attachment: urlOption, name: nameOption });
                usedUrls[urlOption] = usedUrls[urlOption] || [];
                usedUrls[urlOption].push(interaction.guild.id);
                const embed = new EmbedBuilder().setDescription('✅ ' + await t('Image converted to emoji!', langCode)).setColor('#00FF00');
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                const errorMsg = error.code === 50138 ? 
                    await t('Image must be under 256KB', langCode) :
                    error.code === 50035 ?
                    await t('Invalid request:', langCode) + ' ' + error.message :
                    await t('Error:', langCode) + ' ' + error.message;
                const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                console.error(`⚠️ Discord Error in image_to_emoji:`, error.code, error.message);
            }
        }

        if (interaction.commandName === 'emoji_to_sticker') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const emojiInput = interaction.options.getString('emoji');
            const stickerName = interaction.options.getString('name');
            const match = emojiInput.match(/<(a)?:(\w+):(\d+)>/);

            if (!match) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Invalid emoji!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const emojiIdNum = match[3];
            const isAnimated = !!match[1];
            const fileExtension = isAnimated ? '.gif' : '.png';
            const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiIdNum + fileExtension}`;

            const trackingKey = `${interaction.guild.id}:${emojiIdNum}`;
            if (convertedEmojisToStickers.has(trackingKey)) {
                const stickerInfo = convertedEmojisToStickers.get(trackingKey);
                const stickerUrl = `https://cdn.discordapp.com/stickers/${stickerInfo.stickerId}.png`;
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ ' + await t('Emoji Already Converted!', langCode))
                    .setDescription(await t('This emoji has already been converted to a sticker!', langCode) + `\n\n**${await t('Existing Sticker Name:', langCode)}** ${stickerInfo.stickerName}\n**${await t('Sticker ID:', langCode)}** ${stickerInfo.stickerId}\n\n${await t('Delete the sticker to convert again.', langCode)}`)
                    .setThumbnail(stickerUrl)
                    .setColor('#FF9900')
                    .setFooter({ text: await t('This conversion is already done.', langCode) });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const existingStickers = interaction.guild.stickers.cache;
            const duplicateByName = existingStickers.find(s => s.name.toLowerCase() === stickerName.toLowerCase());

            if (duplicateByName) {
                const stickerUrl = `https://cdn.discordapp.com/stickers/${duplicateByName.id}.png`;
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ ' + await t('Sticker Name Already Exists!', langCode))
                    .setDescription(await t('A sticker with this name already exists!', langCode) + `\n\n**${await t('Existing Sticker Name:', langCode)}** ${duplicateByName.name}\n**${await t('Sticker ID:', langCode)}** ${duplicateByName.id}`)
                    .setThumbnail(stickerUrl)
                    .setColor('#FF9900')
                    .setFooter({ text: await t('Please choose a different name.', langCode) });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            try {
                const sticker = await interaction.guild.stickers.create({
                    file: emojiUrl,
                    name: stickerName,
                    description: await t('Converted from emoji', langCode),
                    reason: `By ${interaction.user.tag}`
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ ' + await t('Sticker Created!', langCode))
                    .setDescription(await t('Successfully converted emoji to sticker!', langCode) + `\n\n**${await t('Sticker Name:', langCode)}** ${stickerName}\n**${await t('Sticker ID:', langCode)}** ${sticker.id}`)
                    .setImage(emojiUrl)
                    .setColor('#00FF00')
                    .setFooter({ text: await t('You can now use this sticker in your server!', langCode) });

                await interaction.reply({ embeds: [embed] });
                convertedEmojisToStickers.set(trackingKey, {
                    stickerId: sticker.id,
                    stickerName: stickerName,
                    emojiId: emojiIdNum
                });
            } catch (error) {
                const errorMsg = error.code === 50045 ?
                    await t('Emoji URL is invalid or unavailable', langCode) :
                    error.code === 50138 ?
                    await t('File must be under 512KB', langCode) :
                    await t('Error:', langCode) + ' ' + error.message;
                const embed = new EmbedBuilder()
                    .setDescription(`❌ ${errorMsg}`)
                    .setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                console.error(`⚠️ Discord Error in emoji_to_sticker:`, error.code, error.message);
            }
        }

        if (interaction.commandName === 'image_to_sticker') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const imageUrl = interaction.options.getString('url');
            const stickerName = interaction.options.getString('name');

            if (!isImageUrl(imageUrl)) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Invalid image URL!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const imageTrackingKey = `${interaction.guild.id}:${imageUrl}`;
            if (convertedImagesToStickers.has(imageTrackingKey)) {
                const stickerInfo = convertedImagesToStickers.get(imageTrackingKey);
                const stickerUrl = `https://cdn.discordapp.com/stickers/${stickerInfo.stickerId}.png`;
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ ' + await t('Image Already Converted!', langCode))
                    .setDescription(await t('This image has already been converted to a sticker!', langCode) + `\n\n**${await t('Existing Sticker Name:', langCode)}** ${stickerInfo.stickerName}\n**${await t('Sticker ID:', langCode)}** ${stickerInfo.stickerId}\n\n${await t('Delete the sticker to convert again.', langCode)}`)
                    .setThumbnail(stickerUrl)
                    .setColor('#FF9900')
                    .setFooter({ text: await t('This conversion is already done.', langCode) });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const existingStickers = interaction.guild.stickers.cache;
            const duplicateByName = existingStickers.find(s => s.name.toLowerCase() === stickerName.toLowerCase());

            if (duplicateByName) {
                const stickerUrl = `https://cdn.discordapp.com/stickers/${duplicateByName.id}.png`;
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ ' + await t('Sticker Name Already Exists!', langCode))
                    .setDescription(await t('A sticker with this name already exists!', langCode) + `\n\n**${await t('Existing Sticker Name:', langCode)}** ${duplicateByName.name}\n**${await t('Sticker ID:', langCode)}** ${duplicateByName.id}`)
                    .setThumbnail(stickerUrl)
                    .setColor('#FF9900')
                    .setFooter({ text: await t('Please choose a different name.', langCode) });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            try {
                const sticker = await interaction.guild.stickers.create({
                    file: imageUrl,
                    name: stickerName,
                    description: await t('Converted from image', langCode),
                    reason: `By ${interaction.user.tag}`
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ ' + await t('Sticker Created!', langCode))
                    .setDescription(await t('Successfully converted image to sticker!', langCode) + `\n\n**${await t('Sticker Name:', langCode)}** ${stickerName}\n**${await t('Sticker ID:', langCode)}** ${sticker.id}`)
                    .setImage(imageUrl)
                    .setColor('#00FF00')
                    .setFooter({ text: await t('You can now use this sticker in your server!', langCode) });

                await interaction.reply({ embeds: [embed] });
                convertedImagesToStickers.set(imageTrackingKey, {
                    stickerId: sticker.id,
                    stickerName: stickerName,
                    imageUrl: imageUrl
                });
            } catch (error) {
                const errorMsg = error.code === 50045 ?
                    await t('Image URL is invalid or unavailable', langCode) :
                    error.code === 50138 ?
                    await t('File must be under 512KB', langCode) :
                    error.code === 50035 ?
                    await t('Invalid request format', langCode) :
                    await t('Error:', langCode) + ' ' + error.message;
                const embed = new EmbedBuilder()
                    .setDescription(`❌ ${errorMsg}`)
                    .setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                console.error(`⚠️ Discord Error in image_to_sticker:`, error.code, error.message);
            }
        }

        if (interaction.commandName === 'list_emojis') {
            const emojis = Array.from(interaction.guild.emojis.cache.values());
            if (emojis.length === 0) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('No emojis.', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            let pages = [];
            let chunk = 50;
            for (let i = 0; i < emojis.length; i += chunk) {
                pages.push(emojis.slice(i, i + chunk).map(e => e.toString()).join(' '));
            }

            let page = 0;
            const pageText = await t('Page', langCode);
            const emojisTitle = await t('Emojis', langCode);
            const embed = new EmbedBuilder()
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                .setTitle(`📋 ${emojisTitle}`)
                .setColor('#00FFFF')
                .setDescription(pages[page])
                .setFooter({ text: `${pageText} ${page + 1}/${pages.length}`, iconURL: interaction.user.displayAvatarURL() });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(pages.length <= 1)
            );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

            const storedLangCode = langCode;
            const filter = i => (i.customId === 'next' || i.customId === 'prev') && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

            collector.on('collect', async i => {
                if (i.customId === 'next') { page++; if (page >= pages.length) page = 0; }
                else { page--; if (page < 0) page = pages.length - 1; }

                const pageTextUpdate = await t('Page', storedLangCode);
                const emojisTitleUpdate = await t('Emojis', storedLangCode);
                const e = new EmbedBuilder()
                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .setTitle(`📋 ${emojisTitleUpdate}`)
                    .setColor('#00FFFF')
                    .setDescription(pages[page])
                    .setFooter({ text: `${pageTextUpdate} ${page + 1}/${pages.length}`, iconURL: interaction.user.displayAvatarURL() });

                const prevButton = new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0);
                const nextButton = new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page === pages.length - 1);
                const newRow = new ActionRowBuilder().addComponents(prevButton, nextButton);

                await i.update({ embeds: [e], components: [newRow] });
            });
        }

        if (interaction.commandName === 'language') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                const embed = new EmbedBuilder().setDescription(await t('Need ADMINISTRATOR permission!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const currentLang = SUPPORTED_LANGUAGES[langCode] || SUPPORTED_LANGUAGES['en'];
            const embed = new EmbedBuilder()
                .setTitle('🌐 ' + await t('Choose Language', langCode))
                .setColor('#00FFFF')
                .setDescription(await t('Select your preferred language from the dropdown menu below:', langCode) + `\n\n**${await t('Current', langCode)}:** ${currentLang.flag} ${currentLang.native}`);

            const options = Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
                label: `${info.name} - ${info.native}`,
                description: info.name,
                value: code,
                emoji: info.flag.startsWith('<') ? { id: '1443915175379079208', name: 'Syria' } : info.flag,
                default: code === langCode
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('language_select')
                .setPlaceholder(await t('Choose a language...', langCode))
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
            
            const filter = i => i.customId === 'language_select' && i.user.id === interaction.user.id;
            const collector = msg.createMessageComponentCollector({ filter, time: 60000 });
            
            collector.on('end', async collected => {
                if (collected.size === 0) {
                    const disabledSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId('language_select')
                        .setPlaceholder(await t('Choose a language...', langCode))
                        .setDisabled(true)
                        .addOptions(options);
                    const disabledRow = new ActionRowBuilder().addComponents(disabledSelectMenu);
                    msg.edit({ components: [disabledRow] }).catch(() => {});
                }
            });
        }

        if (interaction.commandName === 'delete_emoji') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const emojiInput = interaction.options.getString('emoji');
            const match = emojiInput.match(/<(a)?:\w+:(\d+)>/);

            if (!match) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Invalid emoji!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const emojiId = match[2];
            const emj = interaction.guild.emojis.cache.get(emojiId);

            if (!emj) {
                const embed = new EmbedBuilder().setDescription('❌ ' + emojiInput + ' ' + await t('not found!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            try {
                await emj.delete();
                convertedStickersToEmojis.forEach((value, key) => {
                    if (value.emojiId === emojiId) {
                        convertedStickersToEmojis.delete(key);
                    }
                });
                const embed = new EmbedBuilder().setDescription('✅ ' + await t('Emoji deleted!', langCode)).setColor('#00FF00');
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                const errorMsg = error.code === 50013 ?
                    await t('Missing permissions to delete emoji', langCode) :
                    await t('Error:', langCode) + ' ' + error.message;
                const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                console.error(`⚠️ Discord Error in delete_emoji:`, error.code, error.message);
            }
        }

        if (interaction.commandName === 'rename_emoji') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const emojiInput = interaction.options.getString('emoji');
            const newName = interaction.options.getString('name');
            const match = emojiInput.match(/<(a)?:\w+:(\d+)>/);

            if (!match) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Invalid emoji!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const emojiId = match[2];
            const emj = interaction.guild.emojis.cache.get(emojiId);

            if (!emj) {
                const embed = new EmbedBuilder().setDescription('❌ ' + emojiInput + ' ' + await t('not found!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            try {
                await emj.edit({ name: newName });
                const embed = new EmbedBuilder().setDescription('✅ ' + await t('Renamed to', langCode) + ' ' + newName + '! ' + emj).setColor('#00FF00');
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                const errorMsg = error.code === 50013 ?
                    await t('Missing permissions to rename emoji', langCode) :
                    error.code === 50035 ?
                    await t('Invalid emoji name', langCode) :
                    await t('Error:', langCode) + ' ' + error.message;
                const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                console.error(`⚠️ Discord Error in rename_emoji:`, error.code, error.message);
            }
        }

        if (interaction.commandName === 'delete_sticker') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📌 ' + await t('Send or Reply with Sticker', langCode))
                .setDescription(await t('Reply to this message using the sticker you want to delete, and I will delete it for you.', langCode))
                .setColor('#FF9900')
                .setFooter({ text: await t('Waiting for your sticker...', langCode) });

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            
            stickerDeletionSessions.set(msg.id, {
                guildId: interaction.guild.id,
                userId: interaction.user.id,
                langCode: langCode,
                messageId: msg.id,
                channelId: msg.channel.id
            });

            setTimeout(() => {
                if (stickerDeletionSessions.has(msg.id)) {
                    stickerDeletionSessions.delete(msg.id);
                }
            }, 60000);
        }

        if (interaction.commandName === 'sticker_to_emoji') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const emojiName = interaction.options.getString('name');

            const embed = new EmbedBuilder()
                .setTitle('📌 ' + await t('Reply with Sticker', langCode))
                .setDescription(await t('Reply to this message using the sticker you want to convert to an emoji.', langCode) + `\n\n**${await t('Emoji Name:', langCode)}** ${emojiName}`)
                .setColor('#00FFFF')
                .setFooter({ text: await t('Waiting for your sticker...', langCode) });

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            
            stickerToEmojiSessions.set(msg.id, {
                guildId: interaction.guild.id,
                userId: interaction.user.id,
                langCode: langCode,
                messageId: msg.id,
                channelId: msg.channel.id,
                emojiName: emojiName
            });

            setTimeout(() => {
                if (stickerToEmojiSessions.has(msg.id)) {
                    stickerToEmojiSessions.delete(msg.id);
                }
            }, 60000);
        }
    } catch (error) {
        console.error('⚠️ Discord Error in interaction handler:', error.code, error.message);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const langCode = serverLanguages.get(message.guild.id) || 'en';

    if (message.reference && message.stickers && message.stickers.size > 0) {
        try {
            const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
            const deletionSession = stickerDeletionSessions.get(repliedTo.id);
            const conversionSession = stickerToEmojiSessions.get(repliedTo.id);
            
            if (deletionSession && deletionSession.userId === message.author.id && deletionSession.guildId === message.guild.id) {
                const sessionLang = deletionSession.langCode || 'en';
                const sticker = message.stickers.first();
                const serverStickers = message.guild.stickers.cache;
                const stickerToDelete = serverStickers.find(s => s.id === sticker.id);

                if (stickerToDelete) {
                    try {
                        await stickerToDelete.delete();
                        convertedEmojisToStickers.forEach((value, key) => {
                            if (value.stickerId === stickerToDelete.id) {
                                convertedEmojisToStickers.delete(key);
                            }
                        });
                        convertedImagesToStickers.forEach((value, key) => {
                            if (value.stickerId === stickerToDelete.id) {
                                convertedImagesToStickers.delete(key);
                            }
                        });
                        convertedStickersToEmojis.forEach((value, key) => {
                            if (value.stickerId === stickerToDelete.id) {
                                convertedStickersToEmojis.delete(key);
                            }
                        });
                        const embed = new EmbedBuilder()
                            .setTitle('✅ ' + await t('Sticker Deleted!', sessionLang))
                            .setDescription(await t('Successfully deleted sticker:', sessionLang) + ` **${stickerToDelete.name}**\n\n${await t('You can now convert the source emoji/image again.', sessionLang)}`)
                            .setColor('#00FF00')
                            .setFooter({ text: await t('Sticker removed from server.', sessionLang) });
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
        } catch (error) {
            console.error('Sticker processing error:', error);
        }
    }

    if (message.content.startsWith(prefix + 'help')) {
        const checkDM = await t('Check your DM', langCode);
        message.channel.send(`**${checkDM}**`).then(m => setTimeout(() => m.delete(), 5000));

        const helpContent = `**${await t('Welcome, this is my help menu', langCode)}**
⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('The prefix of the bot is', langCode)} **[ + ]**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('If you do not have Nitro you can write this command', langCode)} **+suggestemojis** ${await t('so that the bot will suggest emojis to you from different servers', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can use this slash command', langCode)} **/image_to_emoji** ${await t('to convert an image URL into an emoji and save it on your server', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can add an emoji using this command', langCode)} **+addemoji** ${await t('and you will be able to add an emoji with its original name', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can add an emoji and change its name using this Slash Command', langCode)} **/addemoji**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('If you want to rename an emoji you can use this slash command', langCode)} **/rename_emoji** ${await t('and the emoji name will be changed', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can convert an emoji to a sticker using this slash command', langCode)} **/emoji_to_sticker** ${await t('and the emoji will be turned into a beautiful sticker!', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can convert an image to a sticker using this slash command', langCode)} **/image_to_sticker** ${await t('and the image will be turned into a beautiful sticker!', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can delete a sticker using this slash command', langCode)} **/delete_sticker** ${await t('and then reply with the sticker you want to delete!', langCode)}

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('You can convert a sticker to an emoji using this slash command', langCode)} **/sticker_to_emoji** ${await t('and then reply with the sticker you want to convert!', langCode)}`;

        const embed = new EmbedBuilder()
            .setTitle('📖 ' + await t('ProEmoji Help', langCode))
            .setDescription(helpContent)
            .setColor('#0099ff');

        await message.author.send({ embeds: [embed] }).catch(async () => message.reply('❌ ' + await t('Could not send DM!', langCode)));
    }

    if (message.content === 'نعم' || message.content.toLowerCase() === 'yes') {
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
            suggestedEmojis = [];
        }
    } else if (message.content === 'لا' || message.content.toLowerCase() === 'no') {
        if (suggestedEmojis.length > 0) {
            message.channel.send('❌ ' + await t('The suggested emojis were not added.', langCode));
            suggestedEmojis = [];
        }
    }
});

app.get('/', (req, res) => {
    res.send('✅ ProEmoji Bot is Running!');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

client.login(process.env.token).catch(err => {
    console.error('❌ Failed to login:', err.message);
    console.error('تأكد من إضافة token في Replit Secrets!');
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('⚠️ Uncaught Exception:', error.message);
});
