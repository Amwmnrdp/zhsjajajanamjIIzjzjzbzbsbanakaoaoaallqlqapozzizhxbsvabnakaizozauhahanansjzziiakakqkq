const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');
const axios = require('axios');
const sharp = require('sharp');

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
        const response = await axios.get(finalUrl, { responseType: 'arraybuffer' });
        const inputBuffer = Buffer.from(response.data);

        // Process image to meet Discord sticker requirements:
        // 1. MUST be PNG
        // 2. MUST be exactly 512x512
        // 3. Size must be < 512KB (512,000 bytes)
        let processedBuffer = await sharp(inputBuffer)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({ quality: 80, compressionLevel: 9 }) // Start with some compression
            .toBuffer();

        // If still too large, aggressive compression
        if (processedBuffer.length > 512000) {
            processedBuffer = await sharp(inputBuffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png({ palette: true, colors: 128 }) // Use palette to significantly reduce size
                .toBuffer();
        }

        const sticker = await interaction.guild.stickers.create({
            file: processedBuffer,
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
        let errorMsg = error.message;
        if (error.code === 50045 || error.message.includes('maximum size')) {
            errorMsg = 'Asset exceeds maximum size: The sticker must be under 512KB. Try using a smaller or simpler image.';
        } else if (error.code === 50046) {
            errorMsg = 'Invalid Asset: The image format or dimensions are incorrect for a sticker.';
        }
        
        const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        console.error(`⚠️ Sticker Error [${error.code}]:`, error);
    }
}

module.exports = { execute };
