const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { parseEmoji } = require('../../utils/helpers');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const emoji = interaction.options.getString('emoji');
    const name = interaction.options.getString('name');
    let info = parseEmoji(emoji);

    if (!info.id) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Invalid emoji!', langCode)).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (interaction.guild.emojis.cache.find(e => e.name === info.name)) {
        const embed = new EmbedBuilder().setDescription('⚠️ ' + emoji + ' ' + await t('already exists!', langCode)).setColor('#FF9900').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    try {
        let type = info.animated ? '.gif' : '.png';
        let url = `https://cdn.discordapp.com/emojis/${info.id + type}`;
        const emj = await interaction.guild.emojis.create({ attachment: url, name: name || info.name, reason: `By ${interaction.user.tag}` });
        const embed = new EmbedBuilder().setDescription('✅ ' + await t('Added!', langCode) + ' ' + emj).setColor('#00FF00').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Error:', langCode) + ' ' + error.message).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = { execute };
