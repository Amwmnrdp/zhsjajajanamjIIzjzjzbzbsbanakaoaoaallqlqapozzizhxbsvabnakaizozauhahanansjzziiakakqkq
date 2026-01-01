const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');
const sharp = require('sharp');
const axios = require('axios');

async function execute(interaction, langCode) {
    const hasManageEmoji = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) ||
                           interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);
    
    if (!hasManageEmoji) {
        const embed = new EmbedBuilder()
            .setTitle('🚫 ' + await t('Permission Denied', langCode))
            .setDescription(await t('You need the "Manage Emojis and Stickers" permission to use this command.', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // Interaction handling for stickers via reply
    let sticker = null;
    let stickerUrl = '';
    let stickerName = '';

    // Check if the command was used as a reply to a message containing a sticker
    const message = await interaction.channel.messages.fetch(interaction.id).catch(() => null);
    const messages = await interaction.channel.messages.fetch({ limit: 20 });
    const stickerMessage = messages.find(m => m.stickers.size > 0);

    if (!stickerMessage) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('No message with a sticker found nearby! Please reply to a message with a sticker.', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    sticker = stickerMessage.stickers.first();
    stickerUrl = sticker.url;
    stickerName = sticker.name.substring(0, 22) + '_enhanced';

    try {
        const response = await axios.get(stickerUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        // Maximum strength enhancement: Lanczos3 scaling + Sharpen + Modulate
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
                sigma: 1.5,
                m1: 0.5,
                m2: 10
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
            .setColor('#ADD8E6')
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
