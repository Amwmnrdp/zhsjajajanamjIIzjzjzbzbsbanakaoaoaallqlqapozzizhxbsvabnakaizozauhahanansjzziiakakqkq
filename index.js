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
    if (!fs.existsSync(SERVERS_FILE)) {
        fs.writeFileSync(SERVERS_FILE, '[]');
        return [];
    }
    const data = fs.readFileSync(SERVERS_FILE, 'utf8');
    return JSON.parse(data);
}

function writeServersFile(servers) {
    fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2));
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
            await msg.react('✅');
            await msg.react('❌');

            const filter = (reaction, user) => ['✅', '❌'].includes(reaction.emoji.name) && user.id === interaction.user.id;
            msg.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                .then(async collected => {
                    const reaction = collected.first();
                    if (reaction.emoji.name === '✅') {
                        for (const emoji of emojis) {
                            if (!interaction.guild.emojis.cache.find(e => e.name === emoji.name)) {
                                await interaction.guild.emojis.create({ attachment: emoji.url, name: emoji.name });
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
                await interaction.reply(language === 'english' ? '❌ Invalid image URL!' : '❌ رابط صورة غير صالح!');
                return;
            }

            if (usedUrls[urlOption] && usedUrls[urlOption].includes(interaction.guild.id)) {
                await interaction.reply(language === 'english' ? '⚠️ Image already used!' : '⚠️ الصورة مستخدمة بالفعل!');
                return;
            }

            try {
                await interaction.guild.emojis.create({ attachment: urlOption, name: nameOption });
                usedUrls[urlOption] = usedUrls[urlOption] || [];
                usedUrls[urlOption].push(interaction.guild.id);
                await interaction.reply(language === 'english' ? '✅ Image converted!' : '✅ تم التحويل!');
            } catch (error) {
                await interaction.reply(`❌ Error: ${error.message}`);
            }
        }

        if (interaction.commandName === 'list_emojis') {
            const emojis = Array.from(interaction.guild.emojis.cache.values());
            if (emojis.length === 0) {
                await interaction.reply({ content: language === 'english' ? '❌ No emojis.' : '❌ لا توجد ايموجيات.', ephemeral: true });
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

    await msg.react('🇺🇸');
    await msg.react('<:Syria:1443915175379079208>');

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
       }client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const language = serverLanguages.get(message.guild.id) || 'english';

    if (message.content.startsWith(prefix + 'help')) {
        message.channel.send(language === 'english' ? '**Check your DM**' : '**شوف خاصك**').then(m => setTimeout(() => m.delete(), 5000));

        const embed = new EmbedBuilder()
            .setTitle(language === 'english' ? '📖 ProEmoji Help' : '📖 مساعدة ProEmoji')
                
                

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
                const embed = new EmbedBuilder().setDescription(language === 'english' ? `✅ Emoji deleted!` : `✅ تم حذف الايموجي!`).setColor('#00FF00');
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                const embed = new EmbedBuilder().setDescription(`❌ Error: ${error.message}`).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
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
                const embed = new EmbedBuilder().setDescription(`❌ Error: ${error.message}`).setColor('#FF0000');
                await interaction.reply({ embeds: [embed] });
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
});


client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const language = serverLanguages.get(message.guild.id) || 'english';

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

You can delete an emoji using this slash command **/delete_emoji** to remove it from the server

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can view all server emojis using this slash command **/list_emojis** with page navigation

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

You can change the bot's language using this Slash Command **/language** (English/Arabic)

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

Admins can use **/permission** to allow or deny the bot from suggesting your server emojis to others

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

**I hope you like the bot and enjoy using it 😉**
`
            : `**مرحباً، هذه هي قائمة المساعدة الخاصة بي**
⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

بادئة البوت هي **[ + ]**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

اذا كنت لا تملك نيترو تستطيع كتابة هذا الامر **+suggestemojis** حتى يقترح لك البوت ايموجيات من سيرفرات مختلفة

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك استخدام امر سلاش كوماند **/image_to_emoji** حتى يتم تحويل رابط الصورة الى ايموجي و يحفظها في سيرفرك

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك اضافة ايموجي باستخدام هذا الامر **+addemoji** و سوف تستطيع اضافة ايموجي مع اسم الايموجي الاصلي

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك اضافة ايموجي مع تغيير الاسم باستخدام سلاش كوماند **/addemoji**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

اذا كنت تريد تغيير اسم الايموجي يمكنك استخدام امر السلاش كوماند **/rename_emoji** و سوف يتم تغيير اسم الايموجي

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك حذف ايموجي باستخدام سلاش كوماند **/delete_emoji** لإزالته من السيرفر

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

يمكنك عرض جميع ايموجيات السيرفر باستخدام سلاش كوماند **/list_emojis** مع صفحات للتنقل

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

تستطيع تغيير لغة البوت باستخدام هذا السلاش كوماند **/language** (انجليزي/عربي)

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

المسؤولون يمكنهم استخدام **/permission** للسماح أو رفض اقتراح ايموجيات سيرفرك للآخرين

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

**اتمنى ان يعجبك البوت و تستمتع باستخدامه😉**
`
        )
        .setFooter({ text: `ProEmoji` })
        .setColor(`#00FFFF`)
        .setTimestamp();

      message.author.send({ embeds: [embed] }).catch(error => message.reply(language === 'english' ? '**Please open your DM**' : '**رجاء فتح خاصك**'));
};

    if (message.content.startsWith(prefix + 'addemoji')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
            const embed = new EmbedBuilder().setDescription(language === 'english' ? '❌ Need permission!' : '❌ تحتاج صلاحية!').setColor('#FF0000');
            message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete(), 5000));
            return;
        }

        let args = message.content.split(' ').slice(1);
        if (!args.length) {
            const embed = new EmbedBuilder().setDescription(language === 'english' ? '**Provide an emoji!**' : '**أدخل ايموجي!**').setColor('#00FFFF');
            message.channel.send({ embeds: [embed] });
            return;
        }

        let names = [];
        for (let emoji of args) {
            let info = parseEmoji(emoji);
            if (!info.id) continue;
            if (message.guild.emojis.cache.find(e => e.name === info.name && e.id === info.id)) continue;

            let type = info.animated ? '.gif' : '.png';
            let url = `https://cdn.discordapp.com/emojis/${info.id + type}`;
            const emj = await message.guild.emojis.create({ attachment: url, name: info.name, reason: `By ${client.user.tag}` });
            names.push(emj);
        }

        if (names.length) {
            const embed = new EmbedBuilder().setDescription(language === 'english' ? `✅ Added: ${names.join(' ')}` : `✅ تمت الإضافة: ${names.join(' ')}`).setColor('#00FFFF');
            message.channel.send({ embeds: [embed] });
        }
    }

    if (message.content === prefix + 'suggestemojis') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
            const embed = new EmbedBuilder().setDescription(language === 'english' ?'❌ Need permission!' : '❌ تحتاج صلاحية!').setColor('#FF0000');
            message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete(), 5000));
            return;
        }

        let emojis = [];
        client.guilds.cache.forEach(guild => {
            if (allowedServers.get(guild.id) === true) {
                guild.emojis.cache.forEach(emoji => {
                    if (!emojis.includes(emoji) && !message.guild.emojis.cache.find(e => e.name === emoji.name)) {
                        emojis.push(emoji);
                    }
                });
            }
        });

        if (emojis.length === 0) {
            const embed = new EmbedBuilder()
                .setDescription(language === 'english' ? '❌ No emojis available!' : '❌ لا توجد ايموجيات متاحة!')
                .setColor('#FF0000');
            message.channel.send({ embeds: [embed] });
            return;
        }

        emojis = emojis.sort(() => Math.random() - 0.5).slice(0, 5);
        suggestedEmojis = emojis;

        let reply = language === 'english' 
            ? 'Here are 5 suggested emojis: ' 
            : 'هذه 5 اقتراحات ايموجيات: ';
        
        emojis.forEach(emoji => {
            reply += `${emoji} `;
        });
        
        reply += language === 'english' 
            ? '\nDo you want to add these emojis? (Reply with `yes` or `no`)' 
            : '\nهل تريد إضافة هذه الايموجيات؟ (رد بـ `نعم` أو `لا`)';
        
        message.channel.send(reply);
    }

    if (message.content === 'نعم' || message.content.toLowerCase() === 'yes') {
        if (suggestedEmojis.length > 0) {
            for (const emoji of suggestedEmojis) {
                if (!message.guild.emojis.cache.find(e => e.name === emoji.name)) {
                    await message.guild.emojis.create({ attachment: emoji.url, name: emoji.name });
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
});// Express server - هذا فقط لإبقاء Replit شغال ولا يوقف البوت
app.get('/', (req, res) => {
    res.send('✅ ProEmoji Bot is Running!');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

// Login - استخدام process.env مباشرة من Replit Secrets
client.login(process.env.token).catch(err => {
    console.error('❌ Failed to login:', err);
    console.error('تأكد من إضافة token في Replit Secrets!');
});