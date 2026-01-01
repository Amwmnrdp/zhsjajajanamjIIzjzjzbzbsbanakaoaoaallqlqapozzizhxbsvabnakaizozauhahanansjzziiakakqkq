const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');
const sharp = require('sharp');
const axios = require('axios');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const messages = await interaction.channel.messages.fetch({ limit: 20 });
    const stickerMessage = messages.find(m => m.stickers.size > 0);

    if (!stickerMessage) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('No message with a sticker found nearby!', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    await interaction.deferReply();

    const sticker = stickerMessage.stickers.first();
    const stickerUrl = sticker.url;
    const stickerName = sticker.name.substring(0, 22) + '_enhanced';

    try {
        const response = await axios.get(stickerUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        // Maximum strength enhancement
        const enhancedBuffer = await sharp(buffer)
            .resize(512, 512, { 
                fit: 'contain', 
                background: { r: 0, g: 0, b: 0, alpha: 0 },
                kernel: sharp.kernel.lanczos3
            })
            .modulate({
                brightness: 1.05,
                saturation: 1.15
            })
            .sharpen({
                sigma: 1.2,
                m1: 0.3,
                m2: 8
            })
            .toBuffer();

        // Sticker limit 512KB
        let finalBuffer = enhancedBuffer;
        if (finalBuffer.length > 512000) {
            finalBuffer = await sharp(enhancedBuffer)
                .png({ palette: true, colors: 256 })
                .toBuffer();
        }

        await interaction.guild.stickers.create({
            file: finalBuffer,
            name: stickerName,
            description: 'Enhanced by ProEmoji',
            tags: 'enhanced',
            reason: `Enhanced by ${interaction.user.tag}`
        });

        const embed = new EmbedBuilder()
            .setDescription('✨ ' + await t('Sticker enhanced with maximum strength!', langCode) + `\n**Name:** ${stickerName}`)
            .setColor('#00FF00')
            .setImage(stickerUrl)
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Error:', langCode) + ' ' + error.message)
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = { execute };
