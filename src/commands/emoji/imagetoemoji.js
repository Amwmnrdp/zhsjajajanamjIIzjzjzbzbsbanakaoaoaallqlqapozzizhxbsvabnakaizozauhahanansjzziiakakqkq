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

    if (!isImageUrl(urlOption)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Invalid image URL!', langCode)).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (usedUrls[urlOption] && usedUrls[urlOption].includes(interaction.guild.id)) {
        const embed = new EmbedBuilder().setDescription('⚠️ ' + await t('Image already used!', langCode)).setColor('#FF9900').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    try {
        await interaction.guild.emojis.create({ attachment: urlOption, name: nameOption });
        usedUrls[urlOption] = usedUrls[urlOption] || [];
        usedUrls[urlOption].push(interaction.guild.id);
        const embed = new EmbedBuilder().setDescription('✅ ' + await t('Image converted to emoji!', langCode)).setColor('#00FF00').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        const errorMsg = error.code === 50138 ? 
            await t('Image must be under 256KB', langCode) :
            error.code === 50035 ?
            await t('Invalid request:', langCode) + ' ' + error.message :
            await t('Error:', langCode) + ' ' + error.message;
        const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        console.error(`⚠️ Discord Error in image_to_emoji:`, error.code, error.message);
    }
}

module.exports = { execute };
