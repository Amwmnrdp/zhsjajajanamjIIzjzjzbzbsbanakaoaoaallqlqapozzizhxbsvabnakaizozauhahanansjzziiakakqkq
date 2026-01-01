const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const isImageUrl = require('is-image-url');
const { t } = require('../../utils/languages');
const axios = require('axios');

async function execute(interaction, langCode, convertedImagesToStickers) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const nameOption = interaction.options.getString('name');
    const urlOption = interaction.options.getString('url');
    const attachment = interaction.options.getAttachment('attachment');

    const cleanedName = nameOption.substring(0, 32);
    if (cleanedName.length < 2) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Sticker name must be between 2 and 32 characters.', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    if (urlOption && attachment) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('You cannot provide both a URL and an attachment!', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const finalUrl = attachment ? attachment.url : urlOption;
    if (!finalUrl) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('You must provide either a URL or an attachment!', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    await interaction.deferReply();

    const imageTrackingKey = `${interaction.guild.id}:${finalUrl}`;
    if (convertedImagesToStickers.has(imageTrackingKey)) {
        const stickerInfo = convertedImagesToStickers.get(imageTrackingKey);
        const embed = new EmbedBuilder()
            .setTitle('⚠️ ' + await t('Image Already Converted!', langCode))
            .setDescription(await t('This image has already been converted to a sticker!', langCode))
            .setColor('#FF9900');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    try {
        // Fetch the image as a buffer to ensure it's a valid asset for stickers
        const response = await axios.get(finalUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');

        const sticker = await interaction.guild.stickers.create({
            file: buffer,
            name: cleanedName,
            description: 'Converted by ProEmoji',
            tags: 'emoji',
            reason: `By ${interaction.user.tag}`
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ ' + await t('Sticker Created!', langCode))
            .setDescription(await t('Successfully converted image to sticker!', langCode) + `\n**Name:** ${cleanedName}`)
            .setImage(finalUrl)
            .setColor('#00FF00');

        await interaction.editReply({ embeds: [embed] });
        convertedImagesToStickers.set(imageTrackingKey, {
            stickerId: sticker.id,
            stickerName: cleanedName,
            imageUrl: finalUrl
        });
    } catch (error) {
        const errorMsg = error.code === 50035 ? 'Invalid Asset or Format' : error.message;
        const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        console.error(`⚠️ Sticker Error:`, error);
    }
}

module.exports = { execute };
