const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode, convertedEmojisToStickers) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const emojiInput = interaction.options.getString('emoji');
    const stickerName = interaction.options.getString('name');
    const match = emojiInput.match(/<(a)?:(\w+):(\d+)>/);

    if (!match) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Invalid emoji!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed] });
        return;
    }

    const emojiIdNum = match[3];
    const isAnimated = !!match[1];
    const fileExtension = isAnimated ? '.gif' : '.png';
    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiIdNum + fileExtension}`;

    const trackingKey = `${interaction.guild.id}:${emojiIdNum}`;
    if (convertedEmojisToStickers.has(trackingKey)) {
        const stickerInfo = convertedEmojisToStickers.get(trackingKey);
        const stickerUrl = `https://cdn.discordapp.com/stickers/${stickerInfo.stickerId}.png`;
        const embed = new EmbedBuilder()
            .setTitle('⚠️ ' + await t('Emoji Already Converted!', langCode))
            .setDescription(await t('This emoji has already been converted to a sticker!', langCode) + `\n\n**${await t('Existing Sticker Name:', langCode)}** ${stickerInfo.stickerName}\n**${await t('Sticker ID:', langCode)}** ${stickerInfo.stickerId}\n\n${await t('Delete the sticker to convert again.', langCode)}`)
            .setThumbnail(stickerUrl)
            .setColor('#FF9900')
            .setFooter({ text: await t('This conversion is already done.', langCode) });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    const existingStickers = interaction.guild.stickers.cache;
    const duplicateByName = existingStickers.find(s => s.name.toLowerCase() === stickerName.toLowerCase());

    if (duplicateByName) {
        const stickerUrl = `https://cdn.discordapp.com/stickers/${duplicateByName.id}.png`;
        const embed = new EmbedBuilder()
            .setTitle('⚠️ ' + await t('Sticker Name Already Exists!', langCode))
            .setDescription(await t('A sticker with this name already exists!', langCode) + `\n\n**${await t('Existing Sticker Name:', langCode)}** ${duplicateByName.name}\n**${await t('Sticker ID:', langCode)}** ${duplicateByName.id}`)
            .setThumbnail(stickerUrl)
            .setColor('#FF9900')
            .setFooter({ text: await t('Please choose a different name.', langCode) });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    try {
        const sticker = await interaction.guild.stickers.create({
            file: emojiUrl,
            name: stickerName,
            description: await t('Converted from emoji', langCode),
            reason: `By ${interaction.user.tag}`
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ ' + await t('Sticker Created!', langCode))
            .setDescription(await t('Successfully converted emoji to sticker!', langCode) + `\n\n**${await t('Sticker Name:', langCode)}** ${stickerName}\n**${await t('Sticker ID:', langCode)}** ${sticker.id}`)
            .setImage(emojiUrl)
            .setColor('#00FF00')
            .setFooter({ text: await t('You can now use this sticker in your server!', langCode) });

        await interaction.reply({ embeds: [embed] });
        convertedEmojisToStickers.set(trackingKey, {
            stickerId: sticker.id,
            stickerName: stickerName,
            emojiId: emojiIdNum
        });
    } catch (error) {
        const errorMsg = error.code === 50045 ?
            await t('Emoji URL is invalid or unavailable', langCode) :
            error.code === 50138 ?
            await t('File must be under 512KB', langCode) :
            await t('Error:', langCode) + ' ' + error.message;
        const embed = new EmbedBuilder()
            .setDescription(`❌ ${errorMsg}`)
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed] });
        console.error(`⚠️ Discord Error in emoji_to_sticker:`, error.code, error.message);
    }
}

module.exports = { execute };
