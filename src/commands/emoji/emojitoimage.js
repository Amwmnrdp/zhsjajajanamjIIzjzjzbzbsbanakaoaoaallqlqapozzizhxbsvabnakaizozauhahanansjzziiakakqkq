const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const emojiInput = interaction.options.getString('emoji');
    let emojiUrl = '';

    // Check if it's a custom emoji
    const customEmojiMatch = emojiInput.match(/<a?:.+:(\d+)>/);
    if (customEmojiMatch) {
        const emojiId = customEmojiMatch[1];
        const isAnimated = emojiInput.startsWith('<a:');
        emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=1024`;
    } else {
        // Handle standard unicode emoji (not ideal but we can try)
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Only custom emojis are supported for this command.', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🖼️ ' + await t('Emoji to Image', langCode))
        .setDescription(await t('Here is the image of the emoji:', langCode))
        .setImage(emojiUrl)
        .setColor('#00FF00')
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
}

module.exports = { execute };
