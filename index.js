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
    PermissionsBitField 
} = require('discord.js');
const isImageUrl = require('is-image-url');

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
            }
        ];

        await client.application.commands.set(commands);
        console.log('✅ Slash commands registered!');
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    } catch (error) {
        console.error('❌ Error:', error);
    }
});

client.on('guildCreate', guild => {
    allowedServers.set(guild.id, true);
    serverLanguages.set(guild.id, 'english');
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
    if (!interaction.isCommand()) return;
    const language = serverLanguages.get(interaction.guild.id) || 'english';

    try {
        if (interaction.commandName === 'permission') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                const embed = new EmbedBuilder()
                    .setDescription(language === 'english' ? '❌ Need ADMINISTRATOR permission!' : '❌ تحتاج صلاحية المسؤول!')
                    .setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('allow').setLabel(language === 'english' ? '✅ Allow' : '✅ السماح').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('refuse').setLabel(language === 'english' ? '❌ Refuse' : '❌ رفض').setStyle(ButtonStyle.Danger)
            );

            const embed = new EmbedBuilder()
                .setTitle(language === 'english' ? '🔐 Permission Settings' : '🔐 إعدادات الإذن')
                .setDescription(language === 'english' ? 'Allow bot to suggest emojis from this server?' : 'السماح للبوت باقتراح الإيموجيات من هذا السيرفر؟')
                .setColor('#00FFFF');

            await interaction.reply({ embeds: [embed], components: [buttonRow] });

            const filter = i => (i.customId === 'allow' || i.customId === 'refuse') && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                await i.deferUpdate();
                if (i.customId === 'allow') {
                    allowedServers.set(interaction.guild.id, true);
                    const e = new EmbedBuilder().setTitle('✅ Permission Granted').setDescription(language === 'english' ? 'Bot can suggest emojis from this server.' : 'يمكن للبوت اقتراح الإيموجيات من هذا السيرفر.').setColor('#00FF00');
                    await i.editReply({ embeds: [e], components: [] });
                } else {
                    allowedServers.set(interaction.guild.id, false);
                    const e = new EmbedBuilder().setTitle('❌ Permission Denied').setDescription(language === 'english' ? 'Bot will NOT suggest emojis.' : 'لن يقترح البوت الإيموجيات.').setColor('#FF0000');
                    await i.editReply({ embeds: [e], components: [] });
                }
                collector.stop();
            });
        }

        if (interaction.commandName === 'suggestemojis') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Need Manage Emojis permission!' : '❌ تحتاج صلاحية إدارة الإيموجيات!').setColor('#FF0000');
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
                const embed = new EmbedBuilder().setTitle(language === 'english' ? '❌ No Emojis Available' : '❌ لا توجد ايموجيات').setDescription(language === 'english' ? 'No emojis available.' : 'لا توجد ايموجيات متاحة.').setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            emojis = emojis.sort(() => Math.random() - 0.5).slice(0, 5);
            const embed = new EmbedBuilder()
                .setTitle(language === 'english' ? '💡 Suggested Emojis' : '💡 الإيموجيات المقترحة')
                .setDescription((language === 'english' ? 'Here are 5 suggestions:\n' : 'هذه 5 اقتراحات:\n') + emojis.map(e => e.toString()).join(' '))
                .setColor('#00FFFF')
                .setFooter({ text: language === 'english' ? 'React ✅ to add or ❌ to cancel.' : 'تفاعل بـ ✅ للإضافة أو ❌ للإلغاء.' });

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            try {
                await msg.react('✅');
                await msg.react('❌');
            } catch (error) {
                console.error('⚠️ Warning: Could not add reactions:', error.message);
            }

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
                        await interaction.followUp(language === 'english' ? '✅ Emojis added!' : '✅ تمت الإضافة!');
                    } else {
                        await interaction.followUp(language === 'english' ? '❌ Cancelled.' : '❌ تم الإلغاء.');
                    }
                })
                .catch(() => interaction.followUp(language === 'english' ? '⏳ Timeout.' : '⏳ انتهى الوقت.'));
        }

        if (interaction.commandName === 'addemoji') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Need permission!' : '❌ تحتاج صلاحية!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const emoji = interaction.options.getString('emoji');
            const name = interaction.options.getString('name');
            let info = parseEmoji(emoji);

            if (!info.id) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Invalid emoji!' : '❌ ايموجي غير صالح!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            if (interaction.guild.emojis.cache.find(e => e.name === info.name)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? `⚠️ ${emoji} already exists!` : `⚠️ ${emoji} موجود بالفعل!`).setColor('#FF9900');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            try {
                let type = info.animated ? '.gif' : '.png';
                let url = `https://cdn.discordapp.com/emojis/${info.id + type}`;
                const emj = await interaction.guild.emojis.create({ attachment: url, name: name || info.name, reason: `By ${interaction.user.tag}` });
                const embed = new EmbedBuilder().setDescription(language === 'english' ? `✅ Added! ${emj}` : `✅ تمت الإضافة! ${emj}`).setColor('#00FF00');
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                const embed = new EmbedBuilder().setDescription(`❌ Error: ${error.message}`).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
            }
        }

        if (interaction.commandName === 'image_to_emoji') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Need permission!' : '❌ تحتاج صلاحية!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const nameOption = interaction.options.getString('name');
            const urlOption = interaction.options.getString('url');

            if (!isImageUrl(urlOption)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Invalid image URL!' : '❌ رابط صورة غير صالح!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            if (usedUrls[urlOption] && usedUrls[urlOption].includes(interaction.guild.id)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '⚠️ Image already used!' : '⚠️ الصورة مستخدمة بالفعل!').setColor('#FF9900');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            try {
                await interaction.guild.emojis.create({ attachment: urlOption, name: nameOption });
                usedUrls[urlOption] = usedUrls[urlOption] || [];
                usedUrls[urlOption].push(interaction.guild.id);
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '✅ Image converted to emoji!' : '✅ تم تحويل الصورة إلى إيموجي!').setColor('#00FF00');
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                const errorMsg = error.code === 50138 ? 
                    (language === 'english' ? 'Image must be under 256KB' : 'يجب أن تكون الصورة أقل من 256 كيلوبايت') :
                    error.code === 50035 ?
                    (language === 'english' ? 'Invalid request: ' : 'طلب غير صالح: ') + error.message :
                    (language === 'english' ? 'Error: ' : 'خطأ: ') + error.message;
                const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                console.error(`⚠️ Discord Error in image_to_emoji:`, error.code, error.message);
            }
        }

        if (interaction.commandName === 'emoji_to_sticker') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Need permission!' : '❌ تحتاج صلاحية!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const emojiInput = interaction.options.getString('emoji');
            const stickerName = interaction.options.getString('name');
            const match = emojiInput.match(/<(a)?:(\w+):(\d+)>/);

            if (!match) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Invalid emoji!' : '❌ ايموجي غير صالح!').setColor('#FF0000');
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
                    .setTitle(language === 'english' ? '⚠️ Emoji Already Converted!' : '⚠️ تم تحويل هذا الإيموجي مسبقاً!')
                    .setDescription(language === 'english' 
                        ? `This emoji has already been converted to a sticker!\n\n**Existing Sticker Name:** ${stickerInfo.stickerName}\n**Sticker ID:** ${stickerInfo.stickerId}\n\nDelete the sticker to convert again.`
                        : `تم تحويل هذا الإيموجي إلى ملصق مسبقاً!\n\n**اسم الملصق الموجود:** ${stickerInfo.stickerName}\n**معرف الملصق:** ${stickerInfo.stickerId}\n\nاحذف الملصق لتحويله مجدداً.`)
                    .setThumbnail(stickerUrl)
                    .setColor('#FF9900')
                    .setFooter({ text: language === 'english' ? 'This conversion is already done.' : 'تم إجراء هذا التحويل بالفعل.' });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const existingStickers = interaction.guild.stickers.cache;
            const duplicateByName = existingStickers.find(s => s.name.toLowerCase() === stickerName.toLowerCase());

            if (duplicateByName) {
                const stickerUrl = `https://cdn.discordapp.com/stickers/${duplicateByName.id}.png`;
                const embed = new EmbedBuilder()
                    .setTitle(language === 'english' ? '⚠️ Sticker Name Already Exists!' : '⚠️ اسم الملصق موجود بالفعل!')
                    .setDescription(language === 'english' 
                        ? `A sticker with this name already exists!\n\n**Existing Sticker Name:** ${duplicateByName.name}\n**Sticker ID:** ${duplicateByName.id}`
                        : `يوجد ملصق بهذا الاسم بالفعل!\n\n**اسم الملصق الموجود:** ${duplicateByName.name}\n**معرف الملصق:** ${duplicateByName.id}`)
                    .setThumbnail(stickerUrl)
                    .setColor('#FF9900')
                    .setFooter({ text: language === 'english' ? 'Please choose a different name.' : 'الرجاء اختيار اسم مختلف.' });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            try {
                const sticker = await interaction.guild.stickers.create({
                    file: emojiUrl,
                    name: stickerName,
                    description: language === 'english' ? `Converted from emoji ID: ${emojiIdNum}` : `تم التحويل من إيموجي رقم: ${emojiIdNum}`,
                    reason: `By ${interaction.user.tag}`
                });

                const embed = new EmbedBuilder()
                    .setTitle(language === 'english' ? '✅ Sticker Created!' : '✅ تم إنشاء الملصق!')
                    .setDescription(language === 'english' 
                        ? `Successfully converted emoji to sticker!\n\n**Sticker Name:** ${stickerName}\n**Sticker ID:** ${sticker.id}`
                        : `تم التحويل بنجاح من إيموجي إلى ملصق!\n\n**اسم الملصق:** ${stickerName}\n**معرف الملصق:** ${sticker.id}`)
                    .setImage(emojiUrl)
                    .setColor('#00FF00')
                    .setFooter({ text: language === 'english' ? 'You can now use this sticker in your server!' : 'يمكنك الآن استخدام هذا الملصق في خادمك!' });

                await interaction.reply({ embeds: [embed] });
                convertedEmojisToStickers.set(trackingKey, {
                    stickerId: sticker.id,
                    stickerName: stickerName,
                    emojiId: emojiIdNum
                });
            } catch (error) {
                const errorMsg = error.code === 50045 ?
                    (language === 'english' ? 'Emoji URL is invalid or unavailable' : 'رابط الإيموجي غير صالح أو غير متاح') :
                    error.code === 50138 ?
                    (language === 'english' ? 'File must be under 512KB' : 'يجب أن يكون الملف أقل من 512 كيلوبايت') :
                    (language === 'english' ? 'Error: ' : 'خطأ: ') + error.message;
                const embed = new EmbedBuilder()
                    .setDescription(`❌ ${errorMsg}`)
                    .setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                console.error(`⚠️ Discord Error in emoji_to_sticker:`, error.code, error.message);
            }
        }

        if (interaction.commandName === 'image_to_sticker') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Need permission!' : '❌ تحتاج صلاحية!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const imageUrl = interaction.options.getString('url');
            const stickerName = interaction.options.getString('name');

            if (!isImageUrl(imageUrl)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Invalid image URL!' : '❌ رابط صورة غير صالح!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const imageTrackingKey = `${interaction.guild.id}:${imageUrl}`;
            if (convertedImagesToStickers.has(imageTrackingKey)) {
                const stickerInfo = convertedImagesToStickers.get(imageTrackingKey);
                const stickerUrl = `https://cdn.discordapp.com/stickers/${stickerInfo.stickerId}.png`;
                const embed = new EmbedBuilder()
                    .setTitle(language === 'english' ? '⚠️ Image Already Converted!' : '⚠️ تم تحويل هذه الصورة مسبقاً!')
                    .setDescription(language === 'english' 
                        ? `This image has already been converted to a sticker!\n\n**Existing Sticker Name:** ${stickerInfo.stickerName}\n**Sticker ID:** ${stickerInfo.stickerId}\n\nDelete the sticker to convert again.`
                        : `تم تحويل هذه الصورة إلى ملصق مسبقاً!\n\n**اسم الملصق الموجود:** ${stickerInfo.stickerName}\n**معرف الملصق:** ${stickerInfo.stickerId}\n\nاحذف الملصق لتحويله مجدداً.`)
                    .setThumbnail(stickerUrl)
                    .setColor('#FF9900')
                    .setFooter({ text: language === 'english' ? 'This conversion is already done.' : 'تم إجراء هذا التحويل بالفعل.' });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const existingStickers = interaction.guild.stickers.cache;
            const duplicateByName = existingStickers.find(s => s.name.toLowerCase() === stickerName.toLowerCase());

            if (duplicateByName) {
                const stickerUrl = `https://cdn.discordapp.com/stickers/${duplicateByName.id}.png`;
                const embed = new EmbedBuilder()
                    .setTitle(language === 'english' ? '⚠️ Sticker Name Already Exists!' : '⚠️ اسم الملصق موجود بالفعل!')
                    .setDescription(language === 'english' 
                        ? `A sticker with this name already exists!\n\n**Existing Sticker Name:** ${duplicateByName.name}\n**Sticker ID:** ${duplicateByName.id}`
                        : `يوجد ملصق بهذا الاسم بالفعل!\n\n**اسم الملصق الموجود:** ${duplicateByName.name}\n**معرف الملصق:** ${duplicateByName.id}`)
                    .setThumbnail(stickerUrl)
                    .setColor('#FF9900')
                    .setFooter({ text: language === 'english' ? 'Please choose a different name.' : 'الرجاء اختيار اسم مختلف.' });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            try {
                const sticker = await interaction.guild.stickers.create({
                    file: imageUrl,
                    name: stickerName,
                    description: language === 'english' ? 'Converted from image' : 'تم التحويل من صورة',
                    reason: `By ${interaction.user.tag}`
                });

                const embed = new EmbedBuilder()
                    .setTitle(language === 'english' ? '✅ Sticker Created!' : '✅ تم إنشاء الملصق!')
                    .setDescription(language === 'english' 
                        ? `Successfully converted image to sticker!\n\n**Sticker Name:** ${stickerName}\n**Sticker ID:** ${sticker.id}`
                        : `تم التحويل بنجاح من صورة إلى ملصق!\n\n**اسم الملصق:** ${stickerName}\n**معرف الملصق:** ${sticker.id}`)
                    .setImage(imageUrl)
                    .setColor('#00FF00')
                    .setFooter({ text: language === 'english' ? 'You can now use this sticker in your server!' : 'يمكنك الآن استخدام هذا الملصق في خادمك!' });

                await interaction.reply({ embeds: [embed] });
                convertedImagesToStickers.set(imageTrackingKey, {
                    stickerId: sticker.id,
                    stickerName: stickerName,
                    imageUrl: imageUrl
                });
            } catch (error) {
                const errorMsg = error.code === 50045 ?
                    (language === 'english' ? 'Image URL is invalid or unavailable' : 'رابط الصورة غير صالح أو غير متاح') :
                    error.code === 50138 ?
                    (language === 'english' ? 'File must be under 512KB' : 'يجب أن يكون الملف أقل من 512 كيلوبايت') :
                    error.code === 50035 ?
                    (language === 'english' ? 'Invalid request format' : 'صيغة الطلب غير صحيحة') :
                    (language === 'english' ? 'Error: ' : 'خطأ: ') + error.message;
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
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ No emojis.' : '❌ لا توجد ايموجيات.').setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            let pages = [];
            let chunk = 50;
            for (let i = 0; i < emojis.length; i += chunk) {
                pages.push(emojis.slice(i, i + chunk).map(e => e.toString()).join(' '));
            }

            let page = 0;
            const embed = new EmbedBuilder()
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                .setTitle(`📋 ${language === 'english' ? 'Emojis' : 'الإيموجيات'}`)
                .setColor('#00FFFF')
                .setDescription(pages[page])
                .setFooter({ text: `${language === 'english' ? 'Page' : 'صفحة'} ${page + 1}/${pages.length}`, iconURL: interaction.user.displayAvatarURL() });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(pages.length <= 1)
            );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

            const filter = i => (i.customId === 'next' || i.customId === 'prev') && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

            collector.on('collect', async i => {
                if (i.customId === 'next') { page++; if (page >= pages.length) page = 0; }
                else { page--; if (page < 0) page = pages.length - 1; }

                const e = new EmbedBuilder()
                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .setTitle(`📋 ${language === 'english' ? 'Emojis' : 'الإيموجيات'}`)
                    .setColor('#00FFFF')
                    .setDescription(pages[page])
                    .setFooter({ text: `${language === 'english' ? 'Page' : 'صفحة'} ${page + 1}/${pages.length}`, iconURL: interaction.user.displayAvatarURL() });

                const prevButton = new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0);
                const nextButton = new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page === pages.length - 1);
                const newRow = new ActionRowBuilder().addComponents(prevButton, nextButton);

                await i.update({ embeds: [e], components: [newRow] });
            });
        }

        if (interaction.commandName === 'language') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Need ADMINISTRATOR!' : '❌ تحتاج صلاحية المسؤول!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🌐 Choose Language - اختر اللغة')
                .setColor('#00FFFF')
                .setDescription('Choose your language:\nاختر لغتك:')
                .addFields(
                    { name: '🇺🇸 English', value: 'React with 🇺🇸', inline: true },
                    { name: '<:Syria:1443915175379079208> العربية', value: 'تفاعل بـ <:Syria:1443915175379079208>', inline: true }
                );

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

            try {
                await msg.react('🇺🇸');
                await msg.react('<:Syria:1443915175379079208>');
            } catch (error) {
                console.error('⚠️ Warning: Could not add language reactions:', error.message);
            }

            const filter = (reaction, user) =>
                (reaction.emoji.name === '🇺🇸' ||
                 reaction.emoji.id === '1443915175379079208') &&
                user.id === interaction.user.id;

            msg.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                .then(collected => {
                    const reaction = collected.first();

                    if (reaction.emoji.name === '🇺🇸') {
                        serverLanguages.set(interaction.guild.id, 'english');
                        interaction.followUp('✅ Language set to English!');
                    } else {
                        serverLanguages.set(interaction.guild.id, 'arabic');
                        interaction.followUp('✅ تم تعيين اللغة إلى العربية!');
                    }
                })
                .catch(() => interaction.followUp('⏳ Timeout.'));
        }

        if (interaction.commandName === 'delete_emoji') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Need permission!' : '❌ تحتاج صلاحية!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const emojiInput = interaction.options.getString('emoji');
            const match = emojiInput.match(/<(a)?:\w+:(\d+)>/);

            if (!match) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Invalid emoji!' : '❌ ايموجي غير صالح!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const emojiId = match[2];
            const emj = interaction.guild.emojis.cache.get(emojiId);

            if (!emj) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? `❌ ${emojiInput} not found!` : `❌ ${emojiInput} غير موجود!`).setColor('#FF0000');
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
                const embed = new EmbedBuilder().setDescription(language === 'english' ? `✅ Emoji deleted!` : `✅ تم حذف الايموجي!`).setColor('#00FF00');
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                const errorMsg = error.code === 50013 ?
                    (language === 'english' ? 'Missing permissions to delete emoji' : 'لا توجد صلاحيات لحذف الإيموجي') :
                    (language === 'english' ? 'Error: ' : 'خطأ: ') + error.message;
                const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                console.error(`⚠️ Discord Error in delete_emoji:`, error.code, error.message);
            }
        }

        if (interaction.commandName === 'rename_emoji') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Need permission!' : '❌ تحتاج صلاحية!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const emojiInput = interaction.options.getString('emoji');
            const newName = interaction.options.getString('name');
            const match = emojiInput.match(/<(a)?:\w+:(\d+)>/);

            if (!match) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Invalid emoji!' : '❌ ايموجي غير صالح!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const emojiId = match[2];
            const emj = interaction.guild.emojis.cache.get(emojiId);

            if (!emj) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? `❌ ${emojiInput} not found!` : `❌ ${emojiInput} غير موجود!`).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                return;
            }

            try {
                await emj.edit({ name: newName });
                const embed = new EmbedBuilder().setDescription(language === 'english' ? `✅ Renamed to ${newName}! ${emj}` : `✅ تم التغيير إلى ${newName}! ${emj}`).setColor('#00FF00');
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                const errorMsg = error.code === 50013 ?
                    (language === 'english' ? 'Missing permissions to rename emoji' : 'لا توجد صلاحيات لإعادة تسمية الإيموجي') :
                    error.code === 50035 ?
                    (language === 'english' ? 'Invalid emoji name' : 'اسم الإيموجي غير صالح') :
                    (language === 'english' ? 'Error: ' : 'خطأ: ') + error.message;
                const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
                console.error(`⚠️ Discord Error in rename_emoji:`, error.code, error.message);
            }
        }

        if (interaction.commandName === 'delete_sticker') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Need permission!' : '❌ تحتاج صلاحية!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(language === 'english' ? '📌 Send or Reply with Sticker' : '📌 أرسل أو رد باستخدام ملصق')
                .setDescription(language === 'english' 
                    ? 'Reply to this message using the sticker you want to delete, and I will delete it for you.'
                    : 'رد على هذه الرسالة باستخدام الملصق الذي تريد حذفه، وسأحذفه لك.')
                .setColor('#FF9900')
                .setFooter({ text: language === 'english' ? 'Waiting for your sticker...' : 'في انتظار ملصقك...' });

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            
            stickerDeletionSessions.set(msg.id, {
                guildId: interaction.guild.id,
                userId: interaction.user.id,
                language: language,
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
                const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Need permission!' : '❌ تحتاج صلاحية!').setColor('#FF0000');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const emojiName = interaction.options.getString('name');

            const embed = new EmbedBuilder()
                .setTitle(language === 'english' ? '📌 Reply with Sticker' : '📌 رد باستخدام ملصق')
                .setDescription(language === 'english' 
                    ? `Reply to this message using the sticker you want to convert to an emoji.\n\n**Emoji Name:** ${emojiName}`
                    : `رد على هذه الرسالة باستخدام الملصق الذي تريد تحويله إلى إيموجي.\n\n**اسم الإيموجي:** ${emojiName}`)
                .setColor('#00FFFF')
                .setFooter({ text: language === 'english' ? 'Waiting for your sticker...' : 'في انتظار ملصقك...' });

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            
            stickerToEmojiSessions.set(msg.id, {
                guildId: interaction.guild.id,
                userId: interaction.user.id,
                language: language,
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
    const language = serverLanguages.get(message.guild.id) || 'english';

    // Handle sticker deletion and conversion replies
    if (message.reference && message.stickers && message.stickers.size > 0) {
        try {
            const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
            const deletionSession = stickerDeletionSessions.get(repliedTo.id);
            const conversionSession = stickerToEmojiSessions.get(repliedTo.id);
            
            // Handle sticker deletion
            if (deletionSession && deletionSession.userId === message.author.id && deletionSession.guildId === message.guild.id) {
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
                            .setTitle(language === 'english' ? '✅ Sticker Deleted!' : '✅ تم حذف الملصق!')
                            .setDescription(language === 'english' 
                                ? `Successfully deleted sticker: **${stickerToDelete.name}**\n\nYou can now convert the source emoji/image again.`
                                : `تم حذف الملصق بنجاح: **${stickerToDelete.name}**\n\nيمكنك الآن تحويل الإيموجي/الصورة مجدداً.`)
                            .setColor('#00FF00')
                            .setFooter({ text: language === 'english' ? 'Sticker removed from server.' : 'تم إزالة الملصق من الخادم.' });
                        await message.reply({ embeds: [embed] });
                        stickerDeletionSessions.delete(repliedTo.id);
                    } catch (error) {
                        const errorMsg = error.code === 50013 ?
                            (language === 'english' ? 'Missing permissions to delete sticker' : 'لا توجد صلاحيات لحذف الملصق') :
                            (language === 'english' ? 'Error: ' : 'خطأ: ') + error.message;
                        const embed = new EmbedBuilder()
                            .setDescription(`❌ ${errorMsg}`)
                            .setColor('#FF0000');
                        await message.reply({ embeds: [embed] });
                        console.error(`⚠️ Discord Error in sticker deletion:`, error.code, error.message);
                    }
                } else {
                    const embed = new EmbedBuilder()
                        .setDescription(language === 'english' 
                            ? '❌ Sticker not found in this server!'
                            : '❌ الملصق غير موجود في هذا الخادم!')
                        .setColor('#FF0000');
                    await message.reply({ embeds: [embed] });
                }
            }
            
            // Handle sticker to emoji conversion
            if (conversionSession && conversionSession.userId === message.author.id && conversionSession.guildId === message.guild.id) {
                const sticker = message.stickers.first();
                const emojiName = conversionSession.emojiName;
                const stickerUrl = sticker.url;
                const stickerTrackingKey = `${message.guild.id}:${sticker.id}`;

                if (convertedStickersToEmojis.has(stickerTrackingKey)) {
                    const emojiInfo = convertedStickersToEmojis.get(stickerTrackingKey);
                    const embed = new EmbedBuilder()
                        .setTitle(language === 'english' ? '⚠️ Sticker Already Converted!' : '⚠️ تم تحويل هذا الملصق مسبقاً!')
                        .setDescription(language === 'english' 
                            ? `This sticker has already been converted to an emoji!\n\n**Existing Emoji Name:** ${emojiInfo.emojiName}\n\nDelete the emoji to convert again.`
                            : `تم تحويل هذا الملصق إلى إيموجي مسبقاً!\n\n**اسم الإيموجي الموجود:** ${emojiInfo.emojiName}\n\nاحذف الإيموجي لتحويله مجدداً.`)
                        .setColor('#FF9900')
                        .setFooter({ text: language === 'english' ? 'This conversion is already done.' : 'تم إجراء هذا التحويل بالفعل.' });
                    await message.reply({ embeds: [embed] });
                    stickerToEmojiSessions.delete(repliedTo.id);
                    return;
                }

                try {
                    const emoji = await message.guild.emojis.create({ attachment: stickerUrl, name: emojiName });
                    const embed = new EmbedBuilder()
                        .setTitle(language === 'english' ? '✅ Emoji Created!' : '✅ تم إنشاء الإيموجي!')
                        .setDescription(language === 'english' 
                            ? `Successfully converted sticker to emoji!\n\n**Emoji Name:** ${emojiName}\n**Source Sticker:** ${sticker.name}`
                            : `تم التحويل بنجاح من ملصق إلى إيموجي!\n\n**اسم الإيموجي:** ${emojiName}\n**الملصق الأصلي:** ${sticker.name}`)
                        .setImage(stickerUrl)
                        .setColor('#00FF00')
                        .setFooter({ text: language === 'english' ? 'You can now use this emoji in your server!' : 'يمكنك الآن استخدام هذا الإيموجي في خادمك!' });
                    await message.reply({ embeds: [embed] });
                    stickerToEmojiSessions.delete(repliedTo.id);
                    convertedStickersToEmojis.set(stickerTrackingKey, {
                        emojiId: emoji.id,
                        emojiName: emojiName,
                        stickerId: sticker.id
                    });
                } catch (error) {
                    const errorMsg = error.code === 50138 ?
                        (language === 'english' ? 'Sticker must be under 256KB' : 'يجب أن يكون الملصق أقل من 256 كيلوبايت') :
                        error.code === 50013 ?
                        (language === 'english' ? 'Missing permissions to create emoji' : 'لا توجد صلاحيات لإنشاء إيموجي') :
                        (language === 'english' ? 'Error: ' : 'خطأ: ') + error.message;
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
        message.channel.send(language === 'english' ? '**Check your DM**' : '**شوف خاصك**').then(m => setTimeout(() => m.delete(), 5000));

        const embed = new EmbedBuilder()
            .setTitle(language === 'english' ? '📖 ProEmoji Help' : '📖 مساعدة ProEmoji')
            .setDescription(
                language === 'english'
                    ? `**Welcome, this is my help menu**
⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

The prefix of the bot is **[ + ]**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

If you do not have Nitro you can write this command **+suggestemojis** so that the bot will suggest emojis to you from different servers

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can use this slash command **/image_to_emoji** to convert an image URL into an emoji and save it on your server

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can add an emoji using this command **+addemoji** and you will be able to add an emoji with its original name

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can add an emoji and change its name using this Slash Command **/addemoji**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

If you want to rename an emoji you can use this slash command **/rename_emoji** and the emoji name will be changed

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can convert an emoji to a sticker using this slash command **/emoji_to_sticker** and the emoji will be turned into a beautiful sticker!

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can convert an image to a sticker using this slash command **/image_to_sticker** and the image will be turned into a beautiful sticker!

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can delete a sticker using this slash command **/delete_sticker** and then reply with the sticker you want to delete!

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can convert a sticker to an emoji using this slash command **/sticker_to_emoji** and then reply with the sticker you want to convert!`
                    : `**أهلا بك هذا قائمة المساعدة الخاصة بي**
⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

بادئة البوت هي **[ + ]**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

إذا لم تكن لديك Nitro يمكنك كتابة هذا الأمر **+suggestemojis** حتى يقترح عليك البوت الإيموجيات من خوادم مختلفة

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك استخدام أمر الشرطة المائلة **/image_to_emoji** لتحويل رابط صورة إلى إيموجي وحفظه على خادمك

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك إضافة إيموجي باستخدام هذا الأمر **+addemoji** وستتمكن من إضافة إيموجي باسمه الأصلي

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك إضافة إيموجي وتغيير اسمه باستخدام أمر الشرطة المائلة **/addemoji**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

إذا كنت تريد إعادة تسمية إيموجي يمكنك استخدام أمر الشرطة المائلة **/rename_emoji** وسيتم تغيير اسم الإيموجي

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك تحويل إيموجي إلى ملصق باستخدام أمر الشرطة المائلة **/emoji_to_sticker** وسيتم تحويل الإيموجي إلى ملصق جميل!

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك تحويل صورة إلى ملصق باستخدام أمر الشرطة المائلة **/image_to_sticker** وسيتم تحويل الصورة إلى ملصق جميل!

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك حذف ملصق باستخدام أمر الشرطة المائلة **/delete_sticker** ثم رد برسالة تحتوي على الملصق الذي تريد حذفه!

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك تحويل ملصق إلى إيموجي باستخدام أمر الشرطة المائلة **/sticker_to_emoji** ثم رد برسالة تحتوي على الملصق الذي تريد تحويله!`
            )
            .setColor('#0099ff');

        await message.author.send({ embeds: [embed] }).catch(() => message.reply(language === 'english' ? '❌ Could not send DM!' : '❌ لم أستطع إرسال رسالة خاصة!'));
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
            message.channel.send(language === 'english' 
                ? '✅ The suggested emojis have been added successfully!' 
                : '✅ تمت إضافة الايموجيات المقترحة بنجاح!');
            suggestedEmojis = [];
        }
    } else if (message.content === 'لا' || message.content.toLowerCase() === 'no') {
        if (suggestedEmojis.length > 0) {
            message.channel.send(language === 'english' 
                ? '❌ The suggested emojis were not added.' 
                : '❌ لم يتم إضافة الايموجيات المقترحة.');
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
