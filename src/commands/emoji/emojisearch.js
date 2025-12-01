const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode, client) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need Manage Emojis permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const performSearch = async (searchTerm) => {
        let foundEmojis = [];
        client.guilds.cache.forEach(guild => {
            guild.emojis.cache.forEach(emoji => {
                if (emoji.name.toLowerCase().includes(searchTerm)) {
                    const isDuplicate = foundEmojis.find(e => e.id === emoji.id);
                    const alreadyInServer = interaction.guild.emojis.cache.find(e => e.name === emoji.name);
                    if (!isDuplicate && !alreadyInServer) {
                        foundEmojis.push(emoji);
                    }
                }
            });
        });
        console.log(`🔍 Search: "${searchTerm}" | Total found: ${foundEmojis.length}`);
        return foundEmojis;
    };

    const displayResults = async (emojis, searchTerm, isRetry = false) => {
        if (emojis.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ ' + await t('No Results Found', langCode))
                .setDescription(isRetry ? await t('Nothing available for this search.', langCode) : await t('No emojis found matching:', langCode) + ` **${searchTerm}**`)
                .setColor('#FF0000')
                .setFooter({ text: await t('Try a different search term or check if emojis are already in this server.', langCode) });
            
            if (isRetry) {
                await interaction.editReply({ embeds: [embed], components: [] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            return;
        }

        const groupedByName = {};
        emojis.forEach(emoji => {
            if (!groupedByName[emoji.name]) {
                groupedByName[emoji.name] = [];
            }
            groupedByName[emoji.name].push(emoji);
        });

        let description = '';
        const rows = [];
        let buttonIndex = 0;

        Object.keys(groupedByName).forEach(name => {
            const emojiList = groupedByName[name].slice(0, 10);
            description += `**${name}** (${emojiList.length} variant${emojiList.length > 1 ? 's' : ''}):\n`;

            emojiList.forEach((emoji, idx) => {
                description += `${idx + 1}️⃣ ${emoji} • ${emoji.guild.name}\n`;
            });
            description += '\n';

            let currentRow = null;
            emojiList.forEach((emoji, idx) => {
                if (buttonIndex % 5 === 0) {
                    currentRow = new ActionRowBuilder();
                    rows.push(currentRow);
                }

                const button = new ButtonBuilder()
                    .setCustomId(`emoji_btn_${buttonIndex}`)
                    .setLabel(`${idx + 1}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(emoji);

                currentRow.addComponents(button);
                buttonIndex++;
            });
        });

        const doneButton = new ButtonBuilder()
            .setCustomId('emoji_search_done')
            .setLabel(await t('Done', langCode))
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        const cancelButton = new ButtonBuilder()
            .setCustomId('emoji_search_cancel')
            .setLabel(await t('Cancel', langCode))
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

        const actionRow = new ActionRowBuilder().addComponents(doneButton, cancelButton);
        rows.push(actionRow);

        const embed = new EmbedBuilder()
            .setTitle('🔍 ' + await t('Emoji Search Results', langCode))
            .setDescription(description)
            .setColor('#00FFFF')
            .setFooter({ text: await t('Click a button to add an emoji. 2-minute timeout.', langCode) });

        const msg = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });
        return msg;
    };

    const searchTerm = interaction.options.getString('search').toLowerCase();
    const foundEmojis = await performSearch(searchTerm);
    const msg = await displayResults(foundEmojis, searchTerm);

    if (foundEmojis.length === 0) return;

    const emojiMap = new Map();
    let buttonIndex = 0;
    const groupedByName = {};
    foundEmojis.forEach(emoji => {
        if (!groupedByName[emoji.name]) {
            groupedByName[emoji.name] = [];
        }
        groupedByName[emoji.name].push(emoji);
    });

    Object.keys(groupedByName).forEach(name => {
        const emojiList = groupedByName[name].slice(0, 10);
        emojiList.forEach((emoji, idx) => {
            emojiMap.set(`emoji_btn_${buttonIndex}`, emoji);
            buttonIndex++;
        });
    });

    const filter = i => (i.customId.startsWith('emoji_btn_') || i.customId === 'emoji_search_done' || i.customId === 'emoji_search_cancel') && i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 120000 });
    const selectedEmojis = new Set();

    collector.on('collect', async i => {
        if (i.customId.startsWith('emoji_btn_')) {
            await i.deferUpdate();
            const emoji = emojiMap.get(i.customId);
            if (emoji) {
                selectedEmojis.add(emoji.id);
                const list = Array.from(selectedEmojis).map(id => {
                    const e = client.emojis.cache.get(id);
                    return e ? e.toString() : '❓';
                }).join(' ');
                
                const embed = new EmbedBuilder()
                    .setTitle('📝 ' + await t('Current Selection', langCode))
                    .setDescription(list)
                    .setColor('#FFA500')
                    .addFields({ name: await t('Selected', langCode), value: `${selectedEmojis.size}`, inline: true })
                    .setFooter({ text: await t('Click "Done" to add selected emojis.', langCode) });
                
                await i.editReply({ embeds: [embed] });
            }
        } else if (i.customId === 'emoji_search_done') {
            await i.deferUpdate();
            if (selectedEmojis.size === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ ' + await t('No Selection', langCode))
                    .setDescription(await t('Please select at least one emoji.', langCode))
                    .setColor('#FF0000');
                await i.editReply({ embeds: [embed] });
                return;
            }

            let addedCount = 0;
            for (const emojiId of selectedEmojis) {
                const emoji = client.emojis.cache.get(emojiId);
                if (emoji && !interaction.guild.emojis.cache.find(e => e.name === emoji.name)) {
                    try {
                        await interaction.guild.emojis.create({ attachment: emoji.url, name: emoji.name });
                        addedCount++;
                    } catch (error) {
                        console.error(`⚠️ Warning: Could not add emoji ${emoji.name}:`, error.message);
                    }
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ ' + await t('Complete', langCode))
                .setDescription(await t('Added', langCode) + ` **${addedCount}** ${await t('emojis', langCode)}!`)
                .setColor('#00FF00');
            
            await i.editReply({ embeds: [embed], components: [] });
            collector.stop();
        } else if (i.customId === 'emoji_search_cancel') {
            await i.deferUpdate();
            const embed = new EmbedBuilder()
                .setTitle('❌ ' + await t('Cancelled', langCode))
                .setColor('#FF0000');
            await i.editReply({ embeds: [embed], components: [] });
            collector.stop();
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const embed = new EmbedBuilder()
                .setTitle('⏳ ' + await t('Timeout', langCode))
                .setDescription(await t('Search session expired.', langCode))
                .setColor('#FF0000');
            try {
                await interaction.editReply({ embeds: [embed], components: [] });
            } catch (error) {
                console.error('⚠️ Warning: Could not edit reply:', error.message);
            }
        }
    });
}

module.exports = { execute };
