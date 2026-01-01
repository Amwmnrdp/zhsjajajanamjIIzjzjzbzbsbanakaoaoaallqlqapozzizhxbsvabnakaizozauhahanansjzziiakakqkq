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
    const integrationOption = interaction.options.getString('integration') === 'true';

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

        let sharpInstance = sharp(inputBuffer);

        if (integrationOption) {
            // Integration mode: Force square 512x512 with FILL to cover the entire canvas
            sharpInstance = sharpInstance.resize(512, 512, {
                fit: 'cover',
                position: 'center'
            });
        } else {
            // Original form mode: Preserve aspect ratio within 512x512
            const metadata = await sharpInstance.metadata();
            const ratio = metadata.width / metadata.height;
            
            if (ratio > 1) {
                sharpInstance = sharpInstance.resize(512, Math.round(512 / ratio));
            } else {
                sharpInstance = sharpInstance.resize(Math.round(512 * ratio), 512);
            }
        }

        let processedBuffer = await sharpInstance
            .png({ quality: 80, compressionLevel: 9 })
            .toBuffer();

        // Safety check for size
        if (processedBuffer.length > 512000) {
            processedBuffer = await sharp(processedBuffer)
                .png({ palette: true, colors: 128 })
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
            .setDescription(await t('Successfully converted image to sticker!', langCode) + `\n**Name:** ${cleanedName}\n**Mode:** ${integrationOption ? 'Integration (Full 512x512)' : 'Original Form'}`)
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
        if (error.code === 50045) errorMsg = 'Asset exceeds maximum size (512KB).';
        const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = { execute };
