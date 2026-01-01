const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const stickerInput = interaction.options.getString('sticker');
    let sticker = null;

    // Try finding by ID first
    sticker = interaction.guild.stickers.cache.get(stickerInput);
    
    // Try finding by name
    if (!sticker) {
        sticker = interaction.guild.stickers.cache.find(s => s.name.toLowerCase() === stickerInput.toLowerCase());
    }

    if (!sticker) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Sticker not found in this server!', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const stickerUrl = sticker.url;

    const embed = new EmbedBuilder()
        .setTitle('🖼️ ' + await t('Sticker to Image', langCode))
        .setDescription(await t('Here is the image of the sticker:', langCode))
        .setImage(stickerUrl)
        .setColor('#00FF00')
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
}

module.exports = { execute };
