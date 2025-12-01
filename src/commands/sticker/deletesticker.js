const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
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
    
    return msg;
}

module.exports = { execute };
