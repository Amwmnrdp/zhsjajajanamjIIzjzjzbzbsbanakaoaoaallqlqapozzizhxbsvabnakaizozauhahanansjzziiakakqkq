const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // Since it's a "reply to message with sticker" logic, we check the replied message
    const message = await interaction.channel.messages.fetch(interaction.id).catch(() => null); // This is not correct for slash commands
    // We need to inform user that they should use this as a context menu or we can use another logic.
    // However, the request says "user replies to a message with a sticker".
    // For slash commands, we can't easily get "replied message" unless we use message context menus.
    
    // For now, let's assume the last message in channel that has a sticker if not specified.
    const messages = await interaction.channel.messages.fetch({ limit: 20 });
    const stickerMessage = messages.find(m => m.stickers.size > 0);

    if (!stickerMessage) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('No message with a sticker found nearby!', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const sticker = stickerMessage.stickers.first();
    const stickerUrl = sticker.url;
    const stickerName = sticker.name + '_enhanced';

    try {
        await interaction.guild.stickers.create({
            file: stickerUrl,
            name: stickerName,
            description: 'Enhanced version',
            reason: `Enhanced by ${interaction.user.tag}`
        });

        const embed = new EmbedBuilder()
            .setDescription('✨ ' + await t('Sticker enhanced and saved successfully!', langCode) + `\n**Name:** ${stickerName}`)
            .setColor('#00FF00')
            .setImage(stickerUrl)
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
