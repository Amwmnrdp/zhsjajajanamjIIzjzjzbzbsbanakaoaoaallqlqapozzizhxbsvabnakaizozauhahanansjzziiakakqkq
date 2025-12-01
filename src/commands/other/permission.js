const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');
const { allowedServers } = require('../../utils/permissions');

async function execute(interaction, langCode) {
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

module.exports = { execute };
