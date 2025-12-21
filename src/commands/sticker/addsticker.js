const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const stickerName = interaction.options.getString('name');
    const embed = new EmbedBuilder()
        .setTitle('🎨 ' + await t('Add Sticker', langCode))
        .setDescription(await t('Please reply with the sticker you want to add to the server.', langCode))
        .setColor('#667eea')
        .setFooter({ text: await t('Reply with a sticker in 60 seconds', langCode) });
    
    const msg = await interaction.reply({ embeds: [embed] });
    return msg;
}

module.exports = { execute };
