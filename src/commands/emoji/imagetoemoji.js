const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const isImageUrl = require('is-image-url');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode, usedUrls) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const nameOption = interaction.options.getString('name');
    const urlOption = interaction.options.getString('url');
    const attachment = interaction.options.getAttachment('attachment');

    // Clean name for Discord (2-32 chars, alphanumeric + underscores)
    const cleanedName = nameOption.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32);
    if (cleanedName.length < 2) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Emoji name must be between 2 and 32 characters.', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    if (urlOption && attachment) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('You cannot provide both a URL and an attachment!', langCode))
            .setColor('#FF0000')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const finalUrl = attachment ? attachment.url : urlOption;

    if (!finalUrl) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('You must provide either a URL or an attachment!', langCode))
            .setColor('#FF0000')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // Discord creation often fails with direct URLs if they aren't parsed correctly
    // or if the content type is weird. For stickers/emojis, we use the attachment URL.

    try {
        await interaction.guild.emojis.create({ attachment: finalUrl, name: cleanedName });
        usedUrls[finalUrl] = usedUrls[finalUrl] || [];
        usedUrls[finalUrl].push(interaction.guild.id);
        const embed = new EmbedBuilder().setDescription('✅ ' + await t('Image converted to emoji!', langCode)).setColor('#00FF00').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        const errorMsg = error.code === 50138 ? 
            await t('Image must be under 256KB', langCode) :
            error.code === 50035 ?
            await t('Invalid request:', langCode) + ' ' + (error.errors?.name?._errors?.[0] || error.message) :
            await t('Error:', langCode) + ' ' + error.message;
        const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        console.error(`⚠️ Discord Error in image_to_emoji:`, error.code, error.message);
    }
}

module.exports = { execute };
