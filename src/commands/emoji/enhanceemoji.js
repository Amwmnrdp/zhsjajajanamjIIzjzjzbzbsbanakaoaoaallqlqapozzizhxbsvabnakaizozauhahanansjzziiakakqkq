const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const emojiInput = interaction.options.getString('emoji');
    let emojiUrl = '';
    let emojiName = '';

    const customEmojiMatch = emojiInput.match(/<a?:(.+):(\d+)>/);
    if (customEmojiMatch) {
        emojiName = customEmojiMatch[1] + '_enhanced';
        const emojiId = customEmojiMatch[2];
        const isAnimated = emojiInput.startsWith('<a:');
        emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=1024`;
    } else {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Only custom emojis can be enhanced.', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    try {
        await interaction.guild.emojis.create({ attachment: emojiUrl, name: emojiName });
        const embed = new EmbedBuilder()
            .setDescription('✨ ' + await t('Emoji enhanced and added successfully!', langCode) + `\n**Name:** ${emojiName}`)
            .setColor('#00FF00')
            .setImage(emojiUrl)
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Error:', langCode) + ' ' + error.message)
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = { execute };
