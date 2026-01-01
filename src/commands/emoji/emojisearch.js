const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode, client) {
    const hasManageEmoji = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) ||
                           interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);
    
    if (!hasManageEmoji) {
        const embed = new EmbedBuilder()
            .setTitle('🚫 ' + await t('Permission Denied', langCode))
            .setDescription(await t('You need the "Manage Emojis and Stickers" permission to use this command.', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const searchTerm = interaction.options.getString('search').toLowerCase();
    
    // Search for emojis with EXACT name match
    let foundEmojis = [];
    client.guilds.cache.forEach(guild => {
        const emoji = guild.emojis.cache.find(e => e.name.toLowerCase() === searchTerm);
        if (emoji) {
            // Check if already in current server
            const alreadyInServer = interaction.guild.emojis.cache.find(e => e.name === emoji.name);
            if (!alreadyInServer) {
                foundEmojis.push(emoji);
            }
        }
    });

    // Limit to 5 results
    foundEmojis = foundEmojis.slice(0, 5);

    if (foundEmojis.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('❌ ' + await t('No Results Found', langCode))
            .setDescription(await t('No emojis found with exact name:', langCode) + ` **${searchTerm}**`)
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🔍 ' + await t('Emoji Search Results', langCode))
        .setDescription(await t('Found these emojis. Would you like to add them?', langCode) + '\n\n' + foundEmojis.map((e, i) => `${i+1}. ${e} (${e.name})`).join('\n'))
        .setColor('#ADD8E6')
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_search_add')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('cancel_search_add')
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
        );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const filter = i => i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'confirm_search_add') {
            await i.deferUpdate();
            let added = 0;
            for (const emoji of foundEmojis) {
                try {
                    await interaction.guild.emojis.create({ attachment: emoji.url, name: emoji.name });
                    added++;
                } catch (err) {
                    console.error('Error adding emoji:', err);
                }
            }
            const successEmbed = new EmbedBuilder()
                .setDescription('✅ ' + (await t('Successfully added emojis!', langCode)).replace('{count}', added))
                .setColor('#ADD8E6');
            await i.editReply({ embeds: [successEmbed], components: [] });
        } else {
            await i.deferUpdate();
            const cancelEmbed = new EmbedBuilder()
                .setDescription('❌ ' + await t('Cancelled.', langCode))
                .setColor('#FF0000');
            await i.editReply({ embeds: [cancelEmbed], components: [] });
        }
        collector.stop();
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            interaction.editReply({ components: [] }).catch(() => {});
        }
    });
}

module.exports = { execute };
