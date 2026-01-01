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

    await interaction.deferReply();

    try {
        const response = await axios.get(emojiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        
        // Maximum strength enhancement: Lanczos3 scaling + Sharpen + Modulate
        const enhancedBuffer = await sharp(buffer)
            .resize(1024, 1024, { 
                fit: 'contain', 
                background: { r: 0, g: 0, b: 0, alpha: 0 },
                kernel: sharp.kernel.lanczos3
            })
            .modulate({
                brightness: 1.1,
                saturation: 1.25
            })
            .sharpen({
                sigma: 1.8,
                m1: 0.6,
                m2: 12
            })
            .toBuffer();

        // Discord emojis have a 256KB limit
        let finalBuffer = enhancedBuffer;
        if (finalBuffer.length > 256000) {
            finalBuffer = await sharp(enhancedBuffer)
                .resize(512, 512)
                .png({ quality: 90 })
                .toBuffer();
        }

        await interaction.guild.emojis.create({ attachment: finalBuffer, name: emojiName });
        
        const embed = new EmbedBuilder()
            .setDescription('✨ ' + await t('Emoji enhanced with maximum strength!', langCode) + `\n**Name:** ${emojiName}`)
            .setColor('#ADD8E6')
            .setImage(emojiUrl)
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
