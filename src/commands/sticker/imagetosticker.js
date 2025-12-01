const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const isImageUrl = require('is-image-url');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode, convertedImagesToStickers) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const imageUrl = interaction.options.getString('url');
    const stickerName = interaction.options.getString('name');

    if (!isImageUrl(imageUrl)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Invalid image URL!', langCode)).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    const imageTrackingKey = `${interaction.guild.id}:${imageUrl}`;
    if (convertedImagesToStickers.has(imageTrackingKey)) {
        const stickerInfo = convertedImagesToStickers.get(imageTrackingKey);
        const stickerUrl = `https://cdn.discordapp.com/stickers/${stickerInfo.stickerId}.png`;
        const embed = new EmbedBuilder()
            .setTitle('⚠️ ' + await t('Image Already Converted!', langCode))
            .setDescription(await t('This image has already been converted to a sticker!', langCode) + `\n\n**${await t('Existing Sticker Name:', langCode)}** ${stickerInfo.stickerName}\n**${await t('Sticker ID:', langCode)}** ${stickerInfo.stickerId}\n\n${await t('Delete the sticker to convert again.', langCode)}`)
            .setThumbnail(stickerUrl)
            .setColor('#FF9900')
            .setFooter({ text: await t('This conversion is already done.', langCode) + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
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
            .setFooter({ text: await t('Please choose a different name.', langCode) + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    try {
        const sticker = await interaction.guild.stickers.create({
            file: imageUrl,
            name: stickerName,
            description: await t('Converted from image', langCode),
            reason: `By ${interaction.user.tag}`
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ ' + await t('Sticker Created!', langCode))
            .setDescription(await t('Successfully converted image to sticker!', langCode) + `\n\n**${await t('Sticker Name:', langCode)}** ${stickerName}\n**${await t('Sticker ID:', langCode)}** ${sticker.id}`)
            .setImage(imageUrl)
            .setColor('#00FF00')
            .setFooter({ text: await t('You can now use this sticker in your server!', langCode) + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
        convertedImagesToStickers.set(imageTrackingKey, {
            stickerId: sticker.id,
            stickerName: stickerName,
            imageUrl: imageUrl
        });
    } catch (error) {
        const errorMsg = error.code === 50045 ?
            await t('Image URL is invalid or unavailable', langCode) :
            error.code === 50138 ?
            await t('File must be under 512KB', langCode) :
            error.code === 50035 ?
            await t('Invalid request format', langCode) :
            await t('Error:', langCode) + ' ' + error.message;
        const embed = new EmbedBuilder()
            .setDescription(`❌ ${errorMsg}`)
            .setColor('#FF0000')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        console.error(`⚠️ Discord Error in image_to_sticker:`, error.code, error.message);
    }
}

module.exports = { execute };
