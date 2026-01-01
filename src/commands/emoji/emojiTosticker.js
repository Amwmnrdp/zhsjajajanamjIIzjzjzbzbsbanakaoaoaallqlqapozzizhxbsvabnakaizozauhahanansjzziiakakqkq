const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');
const axios = require('axios');
const sharp = require('sharp');

async function execute(interaction, langCode, convertedEmojisToStickers) {
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

    const emojiInput = interaction.options.getString('emoji');
    const nameOption = interaction.options.getString('name');
    
    let emojiUrl = '';
    const customEmojiMatch = emojiInput.match(/<a?:.+:(\d+)>/);
    if (customEmojiMatch) {
        const emojiId = customEmojiMatch[1];
        const isAnimated = emojiInput.startsWith('<a:');
        emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=1024`;
    } else {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Only custom emojis are supported.', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const response = await axios.get(emojiUrl, { responseType: 'arraybuffer' });
        const inputBuffer = Buffer.from(response.data);

        // Standardized sticker processing: Force 512x512 PNG
        const processedBuffer = await sharp(inputBuffer)
            .resize(512, 512, { 
                fit: 'contain', 
                background: { r: 0, g: 0, b: 0, alpha: 0 } 
            })
            .png({ quality: 90, compressionLevel: 9 })
            .toBuffer();

        const sticker = await interaction.guild.stickers.create({
            file: processedBuffer,
            name: nameOption.substring(0, 32),
            description: 'Converted from emoji by ProEmoji',
            tags: 'emoji',
            reason: `By ${interaction.user.tag}`
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ ' + await t('Sticker Created!', langCode))
            .setDescription(await t('Emoji converted to sticker successfully!', langCode) + `\n**Name:** ${nameOption}`)
            .setImage(emojiUrl)
            .setColor('#ADD8E6');

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        let errorMsg = error.message;
        if (error.code === 50045) errorMsg = 'Asset exceeds maximum size (512KB).';
        const embed = new EmbedBuilder().setDescription('❌ ' + errorMsg).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = { execute };
